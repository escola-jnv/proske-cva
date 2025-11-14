-- Step 1: Add 'visitor' to the enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'visitor';