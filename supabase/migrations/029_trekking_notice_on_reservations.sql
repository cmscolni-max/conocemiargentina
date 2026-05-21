begin;

alter table if exists public.reservations
  add column if not exists trekking_notice_ascent_date date;

alter table if exists public.reservations
  add column if not exists trekking_notice_return_date date;

alter table if exists public.reservations
  add column if not exists trekking_notice_has_adequate_equipment boolean;

alter table if exists public.reservations
  add column if not exists trekking_notice_emergency_contact_name text;

alter table if exists public.reservations
  add column if not exists trekking_notice_emergency_contact_phone text;

commit;
