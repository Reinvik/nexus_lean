-- WARNING: This script will delete all existing data in the profiles table!

-- 1. Reset Profiles Table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Create Profiles Table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',
  is_authorized BOOLEAN DEFAULT false,
  company_id UUID -- Assuming you have a companies table, otherwise remove FK constraint or keep as UUID
);

-- 3. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Avoiding Infinite Recursion)

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Policy: Allow authenticated users to read ALL profiles
-- This avoids recursion when checking "company users" or "admin status" via the same table.
-- In a stricter system, you would use a separate role table or JWT claims.
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- 5. Create Trigger for New Users
create function public.handle_new_user() 
returns trigger 
language plpgsql 
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, is_authorized, company_id)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name',
    'user',
    true, -- Auto-authorize for now to fix login issues
    (new.raw_user_meta_data->>'company_id')::uuid
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Grant permissions
GRANT ALL ON TABLE public.profiles TO postgres;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.profiles TO authenticated;
