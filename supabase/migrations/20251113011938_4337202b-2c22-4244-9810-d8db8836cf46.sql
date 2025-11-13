-- Add checkout_url to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS checkout_url text;