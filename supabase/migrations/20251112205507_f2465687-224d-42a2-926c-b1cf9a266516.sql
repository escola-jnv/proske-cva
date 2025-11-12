-- Add slug column to communities table
ALTER TABLE public.communities 
ADD COLUMN slug text UNIQUE;

-- Create index for faster slug lookups
CREATE INDEX idx_communities_slug ON public.communities(slug);

-- Update existing communities with a default slug based on name
UPDATE public.communities 
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;

-- Make slug NOT NULL after setting defaults
ALTER TABLE public.communities 
ALTER COLUMN slug SET NOT NULL;