-- Adicionar campo para tipo de mensagem (normal ou system)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'normal' CHECK (message_type IN ('normal', 'system'));

-- Adicionar campo para armazenar dados relacionados (link, etc)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Função para enviar mensagem de nova tarefa no grupo
CREATE OR REPLACE FUNCTION notify_group_new_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  student_name TEXT;
  duvidas_group_id UUID;
BEGIN
  -- Get student name
  SELECT name INTO student_name FROM profiles WHERE id = NEW.student_id;
  
  -- Find the "Dúvidas e Tarefas" group for this community
  SELECT id INTO duvidas_group_id
  FROM conversation_groups
  WHERE community_id = NEW.community_id
    AND LOWER(name) LIKE '%dúvidas%tarefas%'
  LIMIT 1;
  
  -- If group exists, send system message
  IF duvidas_group_id IS NOT NULL THEN
    INSERT INTO messages (
      user_id, 
      group_id, 
      community_id, 
      content, 
      message_type,
      metadata
    )
    VALUES (
      NEW.student_id,
      duvidas_group_id,
      NEW.community_id,
      student_name || ' enviou a tarefa "' || NEW.task_name || '" para correção',
      'system',
      jsonb_build_object(
        'submission_id', NEW.id,
        'video_url', NEW.video_url,
        'task_name', NEW.task_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Função para enviar mensagem de tarefa corrigida no grupo
CREATE OR REPLACE FUNCTION notify_group_submission_reviewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  teacher_name TEXT;
  student_name TEXT;
  duvidas_group_id UUID;
  full_message TEXT;
BEGIN
  -- Only trigger if status changed to reviewed
  IF NEW.status = 'reviewed' AND OLD.status = 'pending' THEN
    -- Get teacher and student names
    SELECT name INTO teacher_name FROM profiles WHERE id = NEW.reviewed_by;
    SELECT name INTO student_name FROM profiles WHERE id = NEW.student_id;
    
    -- Find the "Dúvidas e Tarefas" group for this community
    SELECT id INTO duvidas_group_id
    FROM conversation_groups
    WHERE community_id = NEW.community_id
      AND LOWER(name) LIKE '%dúvidas%tarefas%'
    LIMIT 1;
    
    -- Build message with teacher comments
    full_message := COALESCE(teacher_name, 'Um professor') || ' corrigiu a tarefa "' || 
                    NEW.task_name || '" de ' || student_name;
    
    IF NEW.teacher_comments IS NOT NULL AND NEW.teacher_comments != '' THEN
      full_message := full_message || E'\n\nObservações:\n' || NEW.teacher_comments;
    END IF;
    
    -- If group exists, send system message
    IF duvidas_group_id IS NOT NULL THEN
      INSERT INTO messages (
        user_id, 
        group_id, 
        community_id, 
        content, 
        message_type,
        metadata
      )
      VALUES (
        NEW.reviewed_by,
        duvidas_group_id,
        NEW.community_id,
        full_message,
        'system',
        jsonb_build_object(
          'submission_id', NEW.id,
          'grade', NEW.grade,
          'task_name', NEW.task_name
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for the new functions
DROP TRIGGER IF EXISTS on_submission_created_notify_group ON submissions;
CREATE TRIGGER on_submission_created_notify_group
  AFTER INSERT ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_new_submission();

DROP TRIGGER IF EXISTS on_submission_reviewed_notify_group ON submissions;
CREATE TRIGGER on_submission_reviewed_notify_group
  AFTER UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_submission_reviewed();