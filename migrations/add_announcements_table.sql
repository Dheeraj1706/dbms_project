-- Announcements table for course announcements
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.announcement (
    announcement_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.course(course_id) ON DELETE CASCADE,
    instructor_id uuid NOT NULL REFERENCES public.instructor(user_id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcement_course ON public.announcement(course_id);
CREATE INDEX IF NOT EXISTS idx_announcement_created ON public.announcement(created_at DESC);

ALTER TABLE public.announcement ENABLE ROW LEVEL SECURITY;

-- Allow backend/API access (app does its own auth checks)
CREATE POLICY "Allow all for announcement" ON public.announcement FOR ALL USING (true) WITH CHECK (true);
