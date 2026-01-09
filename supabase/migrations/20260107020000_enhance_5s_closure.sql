-- Add columns for 5S Closure Workflow
ALTER TABLE public.five_s_cards
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS close_date timestamptz,
ADD COLUMN IF NOT EXISTS after_image_url text, -- Strict "After" photo
ADD COLUMN IF NOT EXISTS closure_comment text;

-- Index for assignee lookups
CREATE INDEX IF NOT EXISTS idx_five_s_cards_assigned_to ON public.five_s_cards(assigned_to);
