begin;

alter table if exists public.reservation_members
  add column if not exists trekking_notice_ascent_date date;

alter table if exists public.reservation_members
  add column if not exists trekking_notice_return_date date;

alter table if exists public.reservation_members
  add column if not exists trekking_notice_has_adequate_equipment boolean;

alter table if exists public.reservation_members
  add column if not exists trekking_notice_emergency_contact_name text;

alter table if exists public.reservation_members
  add column if not exists trekking_notice_emergency_contact_phone text;

update public.reservation_members member
set
  trekking_notice_ascent_date = reservation.trekking_notice_ascent_date,
  trekking_notice_return_date = reservation.trekking_notice_return_date,
  trekking_notice_has_adequate_equipment = reservation.trekking_notice_has_adequate_equipment,
  trekking_notice_emergency_contact_name = reservation.trekking_notice_emergency_contact_name,
  trekking_notice_emergency_contact_phone = reservation.trekking_notice_emergency_contact_phone
from public.reservations reservation
where member.reservation_id = reservation.id
  and member.is_creator = true
  and (
    member.trekking_notice_ascent_date is distinct from reservation.trekking_notice_ascent_date
    or member.trekking_notice_return_date is distinct from reservation.trekking_notice_return_date
    or member.trekking_notice_has_adequate_equipment is distinct from reservation.trekking_notice_has_adequate_equipment
    or member.trekking_notice_emergency_contact_name is distinct from reservation.trekking_notice_emergency_contact_name
    or member.trekking_notice_emergency_contact_phone is distinct from reservation.trekking_notice_emergency_contact_phone
  );

commit;
