-- Collapse two path columns into one
alter table videos add column if not exists video_path text;

-- Carry forward existing data: prefer converted path, fall back to original
update videos
set video_path = coalesce(converted_video_path, original_video_path)
where video_path is null;

alter table videos alter column video_path set not null;

alter table videos drop column if exists original_video_path;
alter table videos drop column if exists converted_video_path;
