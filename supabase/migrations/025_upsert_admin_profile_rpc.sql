begin;

alter table if exists public.profiles
  add column if not exists account_status text not null default 'active';

alter table if exists public.profiles
  add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_account_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('active', 'disabled', 'deleted'));
  end if;
end $$;

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

commit;
