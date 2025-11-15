-- Create assigned_tasks table for teacher-created tasks
CREATE TABLE public.assigned_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  youtube_url TEXT,
  pdf_url TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create junction table for assigned tasks and students
CREATE TABLE public.assigned_task_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_task_id UUID NOT NULL REFERENCES assigned_tasks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(assigned_task_id, student_id)
);

-- Enable RLS
ALTER TABLE public.assigned_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assigned_task_students ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assigned_tasks
CREATE POLICY "Teachers can create assigned tasks"
  ON public.assigned_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND 
    (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Teachers can view assigned tasks"
  ON public.assigned_tasks
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'teacher'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM assigned_task_students 
      WHERE assigned_task_id = assigned_tasks.id 
      AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update their assigned tasks"
  ON public.assigned_tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Teachers can delete their assigned tasks"
  ON public.assigned_tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for assigned_task_students
CREATE POLICY "Teachers can assign tasks to students"
  ON public.assigned_task_students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'teacher'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "View assigned task students"
  ON public.assigned_task_students
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    has_role(auth.uid(), 'teacher'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Students can update their task status"
  ON public.assigned_task_students
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_assigned_tasks_updated_at
  BEFORE UPDATE ON public.assigned_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for performance
CREATE INDEX idx_assigned_task_students_student_id ON assigned_task_students(student_id);
CREATE INDEX idx_assigned_task_students_status ON assigned_task_students(status);