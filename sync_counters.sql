-- Sync company_card_counters with actual max card_number in five_s_cards
-- This fixes the "duplicate key value violates unique constraint 'unique_company_card_number'" error.

DO $$
DECLARE
    r RECORD;
    max_num INTEGER;
BEGIN
    -- 1. Ensure table exists (just in case)
    CREATE TABLE IF NOT EXISTS public.company_card_counters (
      company_id uuid PRIMARY KEY,
      last_number integer NOT NULL DEFAULT 0
    );

    -- 2. Iterate over all companies to sync
    FOR r IN SELECT id FROM public.companies LOOP
        -- Find max card number for this company in existing cards
        SELECT COALESCE(MAX(card_number), 0) INTO max_num
        FROM public.five_s_cards
        WHERE company_id = r.id;

        -- Update or Insert counter
        -- We use GREATEST to ensure we never decrease the counter if it was already higher (e.g. deleted cards at end)
        -- ensuring we don't accidentally cause conflicts if numbers are reused? 
        -- Actually, to avoid duplicates, we MUST be higher than any existing card.
        -- So max_num is the floor.
        
        INSERT INTO public.company_card_counters (company_id, last_number)
        VALUES (r.id, max_num)
        ON CONFLICT (company_id)
        DO UPDATE SET last_number = GREATEST(company_card_counters.last_number, EXCLUDED.last_number);
        
        RAISE NOTICE 'Company % synced. Max card: %', r.id, max_num;
    END LOOP;
END $$;
