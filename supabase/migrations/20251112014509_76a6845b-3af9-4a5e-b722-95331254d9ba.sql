-- Create security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

-- Update messages policies to use the new function
DROP POLICY IF EXISTS "Members and teachers can view group messages" ON public.messages;
DROP POLICY IF EXISTS "Members and teachers can send group messages" ON public.messages;

CREATE POLICY "Members and teachers can view group messages"
ON public.messages
FOR SELECT
USING (
  group_id IS NOT NULL AND (
    -- User is a member of the group (using security definer function)
    public.is_group_member(auth.uid(), group_id)
    OR
    -- User is a teacher or admin
    (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Members and teachers can send group messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  group_id IS NOT NULL AND (
    -- User is a member of the group (using security definer function)
    public.is_group_member(auth.uid(), group_id)
    OR
    -- User is a teacher or admin (can send to any group)
    (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);