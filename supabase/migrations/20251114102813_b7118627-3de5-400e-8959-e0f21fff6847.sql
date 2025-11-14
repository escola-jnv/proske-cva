-- Create table for user course access
CREATE TABLE IF NOT EXISTS public.user_course_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.user_course_access ENABLE ROW LEVEL SECURITY;

-- Users can view their own access
CREATE POLICY "Users can view their own course access"
  ON public.user_course_access
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage all access
CREATE POLICY "Admins can manage course access"
  ON public.user_course_access
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_user_course_access_updated_at
  BEFORE UPDATE ON public.user_course_access
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add checkout_url and price to courses table if not exists
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS checkout_url TEXT,
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;