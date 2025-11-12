-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view events in their groups" ON public.events;

-- Create a security definer function to check event access
CREATE OR REPLACE FUNCTION public.can_view_event(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM event_groups eg
    JOIN group_members gm ON gm.group_id = eg.group_id
    WHERE eg.event_id = _event_id
      AND gm.user_id = _user_id
  );
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Users can view events in their groups"
ON public.events
FOR SELECT
USING (
  public.can_view_event(auth.uid(), id) 
  OR created_by = auth.uid() 
  OR has_role(auth.uid(), 'teacher'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);