-- Add phone field to profiles table
alter table public.profiles 
  add column if not exists phone text;