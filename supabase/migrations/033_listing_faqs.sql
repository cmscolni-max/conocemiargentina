begin;

alter table if exists public.listing_reservation_requirements
  add column if not exists faq_items jsonb not null default '[]'::jsonb;

commit;
