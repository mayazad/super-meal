-- Add note column to deposits
ALTER TABLE public.meal_deposits ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.utility_deposits ADD COLUMN IF NOT EXISTS note TEXT;
