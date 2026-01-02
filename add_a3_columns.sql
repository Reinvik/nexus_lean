-- Add missing columns for A3 Projects images
ALTER TABLE public.a3_projects
ADD COLUMN IF NOT EXISTS background_image_url TEXT,
ADD COLUMN IF NOT EXISTS current_condition_image_url TEXT;

-- Verify columns (optional select to ensure it worked)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'a3_projects';
