begin;

create or replace function public.current_chat_profile_ids()
returns uuid[]
language sql
security definer
set search_path = public, auth
as $$
  select coalesce(array_agg(distinct p.id), '{}'::uuid[])
  from public.profiles p
  where p.auth_user_id = auth.uid()
     or lower(coalesce(p.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.can_access_chat_thread(p_thread_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.chat_thread_participants ctp
    where ctp.thread_id = p_thread_id
      and ctp.profile_id = any(public.current_chat_profile_ids())
  );
$$;

drop policy if exists "chat_threads_select_participants" on public.chat_threads;
create policy "chat_threads_select_participants"
on public.chat_threads
for select
to authenticated
using (public.can_access_chat_thread(id));

drop policy if exists "chat_threads_update_participants" on public.chat_threads;
create policy "chat_threads_update_participants"
on public.chat_threads
for update
to authenticated
using (public.can_access_chat_thread(id))
with check (public.can_access_chat_thread(id));

drop policy if exists "chat_thread_participants_select_own_threads" on public.chat_thread_participants;
create policy "chat_thread_participants_select_own_threads"
on public.chat_thread_participants
for select
to authenticated
using (public.can_access_chat_thread(thread_id));

drop policy if exists "chat_thread_participants_insert_own_profile" on public.chat_thread_participants;
create policy "chat_thread_participants_insert_own_profile"
on public.chat_thread_participants
for insert
to authenticated
with check (
  profile_id = any(public.current_chat_profile_ids())
  or exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id
      and t.created_by_profile_id = any(public.current_chat_profile_ids())
  )
);

drop policy if exists "chat_thread_participants_update_own_row" on public.chat_thread_participants;
create policy "chat_thread_participants_update_own_row"
on public.chat_thread_participants
for update
to authenticated
using (
  profile_id = any(public.current_chat_profile_ids())
  or public.can_access_chat_thread(thread_id)
)
with check (
  profile_id = any(public.current_chat_profile_ids())
);

drop policy if exists "chat_messages_select_participants" on public.chat_messages;
create policy "chat_messages_select_participants"
on public.chat_messages
for select
to authenticated
using (public.can_access_chat_thread(thread_id));

drop policy if exists "chat_messages_insert_sender" on public.chat_messages;
create policy "chat_messages_insert_sender"
on public.chat_messages
for insert
to authenticated
with check (
  sender_profile_id = any(public.current_chat_profile_ids())
  and public.can_access_chat_thread(thread_id)
);

commit;
