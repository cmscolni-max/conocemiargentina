begin;

create or replace function public.is_valid_person_name(value text)
returns boolean
language sql
immutable
strict
as $$
  select coalesce(trim(value), '') ~ '^[A-Za-zÁÉÍÓÚáéíóúÑñ''’ -]{2,50}$';
$$;

create or replace function public.is_valid_text_with_numbers(value text, min_length integer default 2, max_length integer default 100)
returns boolean
language plpgsql
immutable
strict
as $$
declare
  v_value text := coalesce(trim(value), '');
begin
  return v_value ~ '^[A-Za-zÁÉÍÓÚáéíóúÑñ''’0-9 -]{2,100}$'
    and length(v_value) between min_length and max_length;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_full_name_check'
  ) then
    alter table public.profiles
      add constraint profiles_full_name_check
      check (public.is_valid_person_name(coalesce(full_name, ''))) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_original_full_name_check'
  ) then
    alter table public.profiles
      add constraint profiles_original_full_name_check
      check (original_full_name is null or public.is_valid_person_name(original_full_name)) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_reservation_name_check'
  ) then
    alter table public.reservations
      add constraint reservations_reservation_name_check
      check (public.is_valid_person_name(coalesce(reservation_name, ''))) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_reservation_last_name_check'
  ) then
    alter table public.reservations
      add constraint reservations_reservation_last_name_check
      check (public.is_valid_person_name(coalesce(reservation_last_name, ''))) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_trekking_guide_name_check'
  ) then
    alter table public.reservations
      add constraint reservations_trekking_guide_name_check
      check (trekking_guide_name is null or public.is_valid_person_name(trekking_guide_name)) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_trekking_guide_last_name_check'
  ) then
    alter table public.reservations
      add constraint reservations_trekking_guide_last_name_check
      check (trekking_guide_last_name is null or public.is_valid_person_name(trekking_guide_last_name)) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_trekking_responsible_group_check'
  ) then
    alter table public.reservations
      add constraint reservations_trekking_responsible_group_check
      check (trekking_responsible_group is null or public.is_valid_person_name(trekking_responsible_group)) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_trekking_notice_emergency_contact_name_check'
  ) then
    alter table public.reservations
      add constraint reservations_trekking_notice_emergency_contact_name_check
      check (trekking_notice_emergency_contact_name is null or public.is_valid_person_name(trekking_notice_emergency_contact_name)) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_objective_check'
  ) then
    alter table public.reservations
      add constraint reservations_objective_check
      check (public.is_valid_text_with_numbers(coalesce(objective, ''), 2, 50)) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_shelter_route_check'
  ) then
    alter table public.reservations
      add constraint reservations_shelter_route_check
      check (shelter_route is null or public.is_valid_text_with_numbers(shelter_route, 3, 100)) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservation_members_first_name_check'
  ) then
    alter table public.reservation_members
      add constraint reservation_members_first_name_check
      check (public.is_valid_person_name(coalesce(first_name, ''))) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservation_members_last_name_check'
  ) then
    alter table public.reservation_members
      add constraint reservation_members_last_name_check
      check (public.is_valid_person_name(coalesce(last_name, ''))) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservation_members_emergency_contact_name_check'
  ) then
    alter table public.reservation_members
      add constraint reservation_members_emergency_contact_name_check
      check (emergency_contact_name is null or public.is_valid_person_name(emergency_contact_name)) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservation_members_trekking_notice_emergency_contact_name_check'
  ) then
    alter table public.reservation_members
      add constraint reservation_members_trekking_notice_emergency_contact_name_check
      check (trekking_notice_emergency_contact_name is null or public.is_valid_person_name(trekking_notice_emergency_contact_name)) not valid;
  end if;
end $$;

