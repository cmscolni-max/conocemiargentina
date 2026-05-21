begin;

create table if not exists public.communication_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  booking_emails boolean not null default true,
  social_emails boolean not null default true,
  system_emails boolean not null default true,
  marketing_emails boolean not null default false,
  weekly_digest_emails boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.communication_preferences enable row level security;

drop policy if exists "communication preferences self read" on public.communication_preferences;
create policy "communication preferences self read"
on public.communication_preferences
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = profile_id
      and (
        p.auth_user_id = auth.uid()
        or lower(coalesce(p.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

drop policy if exists "communication preferences self write" on public.communication_preferences;
create policy "communication preferences self write"
on public.communication_preferences
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = profile_id
      and (
        p.auth_user_id = auth.uid()
        or lower(coalesce(p.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

drop policy if exists "communication preferences self update" on public.communication_preferences;
create policy "communication preferences self update"
on public.communication_preferences
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = profile_id
      and (
        p.auth_user_id = auth.uid()
        or lower(coalesce(p.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = profile_id
      and (
        p.auth_user_id = auth.uid()
        or lower(coalesce(p.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

drop policy if exists "communication preferences self delete" on public.communication_preferences;
create policy "communication preferences self delete"
on public.communication_preferences
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = profile_id
      and (
        p.auth_user_id = auth.uid()
        or lower(coalesce(p.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

create table if not exists public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  name text not null,
  locale text not null default 'both' check (locale in ('es', 'en', 'both')),
  subject_template text not null,
  html_template text not null,
  text_template text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.communication_templates enable row level security;

drop policy if exists "communication templates admin read" on public.communication_templates;
create policy "communication templates admin read"
on public.communication_templates
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.account_status, 'active') = 'active'
  )
);

drop policy if exists "communication templates admin write" on public.communication_templates;
create policy "communication templates admin write"
on public.communication_templates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.account_status, 'active') = 'active'
  )
);

drop policy if exists "communication templates admin update" on public.communication_templates;
create policy "communication templates admin update"
on public.communication_templates
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.account_status, 'active') = 'active'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.account_status, 'active') = 'active'
  )
);

drop policy if exists "communication templates admin delete" on public.communication_templates;
create policy "communication templates admin delete"
on public.communication_templates
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.account_status, 'active') = 'active'
  )
);

create table if not exists public.communication_logs (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  channel text not null check (channel in ('push', 'in_app', 'email')),
  recipient_user_id uuid references public.profiles(id) on delete set null,
  recipient_email text,
  subject text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error_message text,
  provider_name text,
  provider_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.communication_logs enable row level security;

drop policy if exists "communication logs admin read" on public.communication_logs;
create policy "communication logs admin read"
on public.communication_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.account_status, 'active') = 'active'
  )
);

