-- Stream videos table — stores HLS conversion results
create table if not exists stream_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_name text not null,
  playlist_path text,
  status text not null default 'processing', -- 'processing' | 'done' | 'error'
  created_at timestamp default now()
);

create index if not exists stream_videos_user_id_idx on stream_videos (user_id);

-- RLS
alter table stream_videos enable row level security;

create policy "Users can view own stream videos"
  on stream_videos for select
  using (auth.uid() = user_id);

create policy "Users can insert own stream videos"
  on stream_videos for insert
  with check (auth.uid() = user_id);

create policy "Users can update own stream videos"
  on stream_videos for update
  using (auth.uid() = user_id);

create policy "Users can delete own stream videos"
  on stream_videos for delete
  using (auth.uid() = user_id);

-- Separate storage bucket for HLS segments
insert into storage.buckets (id, name, public, file_size_limit)
values ('video-streams', 'video-streams', true, 524288000)
on conflict (id) do nothing;

create policy "Public read for video-streams"
  on storage.objects for select
  using (bucket_id = 'video-streams');

create policy "Authenticated upload to video-streams"
  on storage.objects for insert
  with check (bucket_id = 'video-streams' and auth.uid() is not null);

create policy "Authenticated delete from video-streams"
  on storage.objects for delete
  using (bucket_id = 'video-streams' and auth.uid() is not null);
