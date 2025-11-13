-- Create table to track read messages
CREATE TABLE message_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid NOT NULL,
  group_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Enable RLS
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;

-- Users can view their own read status
CREATE POLICY "Users can view their own read status"
ON message_read_status
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own read status
CREATE POLICY "Users can insert their own read status"
ON message_read_status
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create function to get unread count for a user in a group
CREATE OR REPLACE FUNCTION get_unread_count(_user_id uuid, _group_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM messages m
  WHERE m.group_id = _group_id
    AND m.user_id != _user_id -- Don't count own messages
    AND NOT EXISTS (
      SELECT 1 
      FROM message_read_status mrs
      WHERE mrs.message_id = m.id
        AND mrs.user_id = _user_id
    );
$$;

COMMENT ON TABLE message_read_status IS 'Tracks which messages each user has read';
COMMENT ON FUNCTION get_unread_count IS 'Returns count of unread messages for a user in a specific group';