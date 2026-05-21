begin;

create or replace function public.sync_sponsored_content()
returns void
language plpgsql
as $$
declare
  local_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  update public.listings
  set is_sponsored = (
    is_active = true
    and status = 'published'
    and sponsored_start_date is not null
    and sponsored_end_date is not null
    and local_today between sponsored_start_date and sponsored_end_date
  ),
  is_accepting_enrollments = (
    is_active = true
    and status = 'published'
    and listing_type <> 'refuge'
    and allow_enrollment = true
    and enrollment_start_date is not null
    and enrollment_end_date is not null
    and local_today between enrollment_start_date and enrollment_end_date
  );

  update public.shops
  set is_sponsored = (
    is_active = true
    and sponsored_start_date is not null
    and sponsored_end_date is not null
    and local_today between sponsored_start_date and sponsored_end_date
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

  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'cumbre-sync-sponsored-content') then
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
