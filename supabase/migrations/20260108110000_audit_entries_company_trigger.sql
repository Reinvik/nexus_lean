-- TRIGGER MIGRATION: Auto-fill company_id for audit entries
-- Run this in Supabase SQL Editor to prevent "null value in column company_id" errors.

BEGIN;

CREATE OR REPLACE FUNCTION public.audit_5s_entries_set_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_company_id uuid;
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.audit_5s
    WHERE id = NEW.audit_id;

    NEW.company_id := v_company_id;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_5s_entries_set_company_id'
  ) THEN
    CREATE TRIGGER trg_audit_5s_entries_set_company_id
    BEFORE INSERT OR UPDATE ON public.audit_5s_entries
    FOR EACH ROW EXECUTE FUNCTION public.audit_5s_entries_set_company_id();
  END IF;
END $$;

COMMIT;
