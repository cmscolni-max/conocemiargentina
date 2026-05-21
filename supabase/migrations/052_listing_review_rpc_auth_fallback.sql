begin;

alter table if exists public.listing_reviews
  alter column author_avatar_snapshot set default '';

update public.listing_reviews
set author_avatar_snapshot = ''
where author_avatar_snapshot is null;

create or replace function public.create_listing_review_for_profile(
  p_listing_id uuid,
  p_profile_id uuid,
  p_author_name_snapshot text,
  p_author_avatar_snapshot text,
  p_rating integer,
  p_comment text
)
returns public.listing_reviews
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_review public.listing_reviews%rowtype;
  v_comment text;
  v_profile_id uuid;
begin
  v_profile_id := public.current_profile_id();

  if p_listing_id is null then
    raise exception 'Datos invalidos.'
      using errcode = '22023';
  end if;

  if v_profile_id is null then
    raise exception 'Perfil autenticado no disponible.'
      using errcode = '42501';
  end if;

  if p_profile_id is not null and p_profile_id <> v_profile_id then
    raise exception 'Perfil autenticado no coincide.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.listings l
    where l.id = p_listing_id
  ) then
    raise exception 'Listing no disponible.'
      using errcode = '22023';
  end if;

  v_comment := trim(coalesce(p_comment, ''));
  if v_comment = '' then
    raise exception 'Comentario invalido.'
      using errcode = '22023';
  end if;

  insert into public.listing_reviews (
    listing_id,
    author_user_id,
    author_name_snapshot,
    author_avatar_snapshot,
    rating,
    comment
  ) values (
    p_listing_id,
    v_profile_id,
    trim(coalesce(p_author_name_snapshot, 'Usuario')),
    trim(coalesce(p_author_avatar_snapshot, '')),
    greatest(1, least(coalesce(p_rating, 0), 5)),
    v_comment
  )
  returning * into v_review;

  return v_review;
end;
$$;

revoke all on function public.create_listing_review_for_profile(uuid, uuid, text, text, integer, text) from public;
grant execute on function public.create_listing_review_for_profile(uuid, uuid, text, text, integer, text) to authenticated;

commit;
