begin;

-- Favorites for explorer/provider saved items
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('listing', 'shop')),
  entity_id uuid not null,
  namespace text not null default 'cumbre',
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create index if not exists idx_favorites_user on public.favorites(user_id);
create index if not exists idx_favorites_entity on public.favorites(entity_type, entity_id);

alter table public.favorites enable row level security;

drop policy if exists favorites_select_own on public.favorites;
create policy favorites_select_own on public.favorites
for select to authenticated
using (user_id = public.current_profile_id());

drop policy if exists favorites_manage_own on public.favorites;
create policy favorites_manage_own on public.favorites
for all to authenticated
using (user_id = public.current_profile_id())
with check (user_id = public.current_profile_id());

-- Bridge columns used by current frontend while migration to normalized model completes
alter table public.listings add column if not exists organizer_name text;
alter table public.listings add column if not exists guided_by_name text;
alter table public.listings add column if not exists rules_json text;
alter table public.listings add column if not exists latitude double precision;
alter table public.listings add column if not exists longitude double precision;

alter table public.shops add column if not exists specialty text;
alter table public.shops add column if not exists image_url text;
alter table public.shops add column if not exists latitude double precision;
alter table public.shops add column if not exists longitude double precision;

alter table public.reservations add column if not exists reservation_name text;
alter table public.reservations add column if not exists reservation_last_name text;
alter table public.reservations add column if not exists reservation_user text;
alter table public.reservations add column if not exists email text;
alter table public.reservations add column if not exists phone text;
alter table public.reservations add column if not exists medical_certificate_file_name text;
alter table public.reservations add column if not exists total_amount numeric(12,2);
alter table public.reservations add column if not exists created_by_handle text;

alter table public.reservation_members add column if not exists app_user_handle text;
alter table public.reservation_members add column if not exists health_declaration_answers jsonb;

commit;

