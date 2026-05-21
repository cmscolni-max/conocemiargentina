begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'cumbre-media',
    'cumbre-media',
    true,
    52428800,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'video/webm'
    ]
  ),
  (
    'cumbre-docs',
    'cumbre-docs',
    true,
    52428800,
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "cumbre media public read" on storage.objects;
create policy "cumbre media public read"
on storage.objects
for select
to public
using (bucket_id = 'cumbre-media');

drop policy if exists "cumbre media authenticated insert" on storage.objects;
create policy "cumbre media authenticated insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'cumbre-media');

drop policy if exists "cumbre media authenticated update" on storage.objects;
create policy "cumbre media authenticated update"
on storage.objects
for update
to authenticated
using (bucket_id = 'cumbre-media')
with check (bucket_id = 'cumbre-media');

drop policy if exists "cumbre media authenticated delete" on storage.objects;
create policy "cumbre media authenticated delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'cumbre-media');

drop policy if exists "cumbre docs public read" on storage.objects;
create policy "cumbre docs public read"
on storage.objects
for select
to public
using (bucket_id = 'cumbre-docs');

drop policy if exists "cumbre docs authenticated insert" on storage.objects;
create policy "cumbre docs authenticated insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'cumbre-docs');

drop policy if exists "cumbre docs authenticated update" on storage.objects;
create policy "cumbre docs authenticated update"
on storage.objects
for update
to authenticated
using (bucket_id = 'cumbre-docs')
with check (bucket_id = 'cumbre-docs');

drop policy if exists "cumbre docs authenticated delete" on storage.objects;
create policy "cumbre docs authenticated delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'cumbre-docs');

commit;
