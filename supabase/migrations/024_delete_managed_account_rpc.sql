begin;

alter table if exists public.profiles
  add column if not exists account_status text not null default 'active';

alter table if exists public.profiles
  add column if not exists deleted_at timestamptz;

alter table if exists public.profiles
  add column if not exists original_email text;

alter table if exists public.profiles
  add column if not exists original_username text;

alter table if exists public.profiles
  add column if not exists original_full_name text;

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

create or replace function public.delete_managed_account(
  p_profile_id uuid
)
returns table (
  id uuid,
  auth_user_id uuid,
  full_name text,
  email text,
  username text,
  original_full_name text,
  original_email text,
  original_username text,
  province text,
  role text,
  account_status text,
  created_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_profile public.profiles%rowtype;
  v_target public.profiles%rowtype;
  v_now timestamptz := now();
  v_email_alias text;
  v_username_alias text;
begin
  select *
    into v_actor_profile
  from public.profiles p
  where p.auth_user_id = auth.uid()
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;

  if v_actor_profile.role is distinct from 'admin' then
    raise exception 'Solo un admin puede eliminar usuarios.'
      using errcode = '42501';
  end if;

  if p_profile_id is null then
    raise exception 'Falta el usuario a eliminar.'
      using errcode = '22023';
  end if;

  select *
    into v_target
  from public.profiles p
  where p.id = p_profile_id
  limit 1;

  if v_target.id is null then
    raise exception 'No encontramos ese usuario.'
      using errcode = 'P0002';
  end if;

  if v_actor_profile.id = v_target.id then
    raise exception 'No podés eliminar tu propia cuenta desde el portal.'
      using errcode = '42501';
  end if;

  v_email_alias := format(
    'deleted+%s+%s@cumbre.local',
    extract(epoch from v_now)::bigint,
    left(v_target.id::text, 8)
  );
  v_username_alias := left(
    coalesce(nullif(v_target.username, ''), 'usuario') || '__deleted__' || extract(epoch from v_now)::bigint::text,
    64
  );

  update public.profiles as p
  set
    auth_user_id = null,
    original_full_name = coalesce(nullif(p.original_full_name, ''), v_target.full_name),
    original_email = coalesce(nullif(p.original_email, ''), v_target.email),
    original_username = coalesce(nullif(p.original_username, ''), v_target.username),
    email = v_email_alias,
    username = v_username_alias,
    account_status = 'deleted',
    deleted_at = v_now,
    updated_at = v_now
  where p.id = v_target.id;

  if v_target.auth_user_id is not null then
    delete from auth.identities i
    where i.user_id = v_target.auth_user_id;

    delete from auth.users u
    where u.id = v_target.auth_user_id;
  end if;

  return query
  select
    p.id::uuid,
    p.auth_user_id::uuid,
    p.full_name::text,
    p.email::text,
    p.username::text,
    p.original_full_name::text,
    p.original_email::text,
    p.original_username::text,
    p.province::text,
    p.role::text,
    coalesce(p.account_status, 'active')::text as account_status,
    p.created_at::timestamptz,
    p.deleted_at::timestamptz,
    p.updated_at::timestamptz
  from public.profiles p
  where p.id = v_target.id;
end;
$$;

revoke all on function public.delete_managed_account(uuid) from public;
grant execute on function public.delete_managed_account(uuid) to authenticated;

commit;
