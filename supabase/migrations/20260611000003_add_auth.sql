-- Make browser_id nullable since we now identify users via auth
alter table videos alter column browser_id drop not null;

-- Add user_id referencing Supabase auth users
alter table videos add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists videos_user_id_idx on videos (user_id);

-- Enable Row Level Security
alter table videos enable row level security;

-- Users can only access their own video records
create policy "Users can view own videos"
  on videos for select
  using (auth.uid() = user_id);

create policy "Users can insert own videos"
  on videos for insert
  with check (auth.uid() = user_id);

create policy "Users can update own videos"
  on videos for update
  using (auth.uid() = user_id);

create policy "Users can delete own videos"
  on videos for delete
  using (auth.uid() = user_id);

-- Update storage upload policy to require authentication
drop policy if exists "Allow uploads to videos bucket" on storage.objects;
create policy "Allow authenticated uploads to videos bucket"
  on storage.objects for insert
  with check (bucket_id = 'videos' and auth.uid() is not null);

-- Update storage delete policy to require authentication
drop policy if exists "Allow deletes from videos bucket" on storage.objects;
create policy "Allow authenticated deletes from videos bucket"
  on storage.objects for delete
  using (bucket_id = 'videos' and auth.uid() is not null);
