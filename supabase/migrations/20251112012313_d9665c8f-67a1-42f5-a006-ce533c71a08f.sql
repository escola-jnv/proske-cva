-- Create conversation_groups table
CREATE TABLE IF NOT EXISTS public.conversation_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.conversation_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.conversation_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_groups
DROP POLICY IF EXISTS "Anyone can view groups" ON public.conversation_groups;
CREATE POLICY "Anyone can view groups"
  ON public.conversation_groups
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Teachers can create groups" ON public.conversation_groups;
CREATE POLICY "Teachers can create groups"
  ON public.conversation_groups
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Creators can update groups" ON public.conversation_groups;
CREATE POLICY "Creators can update groups"
  ON public.conversation_groups
  FOR UPDATE
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creators and admins can delete groups" ON public.conversation_groups;
CREATE POLICY "Creators and admins can delete groups"
  ON public.conversation_groups
  FOR DELETE
  USING (
    auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policies for group_members
DROP POLICY IF EXISTS "Members can view their memberships" ON public.group_members;
CREATE POLICY "Members can view their memberships"
  ON public.group_members
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Teachers can add members" ON public.group_members;
CREATE POLICY "Teachers can add members"
  ON public.group_members
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Teachers can remove members" ON public.group_members;
CREATE POLICY "Teachers can remove members"
  ON public.group_members
  FOR DELETE
  USING (
    has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_conversation_groups_updated_at ON public.conversation_groups;
CREATE TRIGGER update_conversation_groups_updated_at
  BEFORE UPDATE ON public.conversation_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_groups_community_id ON public.conversation_groups(community_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;