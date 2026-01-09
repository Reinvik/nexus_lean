-- Migration: Restore Superadmin Users (Ariel & Equipo)
-- Description: Re-creates the specific Superadmin users in auth.users if missing.

DO $$
DECLARE
    -- Ariel
    v_ariel_id uuid := '00000000-0000-0000-0000-000000000001'; 
    v_ariel_email text := 'ariel.mellag@gmail.com';
    v_ariel_pwd text := 'Equix123';
    
    -- Equipo
    v_equipo_id uuid := '00000000-0000-0000-0000-000000000002';
    v_equipo_email text := 'Equipo@belean.cl';
    v_equipo_pwd text := 'Belean123';
    
    v_dummy_id uuid;
BEGIN
    --------------------------------------------------------------
    -- 1. ARIEL MELLA
    --------------------------------------------------------------
    SELECT id INTO v_dummy_id FROM auth.users WHERE email = v_ariel_email;
    IF v_dummy_id IS NULL THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, 
            email_confirmed_at, recovery_sent_at, last_sign_in_at, 
            raw_app_meta_data, raw_user_meta_data, 
            created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', v_ariel_id, 'authenticated', 'authenticated', v_ariel_email, 
            crypt(v_ariel_pwd, gen_salt('bf')), -- Uses pgcrypto
            now(), now(), now(), 
            '{"provider":"email","providers":["email"]}', '{}', now(), now()
        );
        RAISE NOTICE 'Created auth user: %', v_ariel_email;
    ELSE
        -- Optional: Update password if user exists (for dev convenience)
        UPDATE auth.users 
        SET encrypted_password = crypt(v_ariel_pwd, gen_salt('bf')) 
        WHERE email = v_ariel_email;
        -- Capture existing ID for profile linking if needed
        SELECT id INTO v_ariel_id FROM auth.users WHERE email = v_ariel_email;
    END IF;

    -- Ensure Profile (Ariel)
    INSERT INTO public.profiles (id, email, name, role, company_id, is_authorized)
    VALUES (v_ariel_id, v_ariel_email, 'Ariel Mella', 'superadmin', NULL, true)
    ON CONFLICT (id) DO UPDATE
    SET role = 'superadmin', company_id = NULL, is_authorized = true;


    --------------------------------------------------------------
    -- 2. EQUIPO BELEAN
    --------------------------------------------------------------
    SELECT id INTO v_dummy_id FROM auth.users WHERE email = v_equipo_email;
    IF v_dummy_id IS NULL THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, 
            email_confirmed_at, recovery_sent_at, last_sign_in_at, 
            raw_app_meta_data, raw_user_meta_data, 
            created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', v_equipo_id, 'authenticated', 'authenticated', v_equipo_email, 
            crypt(v_equipo_pwd, gen_salt('bf')), 
            now(), now(), now(), 
            '{"provider":"email","providers":["email"]}', '{}', now(), now()
        );
        RAISE NOTICE 'Created auth user: %', v_equipo_email;
    ELSE
         UPDATE auth.users 
        SET encrypted_password = crypt(v_equipo_pwd, gen_salt('bf')) 
        WHERE email = v_equipo_email;
        SELECT id INTO v_equipo_id FROM auth.users WHERE email = v_equipo_email;
    END IF;

    -- Ensure Profile (Equipo)
    INSERT INTO public.profiles (id, email, name, role, company_id, is_authorized)
    VALUES (v_equipo_id, v_equipo_email, 'Equipo BeLean', 'superadmin', NULL, true)
    ON CONFLICT (id) DO UPDATE
    SET role = 'superadmin', company_id = NULL, is_authorized = true;

END $$;
