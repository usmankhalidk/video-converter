-- Remove HLS streaming table
drop table if exists stream_videos;
-- NOTE: delete the 'video-streams' bucket manually via the Supabase dashboard
-- (Storage → video-streams → Delete bucket) or run:
--   supabase storage rm --bucket video-streams

-- Remove RLS and auth policies from videos
alter table videos disable row level security;

drop policy if exists "Users can view own videos" on videos;
drop policy if exists "Users can insert own videos" on videos;
drop policy if exists "Users can update own videos" on videos;
drop policy if exists "Users can delete own videos" on videos;

-- Remove auth and HLS columns, restore browser_id as not null
alter table videos drop column if exists user_id;
alter table videos drop column if exists conversion_method;
alter table videos alter column browser_id set not null;

drop index if exists videos_user_id_idx;

-- Restore open storage policies (no auth required)
drop policy if exists "Allow authenticated uploads to videos bucket" on storage.objects;
drop policy if exists "Allow authenticated deletes from videos bucket" on storage.objects;

create policy "Allow uploads to videos bucket"
  on storage.objects for insert
  with check (bucket_id = 'videos');

create policy "Allow deletes from videos bucket"
  on storage.objects for delete
  using (bucket_id = 'videos');
