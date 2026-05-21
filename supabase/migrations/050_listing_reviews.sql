begin;

create table if not exists public.listing_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  author_name_snapshot text not null,
  author_avatar_snapshot text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_reviews_listing_id_created_at_idx
  on public.listing_reviews (listing_id, created_at desc);

create index if not exists listing_reviews_author_user_id_idx
  on public.listing_reviews (author_user_id);

grant select, insert, update, delete on public.listing_reviews to authenticated;
grant select on public.listing_reviews to anon;

alter table if exists public.listing_reviews enable row level security;

drop policy if exists listing_reviews_public_read on public.listing_reviews;
create policy listing_reviews_public_read on public.listing_reviews
for select
to anon, authenticated
using (true);

drop policy if exists listing_reviews_insert_own on public.listing_reviews;
create policy listing_reviews_insert_own on public.listing_reviews
for insert
to authenticated
with check (author_user_id = public.current_profile_id());

drop policy if exists listing_reviews_update_own on public.listing_reviews;
create policy listing_reviews_update_own on public.listing_reviews
for update
to authenticated
using (author_user_id = public.current_profile_id())
with check (author_user_id = public.current_profile_id());

drop policy if exists listing_reviews_delete_own on public.listing_reviews;
create policy listing_reviews_delete_own on public.listing_reviews
for delete
to authenticated
using (author_user_id = public.current_profile_id());

create or replace function public.refresh_listing_review_stats(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviews_count integer;
  v_average_rating numeric;
begin
  select
    count(*)::integer,
    coalesce(avg(rating), 0)
  into v_reviews_count,
       v_average_rating
  from public.listing_reviews
  where listing_id = p_listing_id;

  update public.listings
  set
    reviews_count = coalesce(v_reviews_count, 0),
    rating = coalesce(round(v_average_rating::numeric, 1), 0)
  where id = p_listing_id;
end;
$$;

create or replace function public.sync_listing_review_stats_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_listing_review_stats(old.listing_id);
  else
    perform public.refresh_listing_review_stats(new.listing_id);
  end if;
  return null;
end;
$$;

drop trigger if exists listing_reviews_sync_stats on public.listing_reviews;
create trigger listing_reviews_sync_stats
after insert or update or delete on public.listing_reviews
for each row
execute function public.sync_listing_review_stats_trigger();

commit;
