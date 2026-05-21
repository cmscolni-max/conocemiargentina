begin;

create table if not exists public.noti_tips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  cover_image_url text not null,
  media_items jsonb not null default '[]'::jsonb,
  body_html text not null,
  body_text text not null,
  author_name text not null default 'Equipo Explorer',
  published_at timestamptz not null default now(),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint noti_tips_media_items_is_array check (jsonb_typeof(media_items) = 'array'),
  constraint noti_tips_media_items_max_4 check (jsonb_array_length(media_items) <= 4)
);

create index if not exists idx_noti_tips_published_at on public.noti_tips (published_at desc);
create index if not exists idx_noti_tips_is_published_published_at on public.noti_tips (is_published, published_at desc);

alter table public.noti_tips enable row level security;

grant select on public.noti_tips to anon;
grant select, insert, update, delete on public.noti_tips to authenticated;

-- Public read only published Noti-tips

drop policy if exists "noti tips public read" on public.noti_tips;
create policy "noti tips public read"
on public.noti_tips
for select
to anon, authenticated
using (is_published = true);

-- Admin full access

drop policy if exists "noti tips admin read" on public.noti_tips;
create policy "noti tips admin read"
on public.noti_tips
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

drop policy if exists "noti tips admin insert" on public.noti_tips;
create policy "noti tips admin insert"
on public.noti_tips
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.account_status, 'active') = 'active'
  )
);

drop policy if exists "noti tips admin update" on public.noti_tips;
create policy "noti tips admin update"
on public.noti_tips
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.account_status, 'active') = 'active'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.account_status, 'active') = 'active'
  )
);

drop policy if exists "noti tips admin delete" on public.noti_tips;
create policy "noti tips admin delete"
on public.noti_tips
for delete
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
