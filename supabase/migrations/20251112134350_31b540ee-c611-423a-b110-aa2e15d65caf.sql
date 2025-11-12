-- Add last_active_at field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN last_active_at timestamp with time zone DEFAULT now();