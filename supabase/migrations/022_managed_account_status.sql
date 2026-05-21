begin;

alter table if exists public.profiles
  add column if not exists account_status text not null default 'active';

alter table if exists public.profiles
  add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_account_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('active', 'disabled', 'deleted'));
  end if;
end $$;

update public.profiles
set account_status = 'active'
where account_status is null;

create index if not exists idx_profiles_account_status
  on public.profiles (account_status);

commit;
