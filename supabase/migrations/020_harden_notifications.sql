begin;

drop cast if exists (text as public.notification_type);
create cast (text as public.notification_type)
with inout
as assignment;

create or replace function public.create_notification(
  p_recipient_user_id uuid,
  p_actor_user_id uuid,
  p_title text,
  p_body text,
  p_type text,
  p_entity_type text,
  p_entity_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
  v_type text;
  v_title text;
  v_body text;
begin
  v_type := null;
  v_title := coalesce(p_title, 'Notificacion');
  v_body := nullif(p_body, '');

  if p_type in (
    'booking_created',
    'booking_pending_review',
    'booking_confirmed',
    'booking_rejected',
    'booking_cancelled',
    'booking_updated',
    'booking_added_as_participant',
    'friend_request_received',
    'friend_request_accepted',
    'post_liked',
    'post_commented',
    'comment_liked',
    'mentioned_in_post'
  ) then
    v_type := p_type;
  elsif p_body in (
    'booking_created',
    'booking_pending_review',
    'booking_confirmed',
    'booking_rejected',
    'booking_cancelled',
    'booking_updated',
    'booking_added_as_participant',
    'friend_request_received',
    'friend_request_accepted',
    'post_liked',
    'post_commented',
    'comment_liked',
    'mentioned_in_post'
  ) then
    v_type := p_body;
    v_body := nullif(p_type, '');
  elsif p_title in (
    'booking_created',
    'booking_pending_review',
    'booking_confirmed',
    'booking_rejected',
    'booking_cancelled',
    'booking_updated',
    'booking_added_as_participant',
    'friend_request_received',
    'friend_request_accepted',
    'post_liked',
    'post_commented',
    'comment_liked',
    'mentioned_in_post'
  ) then
    v_type := p_title;
    v_title := coalesce(nullif(p_body, ''), 'Notificacion');
    v_body := nullif(p_type, '');
  else
    v_type := 'booking_updated';
  end if;

  insert into public.notifications (
    recipient_user_id,
    actor_user_id,
    title,
    body,
    type,
    entity_type,
    entity_id,
    is_read
  )
  values (
    p_recipient_user_id,
    p_actor_user_id,
    v_title,
    v_body,
    v_type::public.notification_type,
    nullif(p_entity_type, ''),
    p_entity_id,
    false
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

grant execute on function public.create_notification(uuid, uuid, text, text, text, text, uuid)
to anon, authenticated, service_role;

commit;
