-- Add event_type enum
CREATE TYPE event_type AS ENUM ('interview', 'mentoring', 'group_study', 'live');

-- Add event_type and social_media_link columns to events table
ALTER TABLE events 
ADD COLUMN event_type event_type NOT NULL DEFAULT 'group_study',
ADD COLUMN social_media_link text;

-- Add comment explaining the column
COMMENT ON COLUMN events.event_type IS 'Type of event: interview (onboarding), mentoring (student-teacher), group_study (multiple types), live (social media broadcast)';
COMMENT ON COLUMN events.social_media_link IS 'Social media link for live events (Instagram/TikTok/YouTube)';