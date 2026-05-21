begin;

drop cast if exists (text as public.notification_type);
create cast (text as public.notification_type)
with inout
as assignment;

commit;
