begin;

alter table if exists public.profiles
  add column if not exists province text;

alter table if exists public.explorer_profiles
  add column if not exists preferred_sports jsonb not null default '[]'::jsonb;

commit;
