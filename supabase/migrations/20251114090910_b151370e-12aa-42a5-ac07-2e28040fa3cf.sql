-- Add foreign key relationship between group_members and profiles
ALTER TABLE public.group_members
ADD CONSTRAINT group_members_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Update the handle_new_user function to check for paid plan before assigning student role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Assign default visitor role (all new users start as visitors)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'visitor');
  
  -- Find free plan (price = 0)
  SELECT id INTO free_plan_id
  FROM subscription_plans
  WHERE price = 0
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If free plan exists, create subscription but user stays as visitor
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

-- Create function to update user role based on subscription
CREATE OR REPLACE FUNCTION public.update_user_role_based_on_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan_price numeric;
BEGIN
  -- Get the price of the user's active subscription
  SELECT COALESCE(sp.price, 0) INTO user_plan_price
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = NEW.user_id
    AND us.status = 'active'
    AND us.end_date > now()
  ORDER BY sp.price DESC
  LIMIT 1;

  -- If user has a paid plan (price > 0), make them a student
  IF user_plan_price > 0 THEN
    -- Remove visitor role and add student role
    DELETE FROM user_roles WHERE user_id = NEW.user_id AND role = 'visitor';
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.user_id, 'student')
    ON CONFLICT DO NOTHING;
  ELSE
    -- If free plan or no plan, make them visitor
    DELETE FROM user_roles WHERE user_id = NEW.user_id AND role = 'student';
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.user_id, 'visitor')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to update role when subscription changes
DROP TRIGGER IF EXISTS update_role_on_subscription_change ON user_subscriptions;
CREATE TRIGGER update_role_on_subscription_change
  AFTER INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_role_based_on_subscription();