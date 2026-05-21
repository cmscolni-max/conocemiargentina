begin;

create extension if not exists pgcrypto;

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

commit;
