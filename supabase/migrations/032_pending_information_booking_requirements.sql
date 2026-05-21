begin;

alter table if exists public.reservations
  add column if not exists missing_medical_certificate boolean not null default false;

alter table if exists public.reservations
  add column if not exists missing_health_declaration boolean not null default false;

alter table if exists public.reservations
  add column if not exists missing_liability_waiver boolean not null default false;

alter table if exists public.reservations
  add column if not exists missing_emergency_contact boolean not null default false;

alter table if exists public.reservations
  add column if not exists information_deadline_at timestamptz;

commit;
