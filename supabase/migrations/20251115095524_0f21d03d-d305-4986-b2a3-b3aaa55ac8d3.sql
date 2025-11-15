-- Add task_code column to submissions table
ALTER TABLE public.submissions 
ADD COLUMN task_code text;

-- Update notification function to include task code
CREATE OR REPLACE FUNCTION public.notify_group_new_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      student_name || ' enviou a tarefa "' || NEW.task_name || '" (' || COALESCE(NEW.task_code, 'sem código') || ') para correção',
      'system',
      jsonb_build_object(
        'submission_id', NEW.id,
        'video_url', NEW.video_url,
        'task_name', NEW.task_name,
        'task_code', NEW.task_code
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update teachers notification function
CREATE OR REPLACE FUNCTION public.notify_teachers_new_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  teacher_record RECORD;
  student_name TEXT;
BEGIN
  -- Get student name
  SELECT name INTO student_name FROM profiles WHERE id = NEW.student_id;
  
  -- Insert notifications for all teachers in the community
  FOR teacher_record IN 
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    WHERE ur.role IN ('teacher', 'admin')
  LOOP
    INSERT INTO notifications (user_id, type, title, description, message, action, related_id)
    VALUES (
      teacher_record.user_id,
      'new_submission',
      'Nova tarefa para correção',
      student_name || ' enviou a tarefa "' || NEW.task_name || '" (' || COALESCE(NEW.task_code, 'sem código') || ')',
      '📝 Nova tarefa: ' || NEW.task_name || ' (' || COALESCE(NEW.task_code, 'sem código') || ') - ' || student_name,
      '/communities/' || NEW.community_id || '/tasks',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;