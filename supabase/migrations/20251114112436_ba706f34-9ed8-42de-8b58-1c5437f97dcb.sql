-- Add individual_study to event_type enum
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'individual_study';

-- Add fields for individual study tracking
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS study_topic text,
ADD COLUMN IF NOT EXISTS actual_start_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS actual_end_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS actual_study_notes text,
ADD COLUMN IF NOT EXISTS study_status text DEFAULT 'pending' CHECK (study_status IN ('pending', 'completed', 'rescheduled', 'cancelled'));

-- Function to notify group when study is completed
CREATE OR REPLACE FUNCTION notify_group_study_completed()
RETURNS TRIGGER AS $$
DECLARE
  student_name TEXT;
  duvidas_group_id UUID;
  study_count INTEGER;
  duration_minutes INTEGER;
  community_id_var UUID;
BEGIN
  -- Only trigger when study is marked as completed
  IF NEW.study_status = 'completed' AND OLD.study_status = 'pending' THEN
    -- Get student name
    SELECT name INTO student_name FROM profiles WHERE id = NEW.created_by;
    
    -- Get community_id from event
    community_id_var := NEW.community_id;
    
    -- Count studies completed this month by this user
    SELECT COUNT(*) INTO study_count
    FROM events
    WHERE created_by = NEW.created_by
      AND event_type = 'individual_study'
      AND study_status = 'completed'
      AND EXTRACT(MONTH FROM actual_end_time) = EXTRACT(MONTH FROM NEW.actual_end_time)
      AND EXTRACT(YEAR FROM actual_end_time) = EXTRACT(YEAR FROM NEW.actual_end_time);
    
    -- Calculate duration in minutes
    duration_minutes := EXTRACT(EPOCH FROM (NEW.actual_end_time - NEW.actual_start_time)) / 60;
    
    -- Find the "Dúvidas e Tarefas" group for this community
    SELECT id INTO duvidas_group_id
    FROM conversation_groups
    WHERE community_id = community_id_var
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
        NEW.created_by,
        duvidas_group_id,
        community_id_var,
        student_name || ' acabou de realizar seu ' || study_count || 'º estudo deste mês, num estudo de ' || duration_minutes || ' minutos',
        'system',
        jsonb_build_object(
          'event_id', NEW.id,
          'study_count', study_count,
          'duration_minutes', duration_minutes
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for study completion notifications
DROP TRIGGER IF EXISTS trigger_notify_group_study_completed ON events;
CREATE TRIGGER trigger_notify_group_study_completed
  AFTER UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_study_completed();