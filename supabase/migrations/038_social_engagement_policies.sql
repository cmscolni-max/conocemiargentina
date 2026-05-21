begin;

grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.post_media to authenticated;
grant select, insert, update, delete on public.post_comments to authenticated;
grant select, insert, update, delete on public.post_likes to authenticated;
grant select, insert, update, delete on public.comment_likes to authenticated;

alter table if exists public.posts enable row level security;
alter table if exists public.post_media enable row level security;
alter table if exists public.post_comments enable row level security;
alter table if exists public.post_likes enable row level security;
alter table if exists public.comment_likes enable row level security;

drop policy if exists posts_manage_own on public.posts;
create policy posts_manage_own on public.posts
for all to authenticated
using (author_user_id = public.current_profile_id())
with check (author_user_id = public.current_profile_id());

drop policy if exists post_media_manage_related on public.post_media;
create policy post_media_manage_related on public.post_media
for all to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_media.post_id
      and p.author_user_id = public.current_profile_id()
  )
)
with check (
  exists (
    select 1
    from public.posts p
    where p.id = post_media.post_id
      and p.author_user_id = public.current_profile_id()
  )
);

drop policy if exists post_comments_public_read on public.post_comments;
create policy post_comments_public_read on public.post_comments
for select to anon, authenticated
using (true);

drop policy if exists post_comments_manage_own on public.post_comments;
create policy post_comments_manage_own on public.post_comments
for all to authenticated
using (author_user_id = public.current_profile_id())
with check (author_user_id = public.current_profile_id());

drop policy if exists post_likes_public_read on public.post_likes;
create policy post_likes_public_read on public.post_likes
for select to anon, authenticated
using (true);

drop policy if exists post_likes_manage_own on public.post_likes;
create policy post_likes_manage_own on public.post_likes
for all to authenticated
using (user_id = public.current_profile_id())
with check (user_id = public.current_profile_id());

drop policy if exists comment_likes_public_read on public.comment_likes;
create policy comment_likes_public_read on public.comment_likes
for select to anon, authenticated
using (true);

drop policy if exists comment_likes_manage_own on public.comment_likes;
create policy comment_likes_manage_own on public.comment_likes
for all to authenticated
using (user_id = public.current_profile_id())
with check (user_id = public.current_profile_id());

commit;
