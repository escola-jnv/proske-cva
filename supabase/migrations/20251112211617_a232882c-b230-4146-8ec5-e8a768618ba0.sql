-- Remove slug column from communities table
ALTER TABLE public.communities DROP COLUMN IF EXISTS slug;

-- Remove community_invitations table (only used for invite links)
DROP TABLE IF EXISTS public.community_invitations;