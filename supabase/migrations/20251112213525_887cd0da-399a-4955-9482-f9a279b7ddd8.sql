-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;

-- Create new policy that allows users to create events for themselves
-- OR allows admins to create events for anyone
CREATE POLICY "Users and admins can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by 
  OR has_role(auth.uid(), 'admin'::app_role)
);