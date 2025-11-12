-- Create submissions table for task submissions
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  recording_date DATE NOT NULL,
  task_name TEXT NOT NULL,
  extra_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
  teacher_comments TEXT,
  grade INTEGER CHECK (grade >= 0 AND grade <= 100),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table for persistent notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('profile_incomplete', 'new_submission', 'submission_reviewed')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  message TEXT NOT NULL,
  action TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on submissions
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for submissions
CREATE POLICY "Students can view their own submissions"
ON public.submissions
FOR SELECT
USING (auth.uid() = student_id OR has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can create submissions"
ON public.submissions
FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can update submissions"
ON public.submissions
FOR UPDATE
USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at on submissions
CREATE TRIGGER update_submissions_updated_at
BEFORE UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to create notifications for teachers when submission is created
CREATE OR REPLACE FUNCTION public.notify_teachers_new_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      student_name || ' enviou a tarefa "' || NEW.task_name || '"',
      '📝 Nova tarefa: ' || NEW.task_name || ' - ' || student_name,
      '/communities/' || NEW.community_id,
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to notify student when submission is reviewed
CREATE OR REPLACE FUNCTION public.notify_student_submission_reviewed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  teacher_name TEXT;
BEGIN
  -- Only trigger if status changed to reviewed
  IF NEW.status = 'reviewed' AND OLD.status = 'pending' THEN
    -- Get teacher name
    SELECT name INTO teacher_name FROM profiles WHERE id = NEW.reviewed_by;
    
    -- Insert notification for student
    INSERT INTO notifications (user_id, type, title, description, message, action, related_id)
    VALUES (
      NEW.student_id,
      'submission_reviewed',
      'Tarefa corrigida',
      'Sua tarefa "' || NEW.task_name || '" foi corrigida por ' || COALESCE(teacher_name, 'um professor') || '. Nota: ' || NEW.grade || '/100',
      '✅ Tarefa corrigida: ' || NEW.task_name || ' - Nota: ' || NEW.grade || '/100',
      '/communities/' || NEW.community_id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_submission_created
AFTER INSERT ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_teachers_new_submission();

CREATE TRIGGER on_submission_reviewed
AFTER UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_submission_reviewed();

-- Add indexes for performance
CREATE INDEX idx_submissions_community_id ON public.submissions(community_id);
CREATE INDEX idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX idx_submissions_status ON public.submissions(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);