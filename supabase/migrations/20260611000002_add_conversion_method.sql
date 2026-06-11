-- Track which method was used to convert a video: 'nextjs' or 'edge'
alter table videos add column if not exists conversion_method text;
