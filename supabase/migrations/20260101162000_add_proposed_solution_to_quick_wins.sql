-- Add proposed_solution column to quick_wins table
ALTER TABLE public.quick_wins ADD COLUMN IF NOT EXISTS proposed_solution text;
