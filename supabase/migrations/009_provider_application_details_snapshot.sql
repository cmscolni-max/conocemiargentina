begin;

alter table if exists public.provider_applications
  add column if not exists details_json jsonb not null default '{}'::jsonb;

commit;
