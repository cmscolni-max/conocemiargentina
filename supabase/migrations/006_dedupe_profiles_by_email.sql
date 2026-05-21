begin;

-- 1) Build duplicate mapping (duplicate_id -> canonical_id) by normalized email
create temporary table tmp_profile_dupes_map (
  duplicate_id uuid primary key,
  canonical_id uuid not null
) on commit drop;

insert into tmp_profile_dupes_map (duplicate_id, canonical_id)
with ranked as (
  select
    id,
    lower(trim(email)) as email_norm,
    created_at,
    row_number() over (
      partition by lower(trim(email))
      order by created_at asc nulls last, id asc
    ) as rn,
    first_value(id) over (
      partition by lower(trim(email))
      order by created_at asc nulls last, id asc
    ) as canonical_id
  from public.profiles
  where email is not null
    and trim(email) <> ''
)
select id as duplicate_id, canonical_id
from ranked
where rn > 1;

-- 2) Utility: remap FK-like columns safely only when table/column exists
do $$
declare
  rec record;
begin
  for rec in
    select * from (
      values
        ('provider_profiles','user_id'),
        ('explorer_profiles','user_id'),
        ('listings','provider_user_id'),
        ('shops','provider_user_id'),
        ('reservations','provider_user_id'),
        ('reservations','created_by_user_id'),
        ('reservation_members','linked_user_id'),
        ('posts','author_user_id'),
        ('post_comments','author_user_id'),
        ('post_likes','user_id'),
        ('comment_likes','user_id'),
        ('follows','follower_id'),
        ('follows','followed_id'),
        ('friend_requests','from_user_id'),
        ('friend_requests','to_user_id'),
        ('friendships','user_a_id'),
        ('friendships','user_b_id'),
        ('blocks','blocker_id'),
        ('blocks','blocked_id'),
        ('favorites','user_id'),
        ('notifications','recipient_user_id'),
        ('notifications','actor_user_id')
    ) as t(table_name, column_name)
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = rec.table_name
        and column_name = rec.column_name
    ) then
      execute format(
        'update public.%I tgt
         set %I = m.canonical_id
         from tmp_profile_dupes_map m
         where tgt.%I = m.duplicate_id',
        rec.table_name, rec.column_name, rec.column_name
      );
    end if;
  end loop;
end $$;

-- 3) Remove exact duplicates in many-to-many tables that may collide after remap
-- follows(follower_id, followed_id)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='follows' and column_name='follower_id'
  ) then
    delete from public.follows a
    using public.follows b
    where a.ctid < b.ctid
      and a.follower_id = b.follower_id
      and a.followed_id = b.followed_id;
  end if;
end $$;

-- friendships(user_a_id, user_b_id)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='friendships' and column_name='user_a_id'
  ) then
    delete from public.friendships a
    using public.friendships b
    where a.ctid < b.ctid
      and least(a.user_a_id, a.user_b_id) = least(b.user_a_id, b.user_b_id)
      and greatest(a.user_a_id, a.user_b_id) = greatest(b.user_a_id, b.user_b_id);
  end if;
end $$;

-- blocks(blocker_id, blocked_id)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='blocks' and column_name='blocker_id'
  ) then
    delete from public.blocks a
    using public.blocks b
    where a.ctid < b.ctid
      and a.blocker_id = b.blocker_id
      and a.blocked_id = b.blocked_id;
  end if;
end $$;

-- favorites(user_id, entity_type, entity_id)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='favorites' and column_name='user_id'
  ) then
    delete from public.favorites a
    using public.favorites b
    where a.ctid < b.ctid
      and a.user_id = b.user_id
      and a.entity_type = b.entity_type
      and a.entity_id = b.entity_id;
  end if;
end $$;

-- 4) Delete duplicate profiles
delete from public.profiles p
using tmp_profile_dupes_map m
where p.id = m.duplicate_id;

-- 5) Enforce uniqueness by normalized email to avoid future duplicates
create unique index if not exists uq_profiles_email_normalized
on public.profiles (lower(trim(email)))
where email is not null and trim(email) <> '';

commit;