insert into public.communication_templates (event_key, name, locale, subject_template, html_template, text_template, enabled)
values
  (
    'booking_confirmed',
    'Reserva confirmada',
    'both',
    'Tu reserva en {{listingName}} fue confirmada',
    '<div style="font-family:Inter,Arial,sans-serif;background:#fff;color:#111;padding:24px;border-radius:16px"><h1 style="margin:0 0 12px">Reserva confirmada</h1><p style="margin:0 0 8px">Hola {{userName}},</p><p style="margin:0 0 8px">Tu reserva para <strong>{{listingName}}</strong> fue confirmada.</p><p style="margin:0 0 8px">Prestador: {{providerName}}</p><p style="margin:0 0 8px">Fecha: {{bookingDate}}</p><p style="margin:0">Detalle: {{actionUrl}}</p></div>',
    'Hola {{userName}}, tu reserva para {{listingName}} fue confirmada. Prestador: {{providerName}}. Fecha: {{bookingDate}}. Detalle: {{actionUrl}}',
    true
  ),
  (
    'booking_rejected',
    'Reserva rechazada',
    'both',
    'Tu reserva en {{listingName}} fue rechazada',
    '<div style="font-family:Inter,Arial,sans-serif;background:#fff;color:#111;padding:24px;border-radius:16px"><h1 style="margin:0 0 12px">Reserva rechazada</h1><p style="margin:0 0 8px">Hola {{userName}},</p><p style="margin:0 0 8px">Tu reserva para <strong>{{listingName}}</strong> fue rechazada.</p><p style="margin:0 0 8px">Motivo: {{reason}}</p><p style="margin:0">Detalle: {{actionUrl}}</p></div>',
    'Hola {{userName}}, tu reserva para {{listingName}} fue rechazada. Motivo: {{reason}}. Detalle: {{actionUrl}}',
    true
  ),
  (
    'provider_approved',
    'Prestador aprobado',
    'both',
    'Tu perfil de prestador fue aprobado',
    '<div style="font-family:Inter,Arial,sans-serif;background:#fff;color:#111;padding:24px;border-radius:16px"><h1 style="margin:0 0 12px">Prestador aprobado</h1><p style="margin:0 0 8px">Hola {{userName}},</p><p style="margin:0 0 8px">Tu perfil de prestador ya está aprobado y activo.</p><p style="margin:0">Detalle: {{actionUrl}}</p></div>',
    'Hola {{userName}}, tu perfil de prestador ya está aprobado y activo. Detalle: {{actionUrl}}',
    true
  ),
  (
    'provider_rejected',
    'Prestador rechazado',
    'both',
    'Tu solicitud de prestador fue revisada',
    '<div style="font-family:Inter,Arial,sans-serif;background:#fff;color:#111;padding:24px;border-radius:16px"><h1 style="margin:0 0 12px">Solicitud revisada</h1><p style="margin:0 0 8px">Hola {{userName}},</p><p style="margin:0 0 8px">Tu solicitud de prestador fue revisada.</p><p style="margin:0 0 8px">Motivo: {{reason}}</p><p style="margin:0">Detalle: {{actionUrl}}</p></div>',
    'Hola {{userName}}, tu solicitud de prestador fue revisada. Motivo: {{reason}}. Detalle: {{actionUrl}}',
    true
  ),
  (
    'new_booking_received',
    'Nueva reserva recibida',
    'both',
    'Tenés una nueva reserva en {{listingName}}',
    '<div style="font-family:Inter,Arial,sans-serif;background:#fff;color:#111;padding:24px;border-radius:16px"><h1 style="margin:0 0 12px">Nueva reserva</h1><p style="margin:0 0 8px">Hola {{userName}},</p><p style="margin:0 0 8px">Recibiste una nueva reserva en <strong>{{listingName}}</strong>.</p><p style="margin:0 0 8px">Explorador: {{explorerName}}</p><p style="margin:0">Detalle: {{actionUrl}}</p></div>',
    'Hola {{userName}}, recibiste una nueva reserva en {{listingName}}. Explorador: {{explorerName}}. Detalle: {{actionUrl}}',
    true
  ),
  (
    'booking_cancelled',
    'Reserva cancelada',
    'both',
    'Tu reserva en {{listingName}} fue cancelada',
    '<div style="font-family:Inter,Arial,sans-serif;background:#fff;color:#111;padding:24px;border-radius:16px"><h1 style="margin:0 0 12px">Reserva cancelada</h1><p style="margin:0 0 8px">Hola {{userName}},</p><p style="margin:0 0 8px">Tu reserva para <strong>{{listingName}}</strong> fue cancelada.</p><p style="margin:0 0 8px">Motivo: {{reason}}</p><p style="margin:0">Detalle: {{actionUrl}}</p></div>',
    'Hola {{userName}}, tu reserva para {{listingName}} fue cancelada. Motivo: {{reason}}. Detalle: {{actionUrl}}',
    true
  ),
  (
    'booking_updated',
    'Reserva actualizada',
    'both',
    'Tu reserva en {{listingName}} fue actualizada',
    '<div style="font-family:Inter,Arial,sans-serif;background:#fff;color:#111;padding:24px;border-radius:16px"><h1 style="margin:0 0 12px">Reserva actualizada</h1><p style="margin:0 0 8px">Hola {{userName}},</p><p style="margin:0 0 8px">Tu reserva para <strong>{{listingName}}</strong> fue actualizada.</p><p style="margin:0 0 8px">Explorador: {{explorerName}}</p><p style="margin:0">Detalle: {{actionUrl}}</p></div>',
    'Hola {{userName}}, tu reserva para {{listingName}} fue actualizada. Explorador: {{explorerName}}. Detalle: {{actionUrl}}',
    true
  )
on conflict (event_key) do update
set
  name = excluded.name,
  locale = excluded.locale,
  subject_template = excluded.subject_template,
  html_template = excluded.html_template,
  text_template = excluded.text_template,
  enabled = excluded.enabled,
  updated_at = now();

commit;
