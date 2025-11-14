-- Update subscription_plans table to have monthly limits
-- Add new columns for monthly limits
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS monthly_corrections_limit integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_monitorings_limit integer DEFAULT 0;

-- Migrate data from old columns to new ones
-- Convert weekly_corrections_limit to monthly (multiply by 4)
UPDATE subscription_plans 
SET monthly_corrections_limit = COALESCE(weekly_corrections_limit, 0) * 4
WHERE monthly_corrections_limit = 0;

-- Convert monitoring_frequency to monthly_monitorings_limit
UPDATE subscription_plans 
SET monthly_monitorings_limit = CASE 
  WHEN monitoring_frequency = 'weekly' THEN 4
  WHEN monitoring_frequency = 'biweekly' THEN 2
  WHEN monitoring_frequency = 'monthly' THEN 1
  ELSE 0
END
WHERE monthly_monitorings_limit = 0;

-- Keep old columns for backward compatibility but we'll phase them out in the UI