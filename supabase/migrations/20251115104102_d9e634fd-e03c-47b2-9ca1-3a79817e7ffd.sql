-- Add mentions column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS mentions uuid[] DEFAULT ARRAY[]::uuid[];

-- Create table to track unread mentions
CREATE TABLE IF NOT EXISTS public.user_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.conversation_groups(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Enable RLS on user_mentions
ALTER TABLE public.user_mentions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own mentions
CREATE POLICY "Users can view their own mentions"
ON public.user_mentions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update their own mentions
CREATE POLICY "Users can mark their mentions as read"
ON public.user_mentions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: System can create mentions
CREATE POLICY "System can create mentions"
ON public.user_mentions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Function to create mentions when a message is sent
CREATE OR REPLACE FUNCTION public.handle_message_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mentioned_user_id uuid;
BEGIN
  -- If mentions array is not empty, create user_mentions records
  IF array_length(NEW.mentions, 1) > 0 THEN
    FOREACH mentioned_user_id IN ARRAY NEW.mentions
    LOOP
      INSERT INTO public.user_mentions (user_id, group_id, message_id, is_read)
      VALUES (mentioned_user_id, NEW.group_id, NEW.id, false)
      ON CONFLICT (user_id, message_id) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to handle mentions after message insert
DROP TRIGGER IF EXISTS on_message_mentions ON public.messages;
CREATE TRIGGER on_message_mentions
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_message_mentions();