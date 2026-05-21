begin;

do $$
declare
  has_created_at boolean;
begin
  -- reservations: hot paths use listing/provider/creator + status + created_at
  if to_regclass('public.reservations') is not null then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'reservations'
        and column_name = 'created_at'
    ) into has_created_at;

    execute 'create index if not exists idx_reservations_status on public.reservations(status)';
    execute 'create index if not exists idx_reservations_listing_status on public.reservations(listing_id, status)';
    execute 'create index if not exists idx_reservations_provider_status on public.reservations(provider_user_id, status)';
    execute 'create index if not exists idx_reservations_creator_status on public.reservations(created_by_user_id, status)';

    if has_created_at then
      execute 'create index if not exists idx_reservations_status_created on public.reservations(status, created_at desc)';
      execute 'create index if not exists idx_reservations_listing_status_created on public.reservations(listing_id, status, created_at desc)';
      execute 'create index if not exists idx_reservations_provider_status_created on public.reservations(provider_user_id, status, created_at desc)';
      execute 'create index if not exists idx_reservations_creator_status_created on public.reservations(created_by_user_id, status, created_at desc)';
    end if;
  end if;

  -- profiles: heavy auth + role/status + admin ordering lookups
  if to_regclass('public.profiles') is not null then
    execute 'create index if not exists idx_profiles_auth_user on public.profiles(auth_user_id)';
    execute 'create index if not exists idx_profiles_role_status_auth on public.profiles(role, account_status, auth_user_id)';
    execute 'create index if not exists idx_profiles_email_ci_lookup on public.profiles(lower(trim(email)))';
    execute 'create index if not exists idx_profiles_role_updated_created on public.profiles(role, updated_at desc, created_at desc)';
  end if;

  -- notifications: inbox scans by recipient/is_read ordered by created_at
  if to_regclass('public.notifications') is not null then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'notifications'
        and column_name = 'is_read'
    ) into has_created_at;

    execute 'create index if not exists idx_notifications_recipient_created on public.notifications(recipient_user_id, created_at desc)';
    execute 'create index if not exists idx_notifications_actor_created on public.notifications(actor_user_id, created_at desc)';
    if has_created_at then
      execute 'create index if not exists idx_notifications_recipient_read_created on public.notifications(recipient_user_id, is_read, created_at desc)';
    end if;
  end if;

  -- posts + post_media: feed reads and join to media
  if to_regclass('public.posts') is not null then
    execute 'create index if not exists idx_posts_feed_created on public.posts(created_at desc)';
    execute 'create index if not exists idx_posts_author_feed_created on public.posts(author_user_id, created_at desc)';
  end if;

  if to_regclass('public.post_media') is not null then
    execute 'create index if not exists idx_post_media_post_lookup on public.post_media(post_id)';
    execute 'create index if not exists idx_post_media_post_sort_lookup on public.post_media(post_id, sort_order)';
  end if;

  -- shop branches + listing personal equipment: parent-child public reads via listing/shop id
  if to_regclass('public.shop_branches') is not null then
    execute 'create index if not exists idx_shop_branches_shop_lookup on public.shop_branches(shop_id)';
  end if;

  if to_regclass('public.listing_personal_equipment') is not null then
    execute 'create index if not exists idx_listing_personal_equipment_listing_lookup on public.listing_personal_equipment(listing_id)';
  end if;
end
$$;

commit;
