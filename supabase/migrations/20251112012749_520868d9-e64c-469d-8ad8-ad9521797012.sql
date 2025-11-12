-- Create community_invitations table for audit trail
CREATE TABLE IF NOT EXISTS public.community_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  invited_by uuid NOT NULL,
  invite_code text UNIQUE NOT NULL,
  used_by uuid,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.community_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Teachers can create invitations" ON public.community_invitations;
CREATE POLICY "Teachers can create invitations"
  ON public.community_invitations
  FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by AND
    (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

DROP POLICY IF EXISTS "Anyone can view invitations" ON public.community_invitations;
CREATE POLICY "Anyone can view invitations"
  ON public.community_invitations
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can update used invitations" ON public.community_invitations;
CREATE POLICY "Anyone can update used invitations"
  ON public.community_invitations
  FOR UPDATE
  USING (used_by IS NULL OR auth.uid() = used_by);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_invitations_code ON public.community_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_community_invitations_community ON public.community_invitations(community_id);
CREATE INDEX IF NOT EXISTS idx_community_invitations_invited_by ON public.community_invitations(invited_by);