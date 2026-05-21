begin;

-- Profiles (used by many RLS policies and admin lookups)
do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'create index if not exists idx_profiles_auth_user_id on public.profiles(auth_user_id)';
    execute 'create index if not exists idx_profiles_role_status on public.profiles(role, account_status)';
    execute 'create index if not exists idx_profiles_email_lower on public.profiles(lower(trim(email)))';
    execute 'create index if not exists idx_profiles_updated_created on public.profiles(updated_at desc, created_at desc)';
  end if;
end
$$;

-- Posts and social engagement
do $$
begin
  if to_regclass('public.posts') is not null then
    execute 'create index if not exists idx_posts_created_at on public.posts(created_at desc)';
    execute 'create index if not exists idx_posts_author_created on public.posts(author_user_id, created_at desc)';
  end if;

  if to_regclass('public.post_media') is not null then
    execute 'create index if not exists idx_post_media_post_sort on public.post_media(post_id, sort_order)';
  end if;

  if to_regclass('public.post_comments') is not null then
    execute 'create index if not exists idx_post_comments_post_created on public.post_comments(post_id, created_at desc)';
    execute 'create index if not exists idx_post_comments_author on public.post_comments(author_user_id)';
  end if;

  if to_regclass('public.post_likes') is not null then
    execute 'create index if not exists idx_post_likes_user_post on public.post_likes(user_id, post_id)';
    execute 'create index if not exists idx_post_likes_post on public.post_likes(post_id)';
  end if;

  if to_regclass('public.comment_likes') is not null then
    execute 'create index if not exists idx_comment_likes_user_comment on public.comment_likes(user_id, comment_id)';
    execute 'create index if not exists idx_comment_likes_comment on public.comment_likes(comment_id)';
  end if;
end
$$;

-- Chat
do $$
begin
  if to_regclass('public.chat_threads') is not null then
    execute 'create index if not exists idx_chat_threads_last_message on public.chat_threads(last_message_at desc)';
    execute 'create index if not exists idx_chat_threads_creator on public.chat_threads(created_by_profile_id)';
    execute 'create index if not exists idx_chat_threads_created_at on public.chat_threads(created_at desc)';
  end if;

  if to_regclass('public.chat_messages') is not null then
    execute 'create index if not exists idx_chat_messages_sender_created on public.chat_messages(sender_profile_id, created_at desc)';
  end if;
end
$$;

-- Communications
do $$
begin
  if to_regclass('public.communication_logs') is not null then
    execute 'create index if not exists idx_comm_logs_created_at on public.communication_logs(created_at desc)';
    execute 'create index if not exists idx_comm_logs_status_created on public.communication_logs(status, created_at desc)';
    execute 'create index if not exists idx_comm_logs_event_created on public.communication_logs(event_key, created_at desc)';
    execute 'create index if not exists idx_comm_logs_recipient_created on public.communication_logs(recipient_user_id, created_at desc)';
  end if;
end
$$;

-- Provider applications
do $$
begin
  if to_regclass('public.provider_applications') is not null then
    execute 'create index if not exists idx_provider_apps_submitted_at on public.provider_applications(submitted_at desc)';
    execute 'create index if not exists idx_provider_apps_reviewed_at on public.provider_applications(reviewed_at desc)';
    execute 'create index if not exists idx_provider_apps_status_reviewed on public.provider_applications(status, reviewed_at desc)';
  end if;
end
$$;

-- Listing/shop supporting tables
do $$
begin
  if to_regclass('public.listing_amenities') is not null then
    execute 'create index if not exists idx_listing_amenities_listing_id on public.listing_amenities(listing_id)';
  end if;

  if to_regclass('public.listings') is not null then
    execute 'create index if not exists idx_listings_provider_status_active on public.listings(provider_user_id, status, is_active)';
    execute 'create index if not exists idx_listings_status_active_created on public.listings(status, is_active, created_at desc)';
  end if;

  if to_regclass('public.shop_media') is not null then
    execute 'create index if not exists idx_shop_media_shop_sort on public.shop_media(shop_id, sort_order)';
  end if;

  if to_regclass('public.shop_branches') is not null then
    execute 'create index if not exists idx_shop_branches_shop on public.shop_branches(shop_id)';
  end if;
end
$$;

-- Notifications and reservations
do $$
begin
  if to_regclass('public.notifications') is not null then
    execute 'create index if not exists idx_notifications_recipient_created on public.notifications(recipient_user_id, created_at desc)';
  end if;

  if to_regclass('public.reservations') is not null then
    execute 'create index if not exists idx_reservations_provider_created on public.reservations(provider_user_id, created_at desc)';
    execute 'create index if not exists idx_reservations_creator_created on public.reservations(created_by_user_id, created_at desc)';
    execute 'create index if not exists idx_reservations_listing_created on public.reservations(listing_id, created_at desc)';
  end if;

  if to_regclass('public.reservation_members') is not null then
    execute 'create index if not exists idx_res_members_user_reservation on public.reservation_members(linked_user_id, reservation_id)';
  end if;
end
$$;

commit;
