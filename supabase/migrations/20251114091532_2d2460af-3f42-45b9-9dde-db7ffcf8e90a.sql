-- Step 2: Update all 'guest' users to 'visitor' (run after first migration commits)
UPDATE public.user_roles 
SET role = 'visitor'::app_role
WHERE role::text = 'guest';