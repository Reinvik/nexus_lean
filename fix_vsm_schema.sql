-- Add takt_time column to vsm_projects if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vsm_projects' AND column_name = 'takt_time') THEN
        ALTER TABLE public.vsm_projects ADD COLUMN takt_time TEXT;
    END IF;
END $$;
