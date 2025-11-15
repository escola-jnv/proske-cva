-- Atualizar função de nova submissão para enviar como mensagem normal
CREATE OR REPLACE FUNCTION public.notify_group_new_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  duvidas_group_id UUID;
BEGIN
  -- Find the "Dúvidas e Tarefas" group for this community
  SELECT id INTO duvidas_group_id
  FROM conversation_groups
  WHERE community_id = NEW.community_id
    AND LOWER(name) LIKE '%dúvidas%tarefas%'
  LIMIT 1;
  
  -- If group exists, send as normal message from student
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
      'Acabei de enviar a tarefa ' || COALESCE(NEW.task_code, NEW.id),
      'normal',
      jsonb_build_object(
        'type', 'task_submission',
        'submission_id', NEW.id,
        'video_url', NEW.video_url,
        'task_name', NEW.task_name,
        'task_code', NEW.task_code
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Atualizar função de correção para enviar como mensagem normal do professor
CREATE OR REPLACE FUNCTION public.notify_group_submission_reviewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  student_name TEXT;
  duvidas_group_id UUID;
BEGIN
  -- Only trigger if status changed to reviewed
  IF NEW.status = 'reviewed' AND OLD.status = 'pending' THEN
    -- Get student name
    SELECT name INTO student_name FROM profiles WHERE id = NEW.student_id;
    
    -- Find the "Dúvidas e Tarefas" group for this community
    SELECT id INTO duvidas_group_id
    FROM conversation_groups
    WHERE community_id = NEW.community_id
      AND LOWER(name) LIKE '%dúvidas%tarefas%'
    LIMIT 1;
    
    -- If group exists, send as normal message from teacher
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
        'Acabei de corrigir a tarefa ' || COALESCE(NEW.task_code, NEW.id) || ' do aluno ' || student_name,
        'normal',
        jsonb_build_object(
          'type', 'task_reviewed',
          'submission_id', NEW.id,
          'grade', NEW.grade,
          'task_name', NEW.task_name,
          'task_code', NEW.task_code,
          'student_name', student_name
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar função para notificar criação de tarefas atribuídas
CREATE OR REPLACE FUNCTION public.notify_group_assigned_task_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  duvidas_group_id UUID;
  task_data RECORD;
  student_ids TEXT[];
  student_data JSONB[];
  student_record RECORD;
BEGIN
  -- Get task data
  SELECT * INTO task_data
  FROM assigned_tasks
  WHERE id = NEW.assigned_task_id;
  
  -- Find the "Dúvidas e Tarefas" group for this community
  SELECT id INTO duvidas_group_id
  FROM conversation_groups
  WHERE community_id = task_data.community_id
    AND LOWER(name) LIKE '%dúvidas%tarefas%'
  LIMIT 1;
  
  -- Only send message on first student assignment (check if this is first insert for this task)
  IF duvidas_group_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM messages 
    WHERE metadata->>'assigned_task_id' = NEW.assigned_task_id::text
  ) THEN
    -- Collect all students assigned to this task
    SELECT array_agg(DISTINCT ats.student_id)
    INTO student_ids
    FROM assigned_task_students ats
    WHERE ats.assigned_task_id = NEW.assigned_task_id;
    
    -- Build student data array with names and avatars
    student_data := ARRAY[]::JSONB[];
    FOR student_record IN 
      SELECT id, name, avatar_url 
      FROM profiles 
      WHERE id = ANY(student_ids)
    LOOP
      student_data := student_data || jsonb_build_object(
        'id', student_record.id,
        'name', student_record.name,
        'avatar_url', student_record.avatar_url
      );
    END LOOP;
    
    -- Send as normal message from teacher
    INSERT INTO messages (
      user_id, 
      group_id, 
      community_id, 
      content, 
      message_type,
      metadata
    )
    VALUES (
      task_data.created_by,
      duvidas_group_id,
      task_data.community_id,
      'Acabei de criar tarefas para os alunos',
      'normal',
      jsonb_build_object(
        'type', 'task_assigned',
        'assigned_task_id', NEW.assigned_task_id,
        'task_title', task_data.title,
        'students', student_data
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para tarefas atribuídas
DROP TRIGGER IF EXISTS on_assigned_task_created_notify_group ON assigned_task_students;
CREATE TRIGGER on_assigned_task_created_notify_group
  AFTER INSERT ON assigned_task_students
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_assigned_task_created();