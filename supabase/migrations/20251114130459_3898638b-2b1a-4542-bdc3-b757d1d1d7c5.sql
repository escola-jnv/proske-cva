-- Temporarily remove all limitations for task submissions
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Students can create submissions" ON public.submissions;

-- Create a more permissive policy that only requires authentication
CREATE POLICY "Anyone authenticated can create submissions"
ON public.submissions
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Add comment explaining this is temporary
COMMENT ON POLICY "Anyone authenticated can create submissions" ON public.submissions 
IS 'Temporary policy - removed all role-based limitations';