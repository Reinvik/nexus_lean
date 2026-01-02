
-- 1. Create Companies FIRST (So triggers can find them)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE domain = 'cial.cl') THEN
        INSERT INTO public.companies (name, domain) VALUES ('CIAL Alimentos', 'cial.cl');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE domain = 'belean.cl') THEN
        INSERT INTO public.companies (name, domain) VALUES ('Be Lean', 'belean.cl');
    END IF;
END $$;

-- 2. Create Users in auth.users
-- The new trigger logic in migration 20240101000000 will automatically:
-- 1. Detect 'ariel.mellag@gmail.com' -> make superadmin
-- 2. Detect 'equipo@belean.cl' -> make superadmin AND link to 'belean.cl' company

DO $$
BEGIN
    -- User: ariel.mellag@gmail.com
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ariel.mellag@gmail.com') THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            '70000000-0000-0000-0000-000000000001',
            'authenticated',
            'authenticated',
            'ariel.mellag@gmail.com',
            crypt('Equix123', gen_salt('bf')),
            now(),
            NULL,
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Ariel Mella"}',
            now(),
            now(),
            '',
            '',
            '',
            ''
        );
    END IF;

    -- User: equipo@belean.cl
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'equipo@belean.cl') THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            '70000000-0000-0000-0000-000000000002',
            'authenticated',
            'authenticated',
            'equipo@belean.cl',
            crypt('Belean123', gen_salt('bf')),
            now(),
            NULL,
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Equipo Be Lean"}',
            now(),
            now(),
            '',
            '',
            '',
            ''
        );
    END IF;
END $$;


-- 3. Seed Data (Audits, etc.)
DO $$
DECLARE
    v_company_id uuid;
    v_audit_id uuid;
BEGIN
    SELECT id INTO v_company_id FROM public.companies WHERE domain = 'cial.cl';

    -- Check if audits exist
    IF NOT EXISTS (SELECT 1 FROM public.audit_5s WHERE company_id = v_company_id) THEN
        -- Audit 1
        INSERT INTO public.audit_5s (company_id, area, auditor, audit_date, total_score, title)
        VALUES (v_company_id, 'Producción - Línea 1', 'Ariel Mella', CURRENT_DATE - INTERVAL '1 month', 92, 'Auditoría Mensual Q1')
        RETURNING id INTO v_audit_id;

        INSERT INTO public.audit_5s_entries (audit_id, section, question, score, comment) VALUES
        (v_audit_id, 'S1', '¿Se han eliminado los elementos innecesarios?', 5, 'Todo despejado'),
        (v_audit_id, 'S2', '¿Cada cosa en su lugar?', 5, 'Orden impecable');
    END IF;
END $$;
