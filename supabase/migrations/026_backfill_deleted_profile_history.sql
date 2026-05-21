begin;

alter table if exists public.profiles
  add column if not exists original_email text;

alter table if exists public.profiles
  add column if not exists original_username text;

alter table if exists public.profiles
  add column if not exists original_full_name text;

with deleted_profiles as (
  select
    p.id,
    p.full_name,
    p.username,
    case
      when p.username like '%__deleted__%' then split_part(p.username, '__deleted__', 1)
      else null
    end as recovered_username
  from public.profiles p
  where coalesce(p.account_status, 'active') = 'deleted'
),
active_candidates as (
  select
    d.id,
    a.email as candidate_email
  from deleted_profiles d
  left join lateral (
    select p2.email
    from public.profiles p2
    where coalesce(p2.account_status, 'active') <> 'deleted'
      and (
        (d.recovered_username is not null and lower(trim(p2.username)) = lower(trim(d.recovered_username)))
        or lower(trim(p2.full_name)) = lower(trim(d.full_name))
      )
    order by p2.updated_at desc nulls last, p2.created_at desc nulls last
    limit 1
  ) a on true
)
update public.profiles p
set
  original_full_name = coalesce(nullif(p.original_full_name, ''), nullif(trim(p.full_name), '')),
  original_username = coalesce(
    nullif(p.original_username, ''),
    case
      when p.username like '%__deleted__%' then split_part(p.username, '__deleted__', 1)
      else null
    end
  ),
  original_email = coalesce(nullif(p.original_email, ''), nullif(ac.candidate_email, ''))
from active_candidates ac
where p.id = ac.id
  and coalesce(p.account_status, 'active') = 'deleted';

commit;
