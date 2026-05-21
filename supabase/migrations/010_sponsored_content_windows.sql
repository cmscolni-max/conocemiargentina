begin;

alter table public.listings
  add column if not exists is_sponsored boolean not null default false,
  add column if not exists sponsored_start_date date,
  add column if not exists sponsored_end_date date;

alter table public.shops
  add column if not exists is_sponsored boolean not null default false,
  add column if not exists sponsored_start_date date,
  add column if not exists sponsored_end_date date;

create index if not exists idx_listings_sponsored_window
  on public.listings (sponsored_start_date, sponsored_end_date);

create index if not exists idx_shops_sponsored_window
  on public.shops (sponsored_start_date, sponsored_end_date);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_sponsored_window_check'
  ) then
    alter table public.listings
      add constraint listings_sponsored_window_check
      check (
        sponsored_start_date is null
        or sponsored_end_date is null
        or sponsored_start_date <= sponsored_end_date
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'shops_sponsored_window_check'
  ) then
    alter table public.shops
      add constraint shops_sponsored_window_check
      check (
        sponsored_start_date is null
        or sponsored_end_date is null
        or sponsored_start_date <= sponsored_end_date
      );
  end if;
end $$;

create or replace function public.sync_sponsored_content()
returns void
language plpgsql
as $$
begin
  update public.listings
  set is_sponsored = (
    is_active = true
    and status = 'published'
    and sponsored_start_date is not null
    and sponsored_end_date is not null
    and current_date between sponsored_start_date and sponsored_end_date
  );

  update public.shops
  set is_sponsored = (
    is_active = true
    and sponsored_start_date is not null
    and sponsored_end_date is not null
    and current_date between sponsored_start_date and sponsored_end_date
  );
end;
$$;

select public.sync_sponsored_content();

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception
    when insufficient_privilege then
      null;
  end;

  if exists (
    select 1
    from pg_namespace
    where nspname = 'cron'
  ) then
    if exists (
      select 1
      from cron.job
      where jobname = 'cumbre-sync-sponsored-content'
    ) then
      perform cron.unschedule(jobid)
      from cron.job
      where jobname = 'cumbre-sync-sponsored-content';
    end if;

    perform cron.schedule(
      'cumbre-sync-sponsored-content',
      '5 0 * * *',
      $job$select public.sync_sponsored_content();$job$
    );
  end if;
exception
  when undefined_table or undefined_function or insufficient_privilege then
    null;
end $$;

commit;
