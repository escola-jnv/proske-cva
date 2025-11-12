-- Function to format names (capitalize first letter of each word)
CREATE OR REPLACE FUNCTION public.format_name(name_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN INITCAP(LOWER(TRIM(name_text)));
END;
$$;

-- Function to automatically format profile names before insert/update
CREATE OR REPLACE FUNCTION public.format_profile_names()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- Create trigger to format names on profiles table
DROP TRIGGER IF EXISTS format_profile_names_trigger ON public.profiles;
CREATE TRIGGER format_profile_names_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.format_profile_names();

-- Update existing profiles to have formatted names
UPDATE public.profiles
SET 
  name = public.format_name(name),
  city = CASE 
    WHEN city IS NOT NULL THEN public.format_name(city)
    ELSE NULL
  END
WHERE name IS NOT NULL;