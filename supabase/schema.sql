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

-- Storage bucket: run these in the Supabase dashboard or via the CLI
-- 1. Create the bucket:
--    insert into storage.buckets (id, name, public) values ('videos', 'videos', true);
-- 2. Allow public reads (already handled by public=true above).
-- 3. Allow authenticated/anon uploads via RLS policies (or use service role key in API routes).
