begin;

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  created_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_thread_participants (
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  is_muted boolean not null default false,
  is_archived boolean not null default false,
  primary key (thread_id, profile_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  message_type text not null default 'text',
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists chat_thread_participants_unique_pair_idx
  on public.chat_thread_participants(thread_id, profile_id);

create index if not exists chat_thread_participants_profile_idx
  on public.chat_thread_participants(profile_id, thread_id);

create index if not exists chat_messages_thread_created_idx
  on public.chat_messages(thread_id, created_at desc);

alter table public.chat_threads enable row level security;
alter table public.chat_thread_participants enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "chat_threads_select_participants" on public.chat_threads;
create policy "chat_threads_select_participants"
on public.chat_threads
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_thread_participants ctp
    join public.profiles p on p.id = ctp.profile_id
    where ctp.thread_id = chat_threads.id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "chat_threads_insert_creator" on public.chat_threads;
create policy "chat_threads_insert_creator"
on public.chat_threads
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = created_by_profile_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "chat_threads_update_participants" on public.chat_threads;
create policy "chat_threads_update_participants"
on public.chat_threads
for update
to authenticated
using (
  exists (
    select 1
    from public.chat_thread_participants ctp
    join public.profiles p on p.id = ctp.profile_id
    where ctp.thread_id = chat_threads.id
      and p.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.chat_thread_participants ctp
    join public.profiles p on p.id = ctp.profile_id
    where ctp.thread_id = chat_threads.id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "chat_thread_participants_select_own_threads" on public.chat_thread_participants;
create policy "chat_thread_participants_select_own_threads"
on public.chat_thread_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_thread_participants self_ctp
    join public.profiles p on p.id = self_ctp.profile_id
    where self_ctp.thread_id = chat_thread_participants.thread_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "chat_thread_participants_insert_own_profile" on public.chat_thread_participants;
create policy "chat_thread_participants_insert_own_profile"
on public.chat_thread_participants
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = profile_id
      and p.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.chat_threads t
    join public.profiles p on p.id = t.created_by_profile_id
    where t.id = thread_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "chat_thread_participants_update_own_row" on public.chat_thread_participants;
create policy "chat_thread_participants_update_own_row"
on public.chat_thread_participants
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = profile_id
      and p.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = profile_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "chat_messages_select_participants" on public.chat_messages;
create policy "chat_messages_select_participants"
on public.chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_thread_participants ctp
    join public.profiles p on p.id = ctp.profile_id
    where ctp.thread_id = chat_messages.thread_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "chat_messages_insert_sender" on public.chat_messages;
create policy "chat_messages_insert_sender"
on public.chat_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = sender_profile_id
      and p.auth_user_id = auth.uid()
  )
  and exists (
    select 1
    from public.chat_thread_participants ctp
    where ctp.thread_id = chat_messages.thread_id
      and ctp.profile_id = chat_messages.sender_profile_id
  )
);

commit;
