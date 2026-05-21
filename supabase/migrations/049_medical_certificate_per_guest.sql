begin;

alter table if exists public.reservation_members
  add column if not exists medical_certificate_file_name text;

update public.reservation_members member
set medical_certificate_file_name = reservation.medical_certificate_file_name
from public.reservations reservation
where member.reservation_id = reservation.id
  and member.medical_certificate_file_name is null
  and reservation.medical_certificate_file_name is not null;

commit;
