begin;

alter table public.refuge_applications
  add column if not exists spot_snapshot jsonb;

update public.refuge_applications ra
set spot_snapshot = (
  select jsonb_build_object(
    'id', l.id,
    'name', coalesce(l.title, 'Refugio'),
    'location', coalesce(l.locality, l.location_label, l.province, 'Argentina'),
    'province', coalesce(l.province, 'Argentina'),
    'country', 'Argentina',
    'description', coalesce(l.description, ''),
    'price', coalesce(l.price_amount, 0),
    'rating', coalesce(l.rating, 0),
    'reviewsCount', coalesce(l.reviews_count, 0),
    'placeType', 'refugio',
    'difficulty', l.difficulty,
    'images', coalesce((
      select jsonb_agg(m.url order by m.sort_order)
      from public.listing_media m
      where m.listing_id = l.id
    ), '[]'::jsonb),
    'amenities', coalesce((
      select jsonb_agg(a.amenity)
      from public.listing_amenities a
      where a.listing_id = l.id
    ), '[]'::jsonb),
    'rules', coalesce(l.rules_json, '[]'),
    'season', coalesce(l.season, ''),
    'camasCount', rd.beds_count,
    'carpasCount', rd.tent_spots_count,
    'organizerName', l.organizer_name,
    'coordinates', jsonb_build_object(
      'lat', coalesce(l.latitude, -34.6037),
      'lng', coalesce(l.longitude, -58.3816)
    )
  )
  from public.listings l
  left join public.listing_refuge_details rd
    on rd.listing_id = l.id
  where l.id = ra.listing_id
)
where ra.spot_snapshot is null;

commit;
