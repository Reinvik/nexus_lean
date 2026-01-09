-- Create images storage bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Allow public access to images (or authenticated)
-- Using a broad policy for now to ensure it works for the demo/MVP nature
drop policy if exists "Public Access to Images" on storage.objects;
create policy "Public Access to Images"
  on storage.objects for select
  using ( bucket_id = 'images' );

drop policy if exists "Authenticated users can upload images" on storage.objects;
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check ( bucket_id = 'images' and auth.role() = 'authenticated' );
  
drop policy if exists "Users can update their own images" on storage.objects;
create policy "Users can update their own images"
  on storage.objects for update
  using ( bucket_id = 'images' and auth.uid() = owner );

-- Add avatar_url to profiles if not exists
alter table public.profiles 
add column if not exists avatar_url text;

-- Add a default avatars table or just use storage? 
-- The user said "elegir alguna imagen avatar del mismo programa".
-- We can hardcode some default avatars in the frontend or store them in a table.
-- Storing in a simple definition in frontend is easier and faster.
