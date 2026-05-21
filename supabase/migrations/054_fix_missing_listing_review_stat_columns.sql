begin;

alter table if exists public.listings
  add column if not exists reviews_count integer not null default 0;

alter table if exists public.listings
  add column if not exists rating numeric(3,1) not null default 0;

update public.listings l
set
  reviews_count = coalesce(r.review_count, 0),
  rating = coalesce(r.average_rating, 0)
from (
  select
    listing_id,
    count(*)::integer as review_count,
    round(coalesce(avg(rating), 0)::numeric, 1) as average_rating
  from public.listing_reviews
  group by listing_id
) r
where l.id = r.listing_id;

update public.listings
set
  reviews_count = coalesce(reviews_count, 0),
  rating = coalesce(rating, 0)
where reviews_count is null or rating is null;

commit;
