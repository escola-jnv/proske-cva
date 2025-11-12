-- Add monitoring schedule fields to profiles table
ALTER TABLE profiles 
ADD COLUMN monitoring_frequency text CHECK (monitoring_frequency IN ('weekly', 'biweekly', 'monthly')),
ADD COLUMN monitoring_day_of_week integer CHECK (monitoring_day_of_week BETWEEN 0 AND 6),
ADD COLUMN monitoring_time time;