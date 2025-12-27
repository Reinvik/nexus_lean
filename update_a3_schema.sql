-- Add columns for Images and Pareto Data
alter table public.a3_projects 
add column if not exists background_image_url text,
add column if not exists current_condition_image_url text,
add column if not exists pareto_data jsonb default '[]'::jsonb;
