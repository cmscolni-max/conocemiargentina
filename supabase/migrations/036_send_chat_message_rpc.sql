begin;

create or replace function public.send_chat_message(
  p_thread_id uuid,
  p_body text
)
returns table (
  id uuid,
  thread_id uuid,
  sender_profile_id uuid,
  body text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_current_profile_id uuid;
  v_message_id uuid;
  v_body text;
  v_created_at timestamptz;
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

  v_body := trim(coalesce(p_body, ''));
  if p_thread_id is null or v_body = '' then
    raise exception 'Mensaje inválido.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.chat_thread_participants ctp
    where ctp.thread_id = p_thread_id
      and ctp.profile_id = v_current_profile_id
  ) then
    raise exception 'No participás en esta conversación.'
      using errcode = '42501';
  end if;

  insert into public.chat_messages (
    thread_id,
    sender_profile_id,
    body,
    message_type
  ) values (
    p_thread_id,
    v_current_profile_id,
    v_body,
    'text'
  )
  returning chat_messages.id, chat_messages.created_at
    into v_message_id, v_created_at;

  update public.chat_threads
  set
    last_message_at = v_created_at,
    last_message_preview = left(v_body, 140)
  where chat_threads.id = p_thread_id;

  update public.chat_thread_participants
  set last_read_at = v_created_at
  where chat_thread_participants.thread_id = p_thread_id
    and chat_thread_participants.profile_id = v_current_profile_id;

  return query
  select
    v_message_id,
    p_thread_id,
    v_current_profile_id,
    v_body,
    v_created_at;
end;
$$;

revoke all on function public.send_chat_message(uuid, text) from public;
grant execute on function public.send_chat_message(uuid, text) to authenticated;

commit;