create or replace function public.create_admin_account(
  p_email text,
  p_password text,
  p_full_name text,
  p_username text,
  p_province text default null
)
returns table (
  id uuid,
  auth_user_id uuid,
  full_name text,
  email text,
  username text,
  province text,
  role text,
  account_status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_role text;
  v_email text;
  v_password text;
  v_full_name text;
  v_username text;
  v_user_id uuid;
  v_profile_id uuid;
begin
  select p.role
    into v_actor_role
  from public.profiles p
  where p.auth_user_id = auth.uid()
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;

  if v_actor_role is distinct from 'admin' then
    raise exception 'Solo un admin puede crear admins.'
      using errcode = '42501';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  v_password := coalesce(p_password, '');
  v_full_name := trim(coalesce(p_full_name, ''));
  v_username := trim(coalesce(p_username, ''));

  if v_email = '' or v_password = '' or v_full_name = '' or v_username = '' then
    raise exception 'Completá email, contraseña, nombre y usuario.'
      using errcode = '22023';
  end if;

  if not public.is_valid_person_name(v_full_name) then
    raise exception 'El nombre no cumple el formato permitido.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from auth.users u
    where lower(u.email) = v_email
  ) then
    raise exception 'Ya existe un usuario con ese email.'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.profiles p
    where lower(trim(p.email)) = v_email
  ) then
    raise exception 'Ya existe un perfil con ese email.'
      using errcode = '23505';
  end if;

  v_user_id := gen_random_uuid();
  v_profile_id := gen_random_uuid();

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(v_password, extensions.gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('full_name', v_full_name),
    now(),
    now()
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  insert into public.profiles (
    id,
    auth_user_id,
    full_name,
    email,
    username,
    province,
    role,
    account_status,
    created_at,
    updated_at
  ) values (
    v_profile_id,
    v_user_id,
    v_full_name,
    v_email,
    v_username,
    nullif(trim(coalesce(p_province, '')), ''),
    'admin',
    'active',
    now(),
    now()
  );

  return query
  select
    p.id::uuid,
    p.auth_user_id::uuid,
    p.full_name::text,
    p.email::text,
    p.username::text,
    p.province::text,
    p.role::text,
    coalesce(p.account_status, 'active')::text as account_status,
    p.created_at::timestamptz,
    p.updated_at::timestamptz
  from public.profiles p
  where p.id = v_profile_id;
end;
$$;

revoke all on function public.create_admin_account(text, text, text, text, text) from public;
grant execute on function public.create_admin_account(text, text, text, text, text) to authenticated;

create or replace function public.upsert_admin_profile(
  p_auth_user_id uuid,
  p_email text,
  p_full_name text,
  p_username text,
  p_province text default null
)
returns table (
  id uuid,
  auth_user_id uuid,
  full_name text,
  email text,
  username text,
  province text,
  role text,
  account_status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_role text;
  v_profile_id uuid;
  v_email text;
  v_full_name text;
  v_username text;
begin
  select p.role
    into v_actor_role
  from public.profiles p
  where p.auth_user_id = auth.uid()
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;

  if v_actor_role is distinct from 'admin' then
    raise exception 'Solo un admin puede crear admins.'
      using errcode = '42501';
  end if;

  if p_auth_user_id is null then
    raise exception 'Falta auth_user_id.'
      using errcode = '22023';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  v_full_name := trim(coalesce(p_full_name, ''));
  v_username := trim(coalesce(p_username, ''));

  if v_email = '' or v_full_name = '' or v_username = '' then
    raise exception 'Completá email, nombre y usuario.'
      using errcode = '22023';
  end if;

  if not public.is_valid_person_name(v_full_name) then
    raise exception 'El nombre no cumple el formato permitido.'
      using errcode = '22023';
  end if;

  select p.id
    into v_profile_id
  from public.profiles p
  where p.auth_user_id = p_auth_user_id
     or lower(trim(p.email)) = v_email
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;

  if v_profile_id is null then
    insert into public.profiles (
      auth_user_id,
      full_name,
      email,
      username,
      province,
      role,
      account_status,
      deleted_at,
      created_at,
      updated_at
    ) values (
      p_auth_user_id,
      v_full_name,
      v_email,
      v_username,
      nullif(trim(coalesce(p_province, '')), ''),
      'admin',
      'active',
      null,
      now(),
      now()
    )
    returning profiles.id into v_profile_id;
  else
    update public.profiles p
    set
      auth_user_id = p_auth_user_id,
      full_name = v_full_name,
      email = v_email,
      username = v_username,
      province = nullif(trim(coalesce(p_province, '')), ''),
      role = 'admin',
      account_status = 'active',
      deleted_at = null,
      updated_at = now()
    where p.id = v_profile_id;
  end if;

  return query
  select
    p.id::uuid,
    p.auth_user_id::uuid,
    p.full_name::text,
    p.email::text,
    p.username::text,
    p.province::text,
    p.role::text,
    coalesce(p.account_status, 'active')::text,
    p.created_at::timestamptz,
    p.updated_at::timestamptz
  from public.profiles p
  where p.id = v_profile_id;
end;
$$;

revoke all on function public.upsert_admin_profile(uuid, text, text, text, text) from public;
grant execute on function public.upsert_admin_profile(uuid, text, text, text, text) to authenticated;

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

  if not public.is_valid_person_name(coalesce(v_payload->>'reservationName', '')) then
    raise exception 'El nombre del titular no cumple el formato permitido.'
      using errcode = '22023';
  end if;

  if not public.is_valid_person_name(coalesce(v_payload->>'reservationLastName', '')) then
    raise exception 'El apellido del titular no cumple el formato permitido.'
      using errcode = '22023';
  end if;
  if nullif(v_payload->>'objective', '') is not null and not public.is_valid_text_with_numbers(v_payload->>'objective', 2, 50) then
    raise exception 'El objetivo no cumple el formato permitido.'
      using errcode = '22023';
  end if;
  if nullif(v_payload->>'shelterRoute', '') is not null and not public.is_valid_text_with_numbers(v_payload->>'shelterRoute', 3, 100) then
    raise exception 'La ruta no cumple el formato permitido.'
      using errcode = '22023';
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
    if not public.is_valid_person_name(coalesce(v_guest->>'firstName', '')) then
      raise exception 'El nombre de un huésped no cumple el formato permitido.'
        using errcode = '22023';
    end if;
    if not public.is_valid_person_name(coalesce(v_guest->>'lastName', '')) then
      raise exception 'El apellido de un huésped no cumple el formato permitido.'
        using errcode = '22023';
    end if;
    if nullif(v_guest->>'emergencyContactName', '') is not null and not public.is_valid_person_name(coalesce(v_guest->>'emergencyContactName', '')) then
      raise exception 'El nombre de contacto de emergencia no cumple el formato permitido.'
        using errcode = '22023';
    end if;
    if nullif(v_guest->>'trekkingNoticeEmergencyContactName', '') is not null and not public.is_valid_person_name(coalesce(v_guest->>'trekkingNoticeEmergencyContactName', '')) then
      raise exception 'El nombre de contacto de trekking no cumple el formato permitido.'
        using errcode = '22023';
    end if;

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

grant execute on function public.create_reservation_submission(jsonb) to authenticated;

commit;
