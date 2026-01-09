-- Add ALL missing columns for A3 Projects (JSONB structured data)
ALTER TABLE public.a3_projects
ADD COLUMN IF NOT EXISTS pareto_data JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ishikawas JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS five_whys JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS follow_up_data JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS action_plan JSONB DEFAULT '[]'::jsonb;

-- Ensure text columns exist too (just in case)
ALTER TABLE public.a3_projects
ADD COLUMN IF NOT EXISTS execution_plan TEXT,
ADD COLUMN IF NOT EXISTS follow_up_notes TEXT;

-- Verify columns again
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'a3_projects';
