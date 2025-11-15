-- Remove all restrictive RLS policies on groups and messages
-- Allow everyone to access all groups and messages

-- Drop existing restrictive policies on messages
DROP POLICY IF EXISTS "Users with allowed roles can send group messages" ON public.messages;
DROP POLICY IF EXISTS "Users with allowed roles can view group messages" ON public.messages;

-- Create new open policies for messages
CREATE POLICY "Anyone can view all messages" ON public.messages
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can send messages" ON public.messages
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drop existing restrictive policies on conversation_groups
-- Keep only the view policy as fully open
DROP POLICY IF EXISTS "Anyone can view groups" ON public.conversation_groups;

CREATE POLICY "Everyone can view all groups" ON public.conversation_groups
FOR SELECT USING (true);

-- Update group_members to allow everyone to see all memberships
DROP POLICY IF EXISTS "View group memberships" ON public.group_members;

CREATE POLICY "Everyone can view all group members" ON public.group_members
FOR SELECT USING (true);