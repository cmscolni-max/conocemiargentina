begin;

alter table public.listings
  add column if not exists allow_enrollment boolean not null default false,
  add column if not exists is_accepting_enrollments boolean not null default false;

create index if not exists idx_listings_allow_enrollment
  on public.listings (allow_enrollment, is_accepting_enrollments);

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
  ),
  is_accepting_enrollments = (
    is_active = true
    and status = 'published'
    and listing_type <> 'refuge'
    and allow_enrollment = true
    and enrollment_start_date is not null
    and enrollment_end_date is not null
    and current_date between enrollment_start_date and enrollment_end_date
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

commit;
