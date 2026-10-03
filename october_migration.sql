-- 1. Add named slot columns to daily_meals
ALTER TABLE public.daily_meals
  ADD COLUMN IF NOT EXISTS breakfast        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lunch            INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dinner           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_breakfast  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_lunch      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_dinner     INTEGER NOT NULL DEFAULT 0;

-- 2. Backfill existing rows
--    regular_meals -> split into lunch + dinner
--    guest_meals   -> split into guest_lunch + guest_dinner
UPDATE public.daily_meals SET
  lunch         = FLOOR(regular_meals::numeric / 2),
  dinner        = CEIL(regular_meals::numeric / 2),
  guest_lunch   = FLOOR(guest_meals::numeric / 2),
  guest_dinner  = CEIL(guest_meals::numeric / 2)
WHERE lunch = 0 AND dinner = 0;

-- 3. Add breakfast_enabled toggle to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS breakfast_enabled BOOLEAN NOT NULL DEFAULT false;

-- 4. meal_submissions table for self-service logging (Feature C)
CREATE TABLE IF NOT EXISTS meal_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  date DATE NOT NULL,
  
  -- The named slots
  breakfast INTEGER NOT NULL DEFAULT 0,
  lunch INTEGER NOT NULL DEFAULT 0,
  dinner INTEGER NOT NULL DEFAULT 0,
  guest_breakfast INTEGER NOT NULL DEFAULT 0,
  guest_lunch INTEGER NOT NULL DEFAULT 0,
  guest_dinner INTEGER NOT NULL DEFAULT 0,
  
  -- Totals for easy backward compatibility
  regular_meals INTEGER NOT NULL DEFAULT 0,
  guest_meals INTEGER NOT NULL DEFAULT 0,
  
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Only one pending submission per member per day makes sense, 
  -- but we can just use (member_id, date, admin_id) for the unique constraint.
  UNIQUE(member_id, date, admin_id)
);

ALTER TABLE meal_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to meal_submissions"
  ON meal_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to meal_submissions"
  ON meal_submissions FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to meal_submissions"
  ON meal_submissions USING (auth.role() = 'authenticated');
