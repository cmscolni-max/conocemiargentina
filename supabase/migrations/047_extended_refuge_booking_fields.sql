begin;

alter table if exists public.reservations
  add column if not exists country_calling_code text;

alter table if exists public.reservations
  add column if not exists phone_number text;

alter table if exists public.reservations
  add column if not exists medium_transport text;

alter table if exists public.reservations
  add column if not exists needs_parking boolean;

alter table if exists public.reservations
  add column if not exists license_plate text;

alter table if exists public.reservations
  add column if not exists arrival_time text;

alter table if exists public.reservations
  add column if not exists departure_time text;

alter table if exists public.reservations
  add column if not exists observations text;

alter table if exists public.reservations
  add column if not exists accepts_terms boolean;

alter table if exists public.reservations
  add column if not exists accepts_cancellation boolean;

alter table if exists public.reservations
  add column if not exists consent_contact boolean;

alter table if exists public.reservations
  add column if not exists shelter_route text;

alter table if exists public.reservations
  add column if not exists trekking_difficulty_level text;

alter table if exists public.reservations
  add column if not exists trekking_with_guide boolean;

alter table if exists public.reservations
  add column if not exists trekking_guide_name text;

alter table if exists public.reservations
  add column if not exists trekking_guide_last_name text;

alter table if exists public.reservations
  add column if not exists trekking_guide_phone text;

alter table if exists public.reservations
  add column if not exists trekking_responsible_group text;

alter table if exists public.reservations
  add column if not exists trekking_point_of_departure text;

alter table if exists public.reservations
  add column if not exists trekking_departure_time text;

alter table if exists public.reservations
  add column if not exists trekking_return_time text;

alter table if exists public.reservations
  add column if not exists trekking_group_count integer;

alter table if exists public.reservations
  add column if not exists trekking_communication_medium text;

alter table if exists public.reservations
  add column if not exists trekking_declaration_aptitude boolean;

alter table if exists public.reservations
  add column if not exists trekking_accept_recommendations boolean;

alter table if exists public.reservations
  add column if not exists trekking_accept_equipment boolean;

alter table if exists public.reservations
  add column if not exists trekking_weather_read boolean;

alter table if exists public.reservation_members
  add column if not exists document_type text;

alter table if exists public.reservation_members
  add column if not exists document_issuer_country text;

alter table if exists public.reservation_members
  add column if not exists residence_country text;

alter table if exists public.reservation_members
  add column if not exists gender text;

alter table if exists public.reservation_members
  add column if not exists country_calling_code text;

alter table if exists public.reservation_members
  add column if not exists phone_number text;

alter table if exists public.reservation_members
  add column if not exists contact_relation text;

alter table if exists public.reservation_members
  add column if not exists allergies text;

alter table if exists public.reservation_members
  add column if not exists insurance_coverage text;

alter table if exists public.reservation_members
  add column if not exists responsibility_declaration boolean;

commit;
