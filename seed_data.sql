-- SEED DATA FOR NEXUS BE LEAN
-- Run this script in the Supabase SQL Editor

-- 1. Ensure CIAL Alimentos Company Exists
DO $$
DECLARE
    v_company_id uuid;
    v_user_id uuid;
    v_audit_id uuid;
BEGIN
    -- Check/Insert Company
    SELECT id INTO v_company_id FROM public.companies WHERE domain = 'cial.cl';
    
    IF v_company_id IS NULL THEN
        INSERT INTO public.companies (name, domain)
        VALUES ('CIAL Alimentos', 'cial.cl')
        RETURNING id INTO v_company_id;
        RAISE NOTICE 'Created Company: CIAL Alimentos';
    ELSE
        RAISE NOTICE 'Company CIAL Alimentos already exists';
    END IF;

    -- 2. Ensure Profile for 'ariel.mellag@gmail.com' (Super Admin)
    -- We assume the user exists in auth.users.
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'ariel.mellag@gmail.com';

    IF v_user_id IS NOT NULL THEN
        -- Upsert Profile
        INSERT INTO public.profiles (id, email, name, role, company_id, is_authorized)
        VALUES (v_user_id, 'ariel.mellag@gmail.com', 'Ariel Mella', 'admin', v_company_id, true)
        ON CONFLICT (id) DO UPDATE
        SET role = 'admin', company_id = v_company_id, is_authorized = true;
        
        RAISE NOTICE 'Updated/Created Admin Profile for Ariel Mella';
    ELSE
        RAISE NOTICE 'User ariel.mellag@gmail.com not found in auth.users. Please sign up first.';
    END IF;


    -- 3. Seed 5S Audits (Only if none exist for this company to avoid dupes on re-run)
    IF NOT EXISTS (SELECT 1 FROM public.audit_5s WHERE company_id = v_company_id) THEN
        
        -- Audit 1: Excellent Score (Last Month)
        INSERT INTO public.audit_5s (company_id, area, auditor, audit_date, total_score, title)
        VALUES (v_company_id, 'Producción - Línea 1', 'Ariel Mella', CURRENT_DATE - INTERVAL '1 month', 92, 'Auditoría Mensual Q1')
        RETURNING id INTO v_audit_id;

        -- Entries for Audit 1 (Simplified loop simulation)
        INSERT INTO public.audit_5s_entries (audit_id, section, question, score, comment) VALUES
        (v_audit_id, 'S1', '¿Se han eliminado los elementos innecesarios?', 5, 'Todo despejado'),
        (v_audit_id, 'S1', '¿Clasificación correcta?', 5, ''),
        (v_audit_id, 'S1', '¿Pasillos libres?', 4, 'Pequeña obstrucción temporal'),
        (v_audit_id, 'S2', '¿Cada cosa en su lugar?', 5, 'Orden impecable'),
        (v_audit_id, 'S2', '¿Etiquetado claro?', 4, 'Falta etiqueta en estante B'),
        (v_audit_id, 'S3', '¿Área limpia?', 5, 'Limpieza profunda realizada'),
        (v_audit_id, 'S4', '¿Estándares visuales?', 4, ''),
        (v_audit_id, 'S5', '¿Disciplina?', 5, 'Personal comprometido');


        -- Audit 2: Average Score (Last Week)
        INSERT INTO public.audit_5s (company_id, area, auditor, audit_date, total_score, title)
        VALUES (v_company_id, 'Bodega Materias Primas', 'Juan Pérez', CURRENT_DATE - INTERVAL '7 days', 75, 'Auditoría Semanal')
        RETURNING id INTO v_audit_id;

        INSERT INTO public.audit_5s_entries (audit_id, section, question, score, comment) VALUES
        (v_audit_id, 'S1', '¿Se han eliminado los elementos innecesarios?', 3, 'Cajas antiguas acumuladas'),
        (v_audit_id, 'S1', '¿Clasificación correcta?', 4, ''),
        (v_audit_id, 'S2', '¿Cada cosa en su lugar?', 3, 'Herramientas mezcladas'),
        (v_audit_id, 'S3', '¿Área limpia?', 4, 'Buen nivel general'),
        (v_audit_id, 'S4', '¿Estándares visuales?', 3, 'Faltan señales'),
        (v_audit_id, 'S5', '¿Disciplina?', 4, '');


        -- Audit 3: Low Score (Yesterday)
        INSERT INTO public.audit_5s (company_id, area, auditor, audit_date, total_score, title)
        VALUES (v_company_id, 'Mantenimiento Taller', 'Pedro González', CURRENT_DATE - INTERVAL '1 day', 45, 'Auditoría Sorpresa')
        RETURNING id INTO v_audit_id;

        INSERT INTO public.audit_5s_entries (audit_id, section, question, score, comment) VALUES
        (v_audit_id, 'S1', '¿Se han eliminado los elementos innecesarios?', 2, 'Mucho material obsoleto'),
        (v_audit_id, 'S2', '¿Cada cosa en su lugar?', 2, 'Desorden generalizado'),
        (v_audit_id, 'S3', '¿Área limpia?', 3, 'Manchas de aceite'),
        (v_audit_id, 'S4', '¿Estándares visuales?', 1, 'Inexistentes'),
        (v_audit_id, 'S5', '¿Disciplina?', 2, 'Falta capacitación');

        RAISE NOTICE 'Seeded 3 Sample Audits';
    ELSE
        RAISE NOTICE 'Audits already exist, skipping seed.';
    END IF;

END $$;
