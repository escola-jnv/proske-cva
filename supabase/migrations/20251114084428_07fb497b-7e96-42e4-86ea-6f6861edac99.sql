-- Add new fields to profiles table for study information
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS study_goals text[],
ADD COLUMN IF NOT EXISTS study_days integer[],
ADD COLUMN IF NOT EXISTS study_schedule jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.study_goals IS 'Multiple study objectives: Tocar em Casa, Tocar em Visitas/Células, Ensinar, Tocar na Igreja, Tocar em Hospital/Asilos, Tocar em Eventos, Gravar, Compor';
COMMENT ON COLUMN public.profiles.study_days IS 'Days of week user will study (0=Sunday, 1=Monday, ..., 6=Saturday)';
COMMENT ON COLUMN public.profiles.study_schedule IS 'Study schedule as JSON object with day as key and time as value. Example: {"1": "14:00", "3": "16:00"}';
