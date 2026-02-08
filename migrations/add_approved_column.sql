-- Add approved column for admin approval flow
-- Run this in Supabase SQL Editor if your users table doesn't have it

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- IMPORTANT: Approve existing users so they can still login
UPDATE public.users SET approved = true WHERE approved IS NULL OR approved = false;
