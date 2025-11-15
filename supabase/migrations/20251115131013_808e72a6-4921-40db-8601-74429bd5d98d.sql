-- Insert admin role for admin@gmail.com user
INSERT INTO public.user_roles (user_id, role)
VALUES ('9bc48b60-dcbe-4aef-8672-53066ff59a4d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create function to protect the permanent admin
CREATE OR REPLACE FUNCTION public.protect_permanent_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent deletion of the permanent admin role
  IF TG_OP = 'DELETE' AND OLD.user_id = '9bc48b60-dcbe-4aef-8672-53066ff59a4d'::uuid AND OLD.role = 'admin' THEN
    RAISE EXCEPTION 'Cannot delete permanent admin role';
  END IF;
  
  -- Prevent update of the permanent admin role
  IF TG_OP = 'UPDATE' AND OLD.user_id = '9bc48b60-dcbe-4aef-8672-53066ff59a4d'::uuid AND OLD.role = 'admin' THEN
    RAISE EXCEPTION 'Cannot modify permanent admin role';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to protect the permanent admin
DROP TRIGGER IF EXISTS protect_permanent_admin_trigger ON public.user_roles;
CREATE TRIGGER protect_permanent_admin_trigger
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.protect_permanent_admin();