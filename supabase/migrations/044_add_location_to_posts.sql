begin;

alter table if exists public.posts
  add column if not exists location text;

commit;
