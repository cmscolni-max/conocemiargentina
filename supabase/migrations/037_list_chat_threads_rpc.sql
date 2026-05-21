begin;

create or replace function public.list_chat_threads_for_current_user()
returns table (
  id uuid,
  created_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer,
  participants jsonb
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

  return query
  with my_threads as (
    select distinct ctp.thread_id
    from public.chat_thread_participants ctp
    where ctp.profile_id = any(v_profile_ids)
  ),
  my_reads as (
    select
      ctp.thread_id,
      max(coalesce(ctp.last_read_at, to_timestamp(0))) as last_read_at
    from public.chat_thread_participants ctp
    where ctp.profile_id = any(v_profile_ids)
    group by ctp.thread_id
  ),
  unread as (
    select
      m.thread_id,
      count(*)::integer as unread_count
    from public.chat_messages m
    join my_threads mt on mt.thread_id = m.thread_id
    left join my_reads mr on mr.thread_id = m.thread_id
    where m.deleted_at is null
      and not (m.sender_profile_id = any(v_profile_ids))
      and m.created_at > coalesce(mr.last_read_at, to_timestamp(0))
    group by m.thread_id
  ),
  participant_rows as (
    select
      ctp.thread_id,
      jsonb_agg(
        jsonb_build_object(
          'profile_id', p.id,
          'full_name', coalesce(p.full_name, 'Usuario'),
          'avatar_url', p.avatar_url,
          'role', p.role
        )
        order by coalesce(p.full_name, 'Usuario')
      ) as participants
    from public.chat_thread_participants ctp
    join public.profiles p on p.id = ctp.profile_id
    join my_threads mt on mt.thread_id = ctp.thread_id
    group by ctp.thread_id
  )
  select
    t.id,
    t.created_at,
    t.last_message_at,
    t.last_message_preview,
    coalesce(u.unread_count, 0) as unread_count,
    coalesce(pr.participants, '[]'::jsonb) as participants
  from public.chat_threads t
  join my_threads mt on mt.thread_id = t.id
  left join unread u on u.thread_id = t.id
  left join participant_rows pr on pr.thread_id = t.id
  order by coalesce(t.last_message_at, t.created_at) desc, t.created_at desc;
end;
$$;

revoke all on function public.list_chat_threads_for_current_user() from public;
grant execute on function public.list_chat_threads_for_current_user() to authenticated;

commit;
