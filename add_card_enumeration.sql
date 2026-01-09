-- 1. Agregar columna card_number si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'five_s_cards' AND column_name = 'card_number') THEN
        ALTER TABLE public.five_s_cards ADD COLUMN card_number INTEGER;
    END IF;
END $$;

-- 2. Backfill de datos existentes: Asignar números secuenciales por empresa basados en fecha de creación
WITH sequences AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC) as new_number
    FROM public.five_s_cards
)
UPDATE public.five_s_cards
SET card_number = sequences.new_number
FROM sequences
WHERE five_s_cards.id = sequences.id
AND five_s_cards.card_number IS NULL;

-- 3. Crear Función para el Trigger
CREATE OR REPLACE FUNCTION public.set_five_s_card_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Obtener el máximo número actual para esta compañía y sumar 1
    -- Si no hay cartas, empezar en 1
    SELECT COALESCE(MAX(card_number), 0) + 1
    INTO next_number
    FROM public.five_s_cards
    WHERE company_id = NEW.company_id;

    NEW.card_number := next_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear Trigger
DROP TRIGGER IF EXISTS trigger_set_five_s_card_number ON public.five_s_cards;

CREATE TRIGGER trigger_set_five_s_card_number
BEFORE INSERT ON public.five_s_cards
FOR EACH ROW
EXECUTE FUNCTION public.set_five_s_card_number();
