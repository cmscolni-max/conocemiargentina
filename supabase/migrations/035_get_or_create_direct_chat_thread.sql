begin;

create or replace function public.get_or_create_direct_chat_thread(
  p_other_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_current_profile_id uuid;
  v_thread_id uuid;
begin
  select p.id
    into v_current_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;

  if v_current_profile_id is null then
    raise exception 'Perfil autenticado no encontrado.'
      using errcode = '42501';
  end if;

  if p_other_profile_id is null or p_other_profile_id = v_current_profile_id then
    raise exception 'Destino de chat inválido.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_other_profile_id
  ) then
    raise exception 'Perfil destino no encontrado.'
      using errcode = '22023';
  end if;

  select ctp.thread_id
    into v_thread_id
  from public.chat_thread_participants ctp
  where ctp.profile_id in (v_current_profile_id, p_other_profile_id)
  group by ctp.thread_id
  having count(distinct ctp.profile_id) = 2
     and count(*) = 2
  order by max(ctp.joined_at) desc
  limit 1;

  if v_thread_id is not null then
    return v_thread_id;
  end if;

  insert into public.chat_threads (
    created_by_profile_id,
    last_message_preview
  ) values (
    v_current_profile_id,
    ''
  )
  returning id into v_thread_id;

  insert into public.chat_thread_participants (
    thread_id,
    profile_id,
    last_read_at
  ) values (
    v_thread_id,
    v_current_profile_id,
    now()
  );

  insert into public.chat_thread_participants (
    thread_id,
    profile_id
  ) values (
    v_thread_id,
    p_other_profile_id
  );

  return v_thread_id;
end;
$$;

revoke all on function public.get_or_create_direct_chat_thread(uuid) from public;
grant execute on function public.get_or_create_direct_chat_thread(uuid) to authenticated;

commit;
