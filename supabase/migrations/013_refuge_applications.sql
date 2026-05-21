begin;

create table if not exists public.refuge_applications (
  id text primary key,
  listing_id uuid not null unique references public.listings(id) on delete cascade,
  title text not null,
  provider_name text,
  province text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_refuge_applications_status
  on public.refuge_applications (status, submitted_at desc);

alter table public.refuge_applications enable row level security;

drop policy if exists refuge_applications_select on public.refuge_applications;
create policy refuge_applications_select on public.refuge_applications
for select
to anon, authenticated
using (true);

drop policy if exists refuge_applications_insert on public.refuge_applications;
create policy refuge_applications_insert on public.refuge_applications
for insert
to anon, authenticated
with check (true);

drop policy if exists refuge_applications_update on public.refuge_applications;
create policy refuge_applications_update on public.refuge_applications
for update
to anon, authenticated
using (true)
with check (true);

insert into public.refuge_applications (
  id,
  listing_id,
  title,
  provider_name,
  province,
  status,
  submitted_at,
  reviewed_at,
  created_at,
  updated_at
)
select
  'refuge-app-' || l.id::text,
  l.id,
  coalesce(l.title, 'Refugio'),
  coalesce(l.organizer_name, p.full_name, 'Prestador'),
  l.province,
  case
    when l.status = 'published' then 'approved'
    when l.status = 'archived' then 'rejected'
    else 'pending'
  end,
  coalesce(l.created_at, now()),
  case
    when l.status in ('published', 'archived') then coalesce(l.updated_at, l.created_at, now())
    else null
  end,
  coalesce(l.created_at, now()),
  coalesce(l.updated_at, l.created_at, now())
from public.listings l
left join public.profiles p
  on p.id = l.provider_user_id
where l.listing_type = 'refuge'
on conflict (listing_id) do nothing;

commit;
