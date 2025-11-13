-- Update RLS policies for submissions (guests cannot create submissions)
DROP POLICY IF EXISTS "Students can create submissions" ON submissions;
CREATE POLICY "Students can create submissions" 
ON submissions 
FOR INSERT 
WITH CHECK (
  auth.uid() = student_id 
  AND NOT has_role(auth.uid(), 'guest'::app_role)
);

-- Update RLS policies for events (guests cannot create events, but can view)
DROP POLICY IF EXISTS "Users and admins can create events" ON events;
CREATE POLICY "Users and admins can create events" 
ON events 
FOR INSERT 
WITH CHECK (
  (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role))
  AND NOT has_role(auth.uid(), 'guest'::app_role)
);