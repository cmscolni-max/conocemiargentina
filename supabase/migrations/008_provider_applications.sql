begin;

create table if not exists public.provider_applications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  province text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_provider_applications_email
  on public.provider_applications (lower(trim(email)));

alter table public.provider_applications enable row level security;

drop policy if exists provider_applications_select on public.provider_applications;
create policy provider_applications_select on public.provider_applications
for select to authenticated
using (true);

drop policy if exists provider_applications_insert on public.provider_applications;
create policy provider_applications_insert on public.provider_applications
for insert to authenticated
with check (true);

drop policy if exists provider_applications_update on public.provider_applications;
create policy provider_applications_update on public.provider_applications
for update to authenticated
using (true)
with check (true);

create or replace function public.set_provider_application_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_provider_applications_updated_at on public.provider_applications;
create trigger trg_provider_applications_updated_at
before update on public.provider_applications
for each row execute function public.set_provider_application_updated_at();

commit;
