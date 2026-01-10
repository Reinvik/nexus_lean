
-- Add allowed_modules column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS allowed_modules text[] 
DEFAULT ARRAY['5s', 'a3', 'vsm', 'quick_wins', 'auditoria_5s', 'consultor_ia'];

-- Update existing rows to have all modules enabled by default to prevent breaking changes
UPDATE public.companies 
SET allowed_modules = ARRAY['5s', 'a3', 'vsm', 'quick_wins', 'auditoria_5s', 'consultor_ia']
WHERE allowed_modules IS NULL;
