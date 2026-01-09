-- Helper: Promote a user to Super Admin
-- 1. Create the user in Supabase Dashboard (Auth > Users > Add User) or via Sign Up.
-- 2. Run this script, replacing the email and details below.

UPDATE public.profiles
SET 
    -- ROLE: 'superadmin' (Global access) or 'platform_admin'
    role = 'superadmin', 
    
    -- COMPANY: Optional for superadmins, but useful for filtering
    -- Replace with actual Company ID from public.companies
    company_id = (SELECT id FROM public.companies WHERE name = 'Nombre Empresa' LIMIT 1), 
    
    -- EXTRAS
    full_name = 'Nombre Super Admin'
    
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'correo@ejemplo.com'
);

-- Verification
SELECT * FROM public.profiles WHERE role = 'superadmin';
