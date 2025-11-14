-- Add monthly group studies limit to subscription plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS monthly_group_studies_limit integer DEFAULT 0;

COMMENT ON COLUMN public.subscription_plans.monthly_group_studies_limit IS 'Limite mensal de estudos em grupo incluídos no plano';