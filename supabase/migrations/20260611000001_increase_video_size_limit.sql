-- Increase the videos bucket file size limit to 500 MB
update storage.buckets
set file_size_limit = 524288000
where id = 'videos';
