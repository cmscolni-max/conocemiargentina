begin;

create or replace function public.toggle_post_like(
  p_post_id uuid,
  p_should_like boolean
)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_current_profile_id uuid;
begin
  select p.id
    into v_current_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;

  if v_current_profile_id is null then
    raise exception 'Perfil autenticado no encontrado.'
      using errcode = '42501';
  end if;

  if p_post_id is null then
    raise exception 'Post inválido.'
      using errcode = '22023';
  end if;

  if p_should_like then
    insert into public.post_likes (post_id, user_id)
    values (p_post_id, v_current_profile_id)
    on conflict do nothing;
  else
    delete from public.post_likes
    where post_id = p_post_id
      and user_id = v_current_profile_id;
  end if;

  return (
    select count(*)::integer
    from public.post_likes
    where post_id = p_post_id
  );
end;
$$;

revoke all on function public.toggle_post_like(uuid, boolean) from public;
grant execute on function public.toggle_post_like(uuid, boolean) to authenticated;

create or replace function public.create_post_comment(
  p_post_id uuid,
  p_content text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_current_profile_id uuid;
  v_comment_id uuid;
  v_content text;
begin
  select p.id
    into v_current_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;

  if v_current_profile_id is null then
    raise exception 'Perfil autenticado no encontrado.'
      using errcode = '42501';
  end if;

  v_content := trim(coalesce(p_content, ''));
  if p_post_id is null or v_content = '' then
    raise exception 'Comentario inválido.'
      using errcode = '22023';
  end if;

  insert into public.post_comments (
    post_id,
    author_user_id,
    content
  ) values (
    p_post_id,
    v_current_profile_id,
    v_content
  )
  returning id into v_comment_id;

  return v_comment_id;
end;
$$;

revoke all on function public.create_post_comment(uuid, text) from public;
grant execute on function public.create_post_comment(uuid, text) to authenticated;

commit;
