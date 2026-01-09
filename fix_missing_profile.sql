-- FIX: Insert missing profile for Ariel.Mella@cial.cl
-- Run this script in the Supabase SQL Editor

DO $$
DECLARE
    target_email TEXT := 'Ariel.Mella@cial.cl'; -- Email reported by user (will check case-insensitive)
    user_record RECORD;
    company_record RECORD;
BEGIN
    -- 1. Find the User in auth.users
    SELECT * INTO user_record
    FROM auth.users
    WHERE email ILIKE target_email;

    IF user_record.id IS NULL THEN
        RAISE NOTICE 'User % not found in auth.users. Please ensure they have signed up.', target_email;
        RETURN;
    END IF;

    -- 2. Find the Company (Cial Alimentos)
    -- Asumimos que el dominio es 'cialalimentos.cl' o 'cial.cl' o busca por nombre 'CIAL Alimentos'
    SELECT * INTO company_record
    FROM public.companies
    WHERE name = 'CIAL Alimentos' OR domain = 'cial.cl'
    LIMIT 1;

    IF company_record.id IS NULL THEN
        RAISE NOTICE 'Company CIAL Alimentos not found.';
        RETURN;
    END IF;

    -- 3. Insert or Update Profile
    INSERT INTO public.profiles (id, email, name, role, company_id, is_authorized)
    VALUES (
        user_record.id,
        user_record.email,
        COALESCE(user_record.raw_user_meta_data->>'name', 'Ariel Mella'), -- Fallback name
        'user', -- Role
        company_record.id, -- Company ID
        true -- Authorized
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        company_id = EXCLUDED.company_id,
        is_authorized = true,
        role = 'user'; -- Reset to user, change to admin manually if needed, or keep existing

    RAISE NOTICE 'Fixed profile for user: % linked to company: %', user_record.email, company_record.name;

END $$;
