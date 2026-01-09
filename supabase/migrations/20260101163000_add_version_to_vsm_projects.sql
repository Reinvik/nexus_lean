-- Add version column to vsm_projects table
ALTER TABLE public.vsm_projects ADD COLUMN IF NOT EXISTS version text;
