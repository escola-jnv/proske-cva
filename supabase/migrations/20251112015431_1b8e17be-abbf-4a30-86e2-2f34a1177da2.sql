-- Fix infinite recursion in group_members policies
DROP POLICY IF EXISTS "Anyone can view group memberships" ON public.group_members;

-- Simple policy: users can see memberships in groups they belong to, or if they're teachers/admins
CREATE POLICY "Users can view group memberships"
ON public.group_members
FOR SELECT
USING (
  -- User is viewing their own membership
  user_id = auth.uid()
  OR
  -- User is a teacher or admin (can see all memberships)
  (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  OR
  -- User is a member of the same group (using security definer function)
  public.is_group_member(auth.uid(), group_id)
);