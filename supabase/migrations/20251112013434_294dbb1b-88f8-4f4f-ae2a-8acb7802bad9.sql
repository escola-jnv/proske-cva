-- Add group_id to messages table
ALTER TABLE public.messages 
ADD COLUMN group_id UUID REFERENCES public.conversation_groups(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_messages_group_id ON public.messages(group_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Members can view messages in their communities" ON public.messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;

-- Create new RLS policies for group messages
CREATE POLICY "Members can view group messages"
ON public.messages
FOR SELECT
USING (
  group_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = messages.group_id
    AND group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can send group messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  group_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = messages.group_id
    AND group_members.user_id = auth.uid()
  )
);