begin;

alter table if exists public.reservations
  add column if not exists requires_revalidation boolean not null default false;

alter table if exists public.reservations
  add column if not exists revalidation_reason text;

alter table if exists public.reservations
  add column if not exists revalidation_requested_at timestamptz;

commit;
