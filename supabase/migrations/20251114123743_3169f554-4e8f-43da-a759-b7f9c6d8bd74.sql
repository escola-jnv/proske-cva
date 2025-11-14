-- Add monthly limit fields to profiles table for user-specific overrides
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS monthly_group_studies_limit integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_tasks_limit integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_monitorings_limit integer DEFAULT 0;

COMMENT ON COLUMN public.profiles.monthly_group_studies_limit IS 'Limite mensal de estudos em grupo';
COMMENT ON COLUMN public.profiles.monthly_tasks_limit IS 'Limite mensal de tarefas/correções';
COMMENT ON COLUMN public.profiles.monthly_monitorings_limit IS 'Limite mensal de monitorias';