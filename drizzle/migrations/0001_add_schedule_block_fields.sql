ALTER TABLE public.schedule_blocks ADD COLUMN energy_level TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE public.schedule_blocks ADD COLUMN focus_type TEXT NOT NULL DEFAULT 'none';
ALTER TABLE public.schedule_blocks ADD COLUMN task_style TEXT;