begin;

alter table if exists public.refuge_applications
  add column if not exists spot_snapshot jsonb;

create or replace function public.create_refuge_submission(p_spot jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_listing_id uuid;
  v_payload jsonb;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'No se pudo resolver el perfil autenticado.';
  end if;

  v_payload := coalesce(p_spot, '{}'::jsonb);
  v_listing_id := (v_payload->>'id')::uuid;

  if v_listing_id is null then
    raise exception 'El refugio no tiene un id valido.';
  end if;

  insert into public.listings (
    id,
    provider_user_id,
    listing_type,
    title,
    description,
    province,
    locality,
    location_label,
    price_amount,
    currency,
    difficulty,
    season,
    capacity,
    status,
    is_active,
    is_sponsored,
    organizer_name,
    rules_json,
    latitude,
    longitude
  )
  values (
    v_listing_id,
    v_profile_id,
    'refuge',
    coalesce(v_payload->>'name', 'Refugio'),
    coalesce(v_payload->>'description', ''),
    coalesce(v_payload->>'province', ''),
    coalesce(v_payload->>'location', ''),
    coalesce(v_payload->>'location', ''),
    coalesce((v_payload->>'price')::numeric, 0),
    'ARS',
    (
      case lower(coalesce(v_payload->>'difficulty', ''))
        when 'principiante' then 'bajo'
        when 'medio' then 'medio'
        when 'avanzado' then 'alto'
        when 'experto' then 'experto'
        else null
      end
    )::public.difficulty_level,
    nullif(v_payload->>'season', ''),
    coalesce((v_payload->>'camasCount')::integer, 0),
    'draft',
    true,
    false,
    nullif(v_payload->>'organizerName', ''),
    coalesce(v_payload->'rules', '[]'::jsonb)::text,
    coalesce((v_payload->'coordinates'->>'lat')::double precision, -34.6037),
    coalesce((v_payload->'coordinates'->>'lng')::double precision, -58.3816)
  )
  on conflict (id) do update
  set
    provider_user_id = excluded.provider_user_id,
    title = excluded.title,
    description = excluded.description,
    province = excluded.province,
    locality = excluded.locality,
    location_label = excluded.location_label,
    price_amount = excluded.price_amount,
    difficulty = excluded.difficulty,
    season = excluded.season,
    capacity = excluded.capacity,
    status = 'draft',
    is_active = true,
    organizer_name = excluded.organizer_name,
    rules_json = excluded.rules_json,
    latitude = excluded.latitude,
    longitude = excluded.longitude;

  insert into public.listing_refuge_details (
    listing_id,
    beds_count,
    tent_spots_count
  )
  values (
    v_listing_id,
    nullif(v_payload->>'camasCount', '')::integer,
    nullif(v_payload->>'carpasCount', '')::integer
  )
  on conflict (listing_id) do update
  set
    beds_count = excluded.beds_count,
    tent_spots_count = excluded.tent_spots_count;

  delete from public.listing_amenities where listing_id = v_listing_id;
  insert into public.listing_amenities (listing_id, amenity)
  select v_listing_id, value
  from jsonb_array_elements_text(coalesce(v_payload->'amenities', '[]'::jsonb));

  delete from public.listing_media where listing_id = v_listing_id;
  insert into public.listing_media (listing_id, media_type, url, sort_order)
  select v_listing_id, 'image', value, ord - 1
  from jsonb_array_elements_text(coalesce(v_payload->'images', '[]'::jsonb)) with ordinality as t(value, ord);

  insert into public.refuge_applications (
    id,
    listing_id,
    title,
    provider_name,
    province,
    status,
    submitted_at,
    updated_at,
    spot_snapshot
  )
  values (
    'refuge-app-' || v_listing_id::text,
    v_listing_id,
    coalesce(v_payload->>'name', 'Refugio'),
    coalesce(v_payload->>'organizerName', 'Prestador'),
    coalesce(v_payload->>'province', ''),
    'pending',
    now(),
    now(),
    v_payload
  )
  on conflict (listing_id) do update
  set
    title = excluded.title,
    provider_name = excluded.provider_name,
    province = excluded.province,
    status = 'pending',
    submitted_at = now(),
    updated_at = now(),
    spot_snapshot = excluded.spot_snapshot;

  return jsonb_build_object(
    'listing_id', v_listing_id,
    'application_id', 'refuge-app-' || v_listing_id::text,
    'status', 'pending'
  );
end;
$$;

create or replace function public.create_reservation_submission(p_booking jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_reservation_id uuid;
  v_listing_id uuid;
  v_provider_profile_id uuid;
  v_payload jsonb;
  v_guest jsonb;
  v_index integer := 0;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'No se pudo resolver el perfil autenticado.';
  end if;

  v_payload := coalesce(p_booking, '{}'::jsonb);
  v_reservation_id := (v_payload->>'id')::uuid;

  if v_reservation_id is null then
    raise exception 'La reserva no tiene un id valido.';
  end if;

  v_listing_id := (v_payload->>'spotId')::uuid;
  if v_listing_id is null then
    raise exception 'La reserva no tiene un refugio/actividad valido.';
  end if;

  select l.provider_user_id
  into v_provider_profile_id
  from public.listings l
  where l.id = v_listing_id
  limit 1;

  if v_provider_profile_id is null then
    raise exception 'No se pudo resolver el prestador de la reserva.';
  end if;

  insert into public.reservations (
    id,
    listing_id,
    provider_user_id,
    created_by_user_id,
    status,
    start_date,
    end_date,
    needs_car_parking,
    objective,
    participants_count,
    provider_message,
    reservation_user,
    reservation_name,
    reservation_last_name,
    email,
    phone,
    medical_certificate_file_name,
    total_amount
  )
  values (
    v_reservation_id,
    v_listing_id,
    v_provider_profile_id,
    v_profile_id,
    coalesce(v_payload->>'status', 'pending'),
    nullif(v_payload->>'dateFrom', '')::date,
    nullif(v_payload->>'dateTo', '')::date,
    coalesce((v_payload->>'needsCarStorage')::boolean, false),
    nullif(v_payload->>'objective', ''),
    coalesce((v_payload->>'peopleCount')::integer, 1),
    nullif(v_payload->>'providerMessage', ''),
    nullif(v_payload->>'reservationUser', ''),
    nullif(v_payload->>'reservationName', ''),
    nullif(v_payload->>'reservationLastName', ''),
    nullif(v_payload->>'email', ''),
    nullif(v_payload->>'phone', ''),
    nullif(v_payload->>'medicalCertificateFileName', ''),
    coalesce((v_payload->>'total')::numeric, 0)
  )
  on conflict (id) do update
  set
    provider_user_id = excluded.provider_user_id,
    created_by_user_id = excluded.created_by_user_id,
    status = excluded.status,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    needs_car_parking = excluded.needs_car_parking,
    objective = excluded.objective,
    participants_count = excluded.participants_count,
    provider_message = excluded.provider_message,
    reservation_user = excluded.reservation_user,
    reservation_name = excluded.reservation_name,
    reservation_last_name = excluded.reservation_last_name,
    email = excluded.email,
    phone = excluded.phone,
    medical_certificate_file_name = excluded.medical_certificate_file_name,
    total_amount = excluded.total_amount;

  delete from public.reservation_members where reservation_id = v_reservation_id;

  for v_guest in
    select value from jsonb_array_elements(coalesce(v_payload->'guests', '[]'::jsonb))
  loop
    insert into public.reservation_members (
      reservation_id,
      role,
      linked_user_id,
      is_creator,
      first_name,
      last_name,
      dni_or_passport,
      nationality,
      email,
      phone,
      birth_date,
      age,
      has_experience,
      experience_level,
      has_medical_insurance,
      insurance_name,
      insurance_member_number,
      emergency_contact_name,
      emergency_contact_phone,
      medical_certificate_file_name,
      health_truth_declared,
      liability_accepted,
      app_user_handle,
      health_declaration_answers
    )
    values (
      v_reservation_id,
      case when v_index = 0 then 'creator' else 'participant' end,
      nullif(v_guest->>'appUserId', '')::uuid,
      v_index = 0,
      nullif(v_guest->>'firstName', ''),
      nullif(v_guest->>'lastName', ''),
      nullif(v_guest->>'document', ''),
      nullif(v_guest->>'nationality', ''),
      nullif(v_guest->>'email', ''),
      nullif(v_guest->>'phone', ''),
      nullif(v_guest->>'birthDate', '')::date,
      nullif(v_guest->>'age', '')::integer,
      coalesce((v_guest->>'hasExperience')::boolean, false),
      nullif(v_guest->>'experienceLevel', ''),
      coalesce((v_guest->'insurance'->>'hasInsurance')::boolean, false),
      nullif(v_guest->'insurance'->>'provider', ''),
      nullif(v_guest->'insurance'->>'memberNumber', ''),
      nullif(v_guest->>'emergencyContactName', ''),
      nullif(v_guest->>'emergencyContactPhone', ''),
      nullif(v_guest->>'medicalCertificateFileName', ''),
      coalesce((v_guest->>'healthDeclarationConfirmed')::boolean, false),
      coalesce((v_guest->>'liabilityWaiverAccepted')::boolean, false),
      nullif(v_guest->>'appUserHandle', ''),
      coalesce(v_guest->'healthDeclarationAnswers', '{}'::jsonb)
    );
    v_index := v_index + 1;
  end loop;

  return jsonb_build_object(
    'reservation_id', v_reservation_id,
    'status', coalesce(v_payload->>'status', 'pending')
  );
end;
$$;

grant execute on function public.create_refuge_submission(jsonb) to authenticated;
grant execute on function public.create_reservation_submission(jsonb) to authenticated;

commit;
