-- Add new columns to conversation_groups table
ALTER TABLE public.conversation_groups 
ADD COLUMN is_visible BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN students_can_message BOOLEAN DEFAULT true NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.conversation_groups.is_visible IS 'Whether the group is visible to all members';
COMMENT ON COLUMN public.conversation_groups.students_can_message IS 'Whether students can send messages in this group';