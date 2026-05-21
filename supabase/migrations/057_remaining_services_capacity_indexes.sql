begin;

do $$
declare
  has_created_at boolean;
begin
  -- Chat
  if to_regclass('public.chat_messages') is not null then
    execute 'create index if not exists idx_chat_messages_thread_created_desc on public.chat_messages(thread_id, created_at desc)';
    execute 'create index if not exists idx_chat_messages_sender_created_desc on public.chat_messages(sender_profile_id, created_at desc)';
  end if;

  if to_regclass('public.chat_threads') is not null then
    execute 'create index if not exists idx_chat_threads_last_message_created on public.chat_threads(last_message_at desc, created_at desc)';
    execute 'create index if not exists idx_chat_threads_creator_created on public.chat_threads(created_by_profile_id, created_at desc)';
  end if;

  if to_regclass('public.chat_thread_participants') is not null then
    execute 'create index if not exists idx_chat_participants_thread_profile on public.chat_thread_participants(thread_id, profile_id)';
    execute 'create index if not exists idx_chat_participants_profile_thread on public.chat_thread_participants(profile_id, thread_id)';
  end if;

  -- Communications
  if to_regclass('public.communication_logs') is not null then
    execute 'create index if not exists idx_communication_logs_created_desc on public.communication_logs(created_at desc)';
    execute 'create index if not exists idx_communication_logs_status_created_desc on public.communication_logs(status, created_at desc)';
    execute 'create index if not exists idx_communication_logs_event_created_desc on public.communication_logs(event_key, created_at desc)';
  end if;

  -- Listings related
  if to_regclass('public.listing_amenities') is not null then
    execute 'create index if not exists idx_listing_amenities_listing_lookup on public.listing_amenities(listing_id)';
  end if;

  if to_regclass('public.listing_media') is not null then
    execute 'create index if not exists idx_listing_media_listing_sort on public.listing_media(listing_id, sort_order)';
    execute 'create index if not exists idx_listing_media_listing_lookup on public.listing_media(listing_id)';
  end if;

  if to_regclass('public.listing_reviews') is not null then
    execute 'create index if not exists idx_listing_reviews_listing_created_desc on public.listing_reviews(listing_id, created_at desc)';
    execute 'create index if not exists idx_listing_reviews_author_created_desc on public.listing_reviews(author_user_id, created_at desc)';
  end if;

  -- Social
  if to_regclass('public.post_comments') is not null then
    execute 'create index if not exists idx_post_comments_post_created_desc on public.post_comments(post_id, created_at desc)';
    execute 'create index if not exists idx_post_comments_author_created_desc on public.post_comments(author_user_id, created_at desc)';
  end if;

  if to_regclass('public.post_likes') is not null then
    execute 'create index if not exists idx_post_likes_post_user on public.post_likes(post_id, user_id)';
  end if;

  if to_regclass('public.comment_likes') is not null then
    execute 'create index if not exists idx_comment_likes_comment_user on public.comment_likes(comment_id, user_id)';
  end if;

  -- Shops
  if to_regclass('public.shop_media') is not null then
    execute 'create index if not exists idx_shop_media_shop_sort on public.shop_media(shop_id, sort_order)';
  end if;

  if to_regclass('public.shops') is not null then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'shops'
        and column_name = 'created_at'
    ) into has_created_at;

    if has_created_at then
      execute 'create index if not exists idx_shops_active_created_desc on public.shops(is_active, created_at desc)';
    else
      execute 'create index if not exists idx_shops_active on public.shops(is_active)';
    end if;
  end if;

  -- Applications
  if to_regclass('public.provider_applications') is not null then
    execute 'create index if not exists idx_provider_applications_status_submitted on public.provider_applications(status, submitted_at desc)';
    execute 'create index if not exists idx_provider_applications_reviewed_desc on public.provider_applications(reviewed_at desc)';
  end if;

  if to_regclass('public.refuge_applications') is not null then
    execute 'create index if not exists idx_refuge_applications_status_submitted on public.refuge_applications(status, submitted_at desc)';
    execute 'create index if not exists idx_refuge_applications_submitted_desc on public.refuge_applications(submitted_at desc)';
  end if;
end
$$;

commit;
