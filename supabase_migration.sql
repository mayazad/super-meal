-- ==============================================================================
-- SUPERMEAL MULTI-TENANT & SENPAI ARCHITECTURE MIGRATION SCRIPT
-- ==============================================================================
-- Run this script in your Supabase SQL Editor.

-- 1. Create Profiles Table for Role Based Access Control
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'pending_admin', -- 'senpai', 'admin', 'pending_admin'
  mess_slug TEXT UNIQUE,
  mess_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Create app_settings for Global Themes
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'global_config',
  selected_theme TEXT DEFAULT 'classic',
  broadcast_message TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: We updated this table earlier, but just to ensure it's here for completeness
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of settings" ON public.app_settings;
CREATE POLICY "Allow public read of settings" ON public.app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow admin to update settings" ON public.app_settings;
CREATE POLICY "Allow admin to update settings" ON public.app_settings FOR ALL USING (auth.role() = 'authenticated');

-- 3. Add admin_id to all existing tables to isolate data for Multi-Tenancy
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.daily_meals ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.groceries ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.meal_deposits ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.utilities ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.utility_deposits ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.utility_payments ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.locked_months ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Create your default Senpai / Admin identity in Profiles
-- Replace 'YOUR_UUID_HERE' with your Auth UUID from Supabase Authentication Dashboard!
-- INSERT INTO public.profiles (id, role, mess_slug, mess_name) 
-- VALUES ('YOUR_UUID_HERE', 'senpai', 'master-mess', 'MayazAD Master Mess')
-- ON CONFLICT (id) DO UPDATE SET role = 'senpai', mess_slug = 'master-mess';

-- 5. Backfill existing data to the master user so you don't lose your data!
-- Replace 'YOUR_UUID_HERE' with your exact UUID.
-- DO NOT RUN THIS BLOCK UNTIL YOU HAVE REPLACED THE UUID!
/*
DO $$ 
DECLARE 
    migration_admin_id UUID := 'YOUR_UUID_HERE'; 
BEGIN
    UPDATE public.members SET admin_id = migration_admin_id WHERE admin_id IS NULL;
    UPDATE public.daily_meals SET admin_id = migration_admin_id WHERE admin_id IS NULL;
    UPDATE public.groceries SET admin_id = migration_admin_id WHERE admin_id IS NULL;
    UPDATE public.meal_deposits SET admin_id = migration_admin_id WHERE admin_id IS NULL;
    UPDATE public.utilities SET admin_id = migration_admin_id WHERE admin_id IS NULL;
    UPDATE public.utility_deposits SET admin_id = migration_admin_id WHERE admin_id IS NULL;
    UPDATE public.utility_payments SET admin_id = migration_admin_id WHERE admin_id IS NULL;
    UPDATE public.locked_months SET admin_id = migration_admin_id WHERE admin_id IS NULL;
END $$;
*/
