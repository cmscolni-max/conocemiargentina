begin;

grant select, insert, update, delete on public.listings to authenticated;
grant select, insert, update, delete on public.listing_refuge_details to authenticated;
grant select, insert, update, delete on public.listing_activity_details to authenticated;
grant select, insert, update, delete on public.listing_expedition_details to authenticated;
grant select, insert, update, delete on public.listing_media to authenticated;
grant select, insert, update, delete on public.listing_amenities to authenticated;
grant select, insert, update, delete on public.listing_personal_equipment to authenticated;
grant select, insert, update, delete on public.listing_reservation_requirements to authenticated;
grant select, insert, update, delete on public.shops to authenticated;
grant select, insert, update, delete on public.shop_media to authenticated;
grant select, insert, update, delete on public.shop_branches to authenticated;
grant select, insert, update, delete on public.reservations to authenticated;
grant select, insert, update, delete on public.reservation_members to authenticated;

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
alter table if exists public.reservations enable row level security;
alter table if exists public.reservation_members enable row level security;

drop policy if exists listings_owner_manage on public.listings;
create policy listings_owner_manage on public.listings
for all to authenticated
using (true)
with check (true);

drop policy if exists listing_refuge_details_owner_manage on public.listing_refuge_details;
create policy listing_refuge_details_owner_manage on public.listing_refuge_details
for all to authenticated
using (true)
with check (true);

drop policy if exists listing_activity_details_owner_manage on public.listing_activity_details;
create policy listing_activity_details_owner_manage on public.listing_activity_details
for all to authenticated
using (true)
with check (true);

drop policy if exists listing_expedition_details_owner_manage on public.listing_expedition_details;
create policy listing_expedition_details_owner_manage on public.listing_expedition_details
for all to authenticated
using (true)
with check (true);

drop policy if exists listing_media_owner_manage on public.listing_media;
create policy listing_media_owner_manage on public.listing_media
for all to authenticated
using (true)
with check (true);

drop policy if exists listing_amenities_owner_manage on public.listing_amenities;
create policy listing_amenities_owner_manage on public.listing_amenities
for all to authenticated
using (true)
with check (true);

drop policy if exists listing_personal_equipment_owner_manage on public.listing_personal_equipment;
create policy listing_personal_equipment_owner_manage on public.listing_personal_equipment
for all to authenticated
using (true)
with check (true);

drop policy if exists listing_reservation_requirements_owner_manage on public.listing_reservation_requirements;
create policy listing_reservation_requirements_owner_manage on public.listing_reservation_requirements
for all to authenticated
using (true)
with check (true);

drop policy if exists shops_owner_manage on public.shops;
create policy shops_owner_manage on public.shops
for all to authenticated
using (true)
with check (true);

drop policy if exists shop_media_owner_manage on public.shop_media;
create policy shop_media_owner_manage on public.shop_media
for all to authenticated
using (true)
with check (true);

drop policy if exists shop_branches_owner_manage on public.shop_branches;
create policy shop_branches_owner_manage on public.shop_branches
for all to authenticated
using (true)
with check (true);

drop policy if exists reservations_participants_read on public.reservations;
create policy reservations_participants_read on public.reservations
for select to anon, authenticated
using (true);

drop policy if exists reservations_creator_insert on public.reservations;
create policy reservations_creator_insert on public.reservations
for insert to authenticated
with check (true);

drop policy if exists reservations_owner_update on public.reservations;
create policy reservations_owner_update on public.reservations
for update to authenticated
using (true)
with check (true);

drop policy if exists reservations_owner_delete on public.reservations;
create policy reservations_owner_delete on public.reservations
for delete to authenticated
using (true);

drop policy if exists reservation_members_related_read on public.reservation_members;
create policy reservation_members_related_read on public.reservation_members
for select to anon, authenticated
using (true);

drop policy if exists reservation_members_related_insert on public.reservation_members;
create policy reservation_members_related_insert on public.reservation_members
for insert to authenticated
with check (true);

drop policy if exists reservation_members_related_update on public.reservation_members;
create policy reservation_members_related_update on public.reservation_members
for update to authenticated
using (true)
with check (true);

drop policy if exists reservation_members_related_delete on public.reservation_members;
create policy reservation_members_related_delete on public.reservation_members
for delete to authenticated
using (true);

commit;
