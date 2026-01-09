-- SCRIPT DE CORRECCIÓN
-- Ejecuta esto si tus tarjetas muestran "?" o "00?"

-- 1. Forzar recálculo de números para TODAS las tarjetas
WITH sequences AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC) as new_number
    FROM public.five_s_cards
)
UPDATE public.five_s_cards
SET card_number = sequences.new_number
FROM sequences
WHERE five_s_cards.id = sequences.id;
-- Eliminamos la condición "AND card_number IS NULL" para forzar la reescritura
