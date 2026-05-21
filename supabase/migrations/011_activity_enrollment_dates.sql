begin;

alter table public.listings
  add column if not exists enrollment_start_date date,
  add column if not exists enrollment_end_date date;

create index if not exists idx_listings_enrollment_dates
  on public.listings (enrollment_start_date, enrollment_end_date);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_enrollment_window_check'
  ) then
    alter table public.listings
      add constraint listings_enrollment_window_check
      check (
        enrollment_start_date is null
        or enrollment_end_date is null
        or enrollment_start_date <= enrollment_end_date
      );
  end if;
end $$;

commit;
