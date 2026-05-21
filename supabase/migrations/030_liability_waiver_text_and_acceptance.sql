begin;

alter table if exists public.listing_reservation_requirements
  add column if not exists liability_waiver_text text;

alter table if exists public.reservations
  add column if not exists liability_waiver_accepted boolean not null default false;

alter table if exists public.reservations
  add column if not exists liability_waiver_accepted_at timestamptz;

alter table if exists public.reservations
  add column if not exists liability_waiver_text_snapshot text;

alter table if exists public.reservation_members
  add column if not exists liability_accepted_at timestamptz;

alter table if exists public.reservation_members
  add column if not exists liability_text_snapshot text;

commit;
