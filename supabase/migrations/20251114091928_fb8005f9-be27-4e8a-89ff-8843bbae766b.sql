-- Create interview_schedules table
CREATE TABLE public.interview_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  confirmed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.interview_schedules ENABLE ROW LEVEL SECURITY;

-- Policies for visitors to manage their own schedules
CREATE POLICY "Users can view their own interview schedules"
  ON public.interview_schedules
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Visitors can create their own interview schedules"
  ON public.interview_schedules
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interview schedules"
  ON public.interview_schedules
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for teachers/admins to manage all schedules
CREATE POLICY "Teachers can view all interview schedules"
  ON public.interview_schedules
  FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can update all interview schedules"
  ON public.interview_schedules
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_interview_schedules_updated_at
  BEFORE UPDATE ON public.interview_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add index for better query performance
CREATE INDEX idx_interview_schedules_user_id ON public.interview_schedules(user_id);
CREATE INDEX idx_interview_schedules_status ON public.interview_schedules(status);
CREATE INDEX idx_interview_schedules_date ON public.interview_schedules(scheduled_date);