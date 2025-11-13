-- Add new fields to submissions table
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS song_name TEXT,
ADD COLUMN IF NOT EXISTS harmonic_field TEXT,
ADD COLUMN IF NOT EXISTS effective_key TEXT,
ADD COLUMN IF NOT EXISTS bpm INTEGER,
ADD COLUMN IF NOT EXISTS melodic_reference TEXT;