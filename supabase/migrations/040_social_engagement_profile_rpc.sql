begin;

create or replace function public.toggle_post_like_for_profile(
  p_post_id uuid,
  p_should_like boolean,
  p_profile_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if p_profile_id is null or p_post_id is null then
    raise exception 'Datos invalidos.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.auth_user_id = auth.uid()
  ) then
    raise exception 'Perfil autenticado no coincide.'
      using errcode = '42501';
  end if;

  if p_should_like then
    insert into public.post_likes (post_id, user_id)
    values (p_post_id, p_profile_id)
    on conflict do nothing;
  else
    delete from public.post_likes
    where post_id = p_post_id
      and user_id = p_profile_id;
  end if;

  return (
    select count(*)::integer
    from public.post_likes
    where post_id = p_post_id
  );
end;
$$;

revoke all on function public.toggle_post_like_for_profile(uuid, boolean, uuid) from public;
grant execute on function public.toggle_post_like_for_profile(uuid, boolean, uuid) to authenticated;

create or replace function public.create_post_comment_for_profile(
  p_post_id uuid,
  p_content text,
  p_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_comment_id uuid;
  v_content text;
begin
  if p_profile_id is null or p_post_id is null then
    raise exception 'Datos invalidos.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.auth_user_id = auth.uid()
  ) then
    raise exception 'Perfil autenticado no coincide.'
      using errcode = '42501';
  end if;

  v_content := trim(coalesce(p_content, ''));
  if v_content = '' then
    raise exception 'Comentario invalido.'
      using errcode = '22023';
  end if;

  insert into public.post_comments (
    post_id,
    author_user_id,
    content
  ) values (
    p_post_id,
    p_profile_id,
    v_content
  )
  returning id into v_comment_id;

  return v_comment_id;
end;
$$;

revoke all on function public.create_post_comment_for_profile(uuid, text, uuid) from public;
grant execute on function public.create_post_comment_for_profile(uuid, text, uuid) to authenticated;

create or replace function public.toggle_comment_like_for_profile(
  p_comment_id uuid,
  p_should_like boolean,
  p_profile_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if p_profile_id is null or p_comment_id is null then
    raise exception 'Datos invalidos.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.auth_user_id = auth.uid()
  ) then
    raise exception 'Perfil autenticado no coincide.'
      using errcode = '42501';
  end if;

  if p_should_like then
    insert into public.comment_likes (comment_id, user_id)
    values (p_comment_id, p_profile_id)
    on conflict do nothing;
  else
    delete from public.comment_likes
    where comment_id = p_comment_id
      and user_id = p_profile_id;
  end if;

  return (
    select count(*)::integer
    from public.comment_likes
    where comment_id = p_comment_id
  );
end;
$$;

revoke all on function public.toggle_comment_like_for_profile(uuid, boolean, uuid) from public;
grant execute on function public.toggle_comment_like_for_profile(uuid, boolean, uuid) to authenticated;

commit;
