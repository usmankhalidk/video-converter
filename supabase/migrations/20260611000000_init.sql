-- Create the videos table
create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  browser_id text not null,
  original_video_path text not null,
  converted_video_path text,
  created_at timestamp default now()
);

-- Index for fast lookups by browser_id
create index if not exists videos_browser_id_idx on videos (browser_id);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- Allow public reads from the videos bucket
create policy "Public read access for videos"
  on storage.objects
  for select
  using (bucket_id = 'videos');

-- Allow anon/authenticated uploads to the videos bucket
create policy "Allow uploads to videos bucket"
  on storage.objects
  for insert
  with check (bucket_id = 'videos');

-- Allow anon/authenticated deletes from the videos bucket
create policy "Allow deletes from videos bucket"
  on storage.objects
  for delete
  using (bucket_id = 'videos');
