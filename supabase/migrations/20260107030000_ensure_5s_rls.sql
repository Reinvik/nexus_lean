-- Enable RLS on five_s_cards if not already enabled
ALTER TABLE public.five_s_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts/duplicates
DROP POLICY IF EXISTS "Users can view their company cards" ON public.five_s_cards;
DROP POLICY IF EXISTS "Users can create their company cards" ON public.five_s_cards;
DROP POLICY IF EXISTS "Users can update their company cards" ON public.five_s_cards;
DROP POLICY IF EXISTS "Users can delete their company cards" ON public.five_s_cards;

-- Create strict policies strictly linking profile.company_id to five_s_cards.company_id

-- 1. VIEW: Users can see cards where company_id matches their profile's company_id
CREATE POLICY "Users can view their company cards"
ON public.five_s_cards
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- 2. INSERT: Users can insert cards only for their own company
CREATE POLICY "Users can create their company cards"
ON public.five_s_cards
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- 3. UPDATE: Users can update cards of their company
CREATE POLICY "Users can update their company cards"
ON public.five_s_cards
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- 4. DELETE: Users can delete cards of their company
CREATE POLICY "Users can delete their company cards"
ON public.five_s_cards
FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles
    WHERE id = auth.uid()
  )
);
