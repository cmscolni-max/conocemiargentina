-- Pre-booking availability checks for shelter bookings.

create table if not exists public.booking_availability_checks (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  provider_user_id uuid not null references public.profiles(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id) on delete cascade,
  explorer_handle text not null,
  date_from date not null,
  date_to date not null,
  people_count integer not null check (people_count > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  provider_message text,
  reviewed_at timestamptz,
  linked_reservation_id uuid references public.reservations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_availability_checks_date_order check (date_to >= date_from)
);

alter table public.reservations
  add column if not exists availability_check_id uuid references public.booking_availability_checks(id) on delete set null;

create index if not exists idx_booking_availability_checks_provider on public.booking_availability_checks(provider_user_id, status, created_at desc);
create index if not exists idx_booking_availability_checks_creator on public.booking_availability_checks(created_by_user_id, status, created_at desc);
create index if not exists idx_booking_availability_checks_listing on public.booking_availability_checks(listing_id, status, date_from, date_to);

create or replace function public.set_booking_availability_checks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_booking_availability_checks_updated_at on public.booking_availability_checks;
create trigger trg_booking_availability_checks_updated_at
before update on public.booking_availability_checks
for each row execute function public.set_booking_availability_checks_updated_at();

alter table public.booking_availability_checks enable row level security;

drop policy if exists booking_availability_checks_select on public.booking_availability_checks;
create policy booking_availability_checks_select
on public.booking_availability_checks
for select
using (
  created_by_user_id = public.current_profile_id()
  or provider_user_id = public.current_profile_id()
);

drop policy if exists booking_availability_checks_insert on public.booking_availability_checks;
create policy booking_availability_checks_insert
on public.booking_availability_checks
for insert
with check (
  created_by_user_id = public.current_profile_id()
);

drop policy if exists booking_availability_checks_update_provider on public.booking_availability_checks;
create policy booking_availability_checks_update_provider
on public.booking_availability_checks
for update
using (
  provider_user_id = public.current_profile_id()
)
with check (
  provider_user_id = public.current_profile_id()
);

revoke all on public.booking_availability_checks from anon;
revoke all on public.booking_availability_checks from authenticated;
grant select, insert, update on public.booking_availability_checks to authenticated;
