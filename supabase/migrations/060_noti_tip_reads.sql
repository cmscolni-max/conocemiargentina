begin;

create table if not exists public.noti_tip_reads (
  id uuid primary key default gen_random_uuid(),
  noti_tip_id uuid not null references public.noti_tips(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint noti_tip_reads_unique unique (noti_tip_id, profile_id)
);

create index if not exists idx_noti_tip_reads_tip on public.noti_tip_reads (noti_tip_id, read_at desc);
create index if not exists idx_noti_tip_reads_profile on public.noti_tip_reads (profile_id, read_at desc);

create or replace function public.set_noti_tip_reads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_noti_tip_reads_updated_at on public.noti_tip_reads;
create trigger trg_noti_tip_reads_updated_at
before update on public.noti_tip_reads
for each row execute function public.set_noti_tip_reads_updated_at();

alter table public.noti_tip_reads enable row level security;

grant select, insert, update on public.noti_tip_reads to authenticated;

-- Users can read and upsert their own read state

drop policy if exists "noti tip reads self select" on public.noti_tip_reads;
create policy "noti tip reads self select"
on public.noti_tip_reads
for select
to authenticated
using (
  profile_id = public.current_profile_id()
);

drop policy if exists "noti tip reads self insert" on public.noti_tip_reads;
create policy "noti tip reads self insert"
on public.noti_tip_reads
for insert
to authenticated
with check (
  profile_id = public.current_profile_id()
);

drop policy if exists "noti tip reads self update" on public.noti_tip_reads;
create policy "noti tip reads self update"
on public.noti_tip_reads
for update
to authenticated
using (
  profile_id = public.current_profile_id()
)
with check (
  profile_id = public.current_profile_id()
);

-- Admin/reporting read access

drop policy if exists "noti tip reads admin select" on public.noti_tip_reads;
create policy "noti tip reads admin select"
on public.noti_tip_reads
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.account_status, 'active') = 'active'
  )
);

commit;
