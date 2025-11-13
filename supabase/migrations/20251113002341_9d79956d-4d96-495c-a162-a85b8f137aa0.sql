-- Add billing_frequency field to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN billing_frequency text DEFAULT 'monthly';

COMMENT ON COLUMN subscription_plans.billing_frequency IS 'Frequência de cobrança: monthly, quarterly, semiannual, annual';

-- Update handle_new_user function to automatically assign free plan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  free_plan_id uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Novo usuário'),
    NEW.email
  );
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  -- Find free plan (price = 0)
  SELECT id INTO free_plan_id
  FROM subscription_plans
  WHERE price = 0
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If free plan exists, create subscription for 1 year
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan_id, start_date, end_date, status)
    VALUES (
      NEW.id,
      free_plan_id,
      now(),
      now() + interval '1 year',
      'active'
    );
    
    -- Add user to default groups of the free plan
    INSERT INTO public.group_members (user_id, group_id)
    SELECT NEW.id, group_id
    FROM plan_default_groups
    WHERE plan_id = free_plan_id
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;