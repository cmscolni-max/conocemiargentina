begin;

delete from public.profiles
where coalesce(account_status, 'active') = 'deleted'
  and auth_user_id is null;

commit;
