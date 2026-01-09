-- Check RLS policies on companies table
SELECT * FROM pg_policies WHERE tablename = 'companies';

-- Check if rows exist
SELECT count(*) FROM companies;

-- Check permissions for authenticated users
SELECT grantees, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'companies';
