begin;

-- Ensure RLS is enabled where app reads data
alter table if exists public.listings enable row level security;
alter table if exists public.listing_refuge_details enable row level security;
alter table if exists public.listing_activity_details enable row level security;
alter table if exists public.listing_expedition_details enable row level security;
alter table if exists public.listing_media enable row level security;
alter table if exists public.listing_amenities enable row level security;
alter table if exists public.listing_personal_equipment enable row level security;
alter table if exists public.listing_reservation_requirements enable row level security;
alter table if exists public.shops enable row level security;
alter table if exists public.shop_media enable row level security;
alter table if exists public.shop_branches enable row level security;
alter table if exists public.posts enable row level security;
alter table if exists public.post_media enable row level security;

-- Listings visible only when published + active
drop policy if exists listings_public_read on public.listings;
create policy listings_public_read on public.listings
for select
to anon, authenticated
using (status = 'published' and coalesce(is_active, false) = true);

-- Listing children visible only if parent listing is visible
drop policy if exists listing_refuge_details_public_read on public.listing_refuge_details;
create policy listing_refuge_details_public_read on public.listing_refuge_details
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_refuge_details.listing_id
      and l.status = 'published'
      and coalesce(l.is_active, false) = true
  )
);

drop policy if exists listing_activity_details_public_read on public.listing_activity_details;
create policy listing_activity_details_public_read on public.listing_activity_details
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_activity_details.listing_id
      and l.status = 'published'
      and coalesce(l.is_active, false) = true
  )
);

drop policy if exists listing_expedition_details_public_read on public.listing_expedition_details;
create policy listing_expedition_details_public_read on public.listing_expedition_details
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_expedition_details.listing_id
      and l.status = 'published'
      and coalesce(l.is_active, false) = true
  )
);

drop policy if exists listing_media_public_read on public.listing_media;
create policy listing_media_public_read on public.listing_media
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_media.listing_id
      and l.status = 'published'
      and coalesce(l.is_active, false) = true
  )
);

drop policy if exists listing_amenities_public_read on public.listing_amenities;
create policy listing_amenities_public_read on public.listing_amenities
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_amenities.listing_id
      and l.status = 'published'
      and coalesce(l.is_active, false) = true
  )
);

drop policy if exists listing_personal_equipment_public_read on public.listing_personal_equipment;
create policy listing_personal_equipment_public_read on public.listing_personal_equipment
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_personal_equipment.listing_id
      and l.status = 'published'
      and coalesce(l.is_active, false) = true
  )
);

drop policy if exists listing_reservation_requirements_public_read on public.listing_reservation_requirements;
create policy listing_reservation_requirements_public_read on public.listing_reservation_requirements
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_reservation_requirements.listing_id
      and l.status = 'published'
      and coalesce(l.is_active, false) = true
  )
);

-- Shops visible only when active
drop policy if exists shops_public_read on public.shops;
create policy shops_public_read on public.shops
for select
to anon, authenticated
using (coalesce(is_active, false) = true);

drop policy if exists shop_media_public_read on public.shop_media;
create policy shop_media_public_read on public.shop_media
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.shops s
    where s.id = shop_media.shop_id
      and coalesce(s.is_active, false) = true
  )
);

drop policy if exists shop_branches_public_read on public.shop_branches;
create policy shop_branches_public_read on public.shop_branches
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.shops s
    where s.id = shop_branches.shop_id
      and coalesce(s.is_active, false) = true
  )
);

-- Social feed read
drop policy if exists posts_public_read on public.posts;
create policy posts_public_read on public.posts
for select
to anon, authenticated
using (true);

drop policy if exists post_media_public_read on public.post_media;
create policy post_media_public_read on public.post_media
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_media.post_id
  )
);

commit;
