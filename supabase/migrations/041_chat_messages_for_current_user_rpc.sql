begin;

create or replace function public.list_chat_messages_for_current_user(
  p_thread_id uuid
)
returns table (
  id uuid,
  thread_id uuid,
  sender_profile_id uuid,
  body text,
  created_at timestamptz,
  sender_full_name text,
  sender_avatar_url text,
  sender_role text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile_ids uuid[];
  v_auth_email text;
  v_current_profile_email text;
begin
  if p_thread_id is null then
    raise exception 'Conversación inválida.'
      using errcode = '22023';
  end if;

  v_auth_email := lower(nullif(auth.jwt() ->> 'email', ''));
  v_current_profile_email := null;

  select lower(nullif(p.email, ''))
    into v_current_profile_email
  from public.profiles p
  where p.auth_user_id = auth.uid()
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;

  select coalesce(array_agg(distinct p.id), '{}'::uuid[])
    into v_profile_ids
  from public.profiles p
  where p.auth_user_id = auth.uid()
     or (v_auth_email is not null and lower(coalesce(p.email, '')) = v_auth_email)
     or (v_current_profile_email is not null and lower(coalesce(p.email, '')) = v_current_profile_email);

  if coalesce(array_length(v_profile_ids, 1), 0) = 0 then
    raise exception 'Perfil autenticado no encontrado.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.chat_thread_participants ctp
    where ctp.thread_id = p_thread_id
      and ctp.profile_id = any(v_profile_ids)
  ) then
    raise exception 'No participás en esta conversación.'
      using errcode = '42501';
  end if;

  return query
  select
    m.id,
    m.thread_id,
    m.sender_profile_id,
    m.body,
    m.created_at,
    coalesce(p.full_name, 'Usuario') as sender_full_name,
    p.avatar_url as sender_avatar_url,
    p.role as sender_role
  from public.chat_messages m
  left join public.profiles p on p.id = m.sender_profile_id
  where m.thread_id = p_thread_id
    and m.deleted_at is null
  order by m.created_at asc;
end;
$$;

revoke all on function public.list_chat_messages_for_current_user(uuid) from public;
grant execute on function public.list_chat_messages_for_current_user(uuid) to authenticated;

create or replace function public.mark_chat_thread_read_for_current_user(
  p_thread_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile_ids uuid[];
  v_auth_email text;
  v_current_profile_email text;
begin
  if p_thread_id is null then
    raise exception 'Conversación inválida.'
      using errcode = '22023';
  end if;

  v_auth_email := lower(nullif(auth.jwt() ->> 'email', ''));
  v_current_profile_email := null;

  select lower(nullif(p.email, ''))
    into v_current_profile_email
  from public.profiles p
  where p.auth_user_id = auth.uid()
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;

  select coalesce(array_agg(distinct p.id), '{}'::uuid[])
    into v_profile_ids
  from public.profiles p
  where p.auth_user_id = auth.uid()
     or (v_auth_email is not null and lower(coalesce(p.email, '')) = v_auth_email)
     or (v_current_profile_email is not null and lower(coalesce(p.email, '')) = v_current_profile_email);

  if coalesce(array_length(v_profile_ids, 1), 0) = 0 then
    raise exception 'Perfil autenticado no encontrado.'
      using errcode = '42501';
  end if;

  update public.chat_thread_participants
  set last_read_at = now()
  where thread_id = p_thread_id
    and profile_id = any(v_profile_ids);
end;
$$;

revoke all on function public.mark_chat_thread_read_for_current_user(uuid) from public;
grant execute on function public.mark_chat_thread_read_for_current_user(uuid) to authenticated;

commit;
