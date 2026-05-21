begin;

create or replace function public.prevent_listing_disable_with_reservations()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if exists (
      select 1
      from public.reservations r
      where r.listing_id = old.id
    ) then
      raise exception 'No se puede desactivar o eliminar una publicación con reservas asociadas.';
    end if;
    return old;
  end if;

  if (
    new.is_active is false
    or new.status = 'archived'
  ) and exists (
    select 1
    from public.reservations r
    where r.listing_id = old.id
  ) then
    raise exception 'No se puede desactivar o eliminar una publicación con reservas asociadas.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_listing_disable_with_reservations on public.listings;
create trigger trg_prevent_listing_disable_with_reservations
before update or delete on public.listings
for each row
execute function public.prevent_listing_disable_with_reservations();

create or replace function public.prevent_provider_identity_removal_with_reservations()
returns trigger
language plpgsql
as $$
declare
  v_profile_id uuid;
begin
  v_profile_id := old.id;

  if exists (
    select 1
    from public.reservations r
    where r.provider_user_id = v_profile_id
       or r.created_by_user_id = v_profile_id
       or exists (
         select 1
         from public.listings l
         where l.provider_user_id = v_profile_id
           and l.id = r.listing_id
       )
  ) then
    raise exception 'No se puede eliminar o degradar un prestador con reservas asociadas.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_provider_profile_delete_with_reservations on public.profiles;
create trigger trg_prevent_provider_profile_delete_with_reservations
before delete on public.profiles
for each row
execute function public.prevent_provider_identity_removal_with_reservations();

drop trigger if exists trg_prevent_provider_role_downgrade_with_reservations on public.profiles;
create trigger trg_prevent_provider_role_downgrade_with_reservations
before update on public.profiles
for each row
when (
  old.role in ('provider', 'both')
  and new.role not in ('provider', 'both')
)
execute function public.prevent_provider_identity_removal_with_reservations();

commit;
