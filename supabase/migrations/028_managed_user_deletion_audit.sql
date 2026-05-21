begin;

alter table if exists public.profiles
  add column if not exists deleted_reason text;

alter table if exists public.profiles
  add column if not exists deleted_by_profile_id uuid;

alter table if exists public.profiles
  add column if not exists deleted_by_email text;

alter table if exists public.profiles
  add column if not exists deletion_snapshot jsonb;

commit;
