-- Fix security warnings: Add search_path to functions

-- Update format_name function with search_path
CREATE OR REPLACE FUNCTION public.format_name(name_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN INITCAP(LOWER(TRIM(name_text)));
END;
$$;

-- Update format_profile_names function with search_path
CREATE OR REPLACE FUNCTION public.format_profile_names()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Format name
  IF NEW.name IS NOT NULL THEN
    NEW.name = public.format_name(NEW.name);
  END IF;
  
  -- Format city
  IF NEW.city IS NOT NULL THEN
    NEW.city = public.format_name(NEW.city);
  END IF;
  
  RETURN NEW;
END;
$$;