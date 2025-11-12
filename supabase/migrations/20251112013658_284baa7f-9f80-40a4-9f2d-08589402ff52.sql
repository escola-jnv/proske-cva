-- Function to automatically add creator to group members
CREATE OR REPLACE FUNCTION public.handle_new_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add the creator as a member of the group
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (NEW.id, NEW.created_by);
  
  RETURN NEW;
END;
$$;

-- Trigger to add creator to group members automatically
CREATE TRIGGER on_group_created
  AFTER INSERT ON public.conversation_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_group();

-- Update RLS policies to allow teachers/admins to view all group messages
DROP POLICY IF EXISTS "Members can view group messages" ON public.messages;

CREATE POLICY "Members and teachers can view group messages"
ON public.messages
FOR SELECT
USING (
  group_id IS NOT NULL AND (
    -- User is a member of the group
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = messages.group_id
      AND group_members.user_id = auth.uid()
    )
    OR
    -- User is a teacher or admin
    (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Update RLS policy for sending messages to check permissions
DROP POLICY IF EXISTS "Members can send group messages" ON public.messages;

CREATE POLICY "Members and teachers can send group messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  group_id IS NOT NULL AND (
    -- User is a member of the group
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = messages.group_id
      AND group_members.user_id = auth.uid()
    )
    OR
    -- User is a teacher or admin (can send to any group)
    (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Update group members view policy to allow teachers/admins to see all members
DROP POLICY IF EXISTS "Members can view their memberships" ON public.group_members;

CREATE POLICY "Anyone can view group memberships"
ON public.group_members
FOR SELECT
USING (
  -- User is a member
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
  )
  OR
  -- User is a teacher or admin
  (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);