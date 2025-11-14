-- Add allowed_message_roles column to conversation_groups
ALTER TABLE conversation_groups 
ADD COLUMN allowed_message_roles text[] DEFAULT ARRAY['admin', 'teacher', 'student', 'visitor']::text[];

-- Migrate existing data: if students_can_message is true, include all roles; if false, only admin and teacher
UPDATE conversation_groups 
SET allowed_message_roles = CASE 
  WHEN students_can_message = true THEN ARRAY['admin', 'teacher', 'student', 'visitor']::text[]
  ELSE ARRAY['admin', 'teacher']::text[]
END;

-- Drop the old column
ALTER TABLE conversation_groups 
DROP COLUMN students_can_message;