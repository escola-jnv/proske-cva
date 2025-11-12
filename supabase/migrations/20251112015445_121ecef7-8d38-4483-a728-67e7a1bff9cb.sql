-- Simplify group_members policy to avoid recursion completely
DROP POLICY IF EXISTS "Users can view group memberships" ON public.group_members;

-- Ultra-simple policy: users see their own memberships, teachers/admins see everything
CREATE POLICY "View group memberships"
ON public.group_members
FOR SELECT
USING (
  -- User is viewing their own membership
  user_id = auth.uid()
  OR
  -- User is a teacher or admin (can see all memberships)
  (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);