-- Add new columns for Nexus Be Lean 2026 format
ALTER TABLE public.five_s_cards
ADD COLUMN IF NOT EXISTS priority text CHECK (priority IN ('Baja', 'Media', 'Alta')),
ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('Seiri', 'Seiton', 'Seiso', 'Seiketsu', 'Shitsuke', 'Seguridad', 'Otro')),
ADD COLUMN IF NOT EXISTS due_date timestamptz,
ADD COLUMN IF NOT EXISTS findings text,
ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

-- Normalize existing data if needed (optional)
-- UPDATE public.five_s_cards SET priority = 'Media' WHERE priority IS NULL;
