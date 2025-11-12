-- Add foreign key constraint for invited_by to profiles
ALTER TABLE public.community_invitations 
  DROP CONSTRAINT IF EXISTS community_invitations_invited_by_fkey;

ALTER TABLE public.community_invitations 
  ADD CONSTRAINT community_invitations_invited_by_fkey 
  FOREIGN KEY (invited_by) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;