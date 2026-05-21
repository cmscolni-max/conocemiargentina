import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

type CommunicationLocale = 'es' | 'en';
type CommunicationPayload = {
  eventKey: string;
  recipientEmail: string;
  recipientName?: string;
  recipientUserId?: string;
  locale?: CommunicationLocale;
  payload?: Record<string, any>;
  subject?: string;
  html?: string;
  text?: string;
  dryRun?: boolean;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
const defaultFromEmail = Deno.env.get('COMMUNICATION_FROM_EMAIL') || 'Explorer <no-reply@explorer.app>';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const getValueByPath = (source: Record<string, any>, path: string) =>
  path.split('.').reduce<any>((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), source);

const interpolate = (template: string, context: Record<string, any>) =>
  template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) => {
    const value = getValueByPath(context, key);
    return value === null || value === undefined ? '' : String(value);
  });

const defaultTemplate = (eventKey: string, locale: CommunicationLocale) => {
  const prefix = locale === 'es' ? 'Explorer' : 'Explorer';
  const subjectMap: Record<string, string> = {
    booking_confirmed: 'Tu reserva fue confirmada',
    booking_rejected: 'Tu reserva fue rechazada',
    booking_cancelled: 'Tu reserva fue cancelada',
    booking_updated: 'Tu reserva fue actualizada',
    provider_approved: 'Tu perfil de prestador fue aprobado',
    provider_rejected: 'Tu solicitud de prestador fue revisada',
    new_booking_received: 'Tenés una nueva reserva',
  };
  const subject = `${prefix}: ${subjectMap[eventKey] || 'Nueva comunicación'}`;
  return {
    subject,
    html: `<div style="font-family:Inter,Arial,sans-serif;background:#fff;color:#111;padding:24px;border-radius:16px"><h1 style="margin:0 0 12px">${subject}</h1><p style="margin:0">{{message}}</p></div>`,
    text: `${subject}\n\n{{message}}`,
  };
};

const getPreferenceKeyForEvent = (eventKey: string) => {
  if (eventKey.startsWith('booking_') || eventKey === 'new_booking_received') return 'booking_emails';
  if (eventKey.startsWith('friend_') || eventKey.startsWith('post_') || eventKey.startsWith('comment_') || eventKey.startsWith('mentioned_')) {
    return 'social_emails';
  }
  if (eventKey.startsWith('provider_') || eventKey.startsWith('system_')) return 'system_emails';
  if (eventKey.startsWith('marketing_') || eventKey.startsWith('announcement_')) return 'marketing_emails';
  if (eventKey.startsWith('digest_')) return 'weekly_digest_emails';
  return 'system_emails';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return json({ error: 'Faltan variables de Supabase para la función.' }, 500);
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) {
      return json({ error: 'Falta autorización.' }, 401);
    }

    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authError } = await authedClient.auth.getUser();
    if (authError || !authData.user) {
      return json({ error: 'Sesión inválida.' }, 401);
    }

    const rawPayload = await req.json() as CommunicationPayload;
    const eventKey = String(rawPayload?.eventKey || '').trim();
    const recipientEmail = String(rawPayload?.recipientEmail || '').trim().toLowerCase();
    const locale: CommunicationLocale = rawPayload?.locale === 'en' ? 'en' : 'es';
    const payload = rawPayload?.payload || {};
    const recipientName = String(rawPayload?.recipientName || payload.userName || payload.providerName || payload.explorerName || '').trim();

    if (!eventKey || !recipientEmail) {
      return json({ error: 'Faltan eventKey o recipientEmail.' }, 400);
    }

    let resolvedRecipientUserId = String(rawPayload?.recipientUserId || '').trim() || null;
    if (!resolvedRecipientUserId) {
      const { data: recipientProfileRows, error: recipientProfileError } = await serviceClient
        .from('profiles')
        .select('id, email')
        .ilike('email', recipientEmail)
        .limit(1);
      if (recipientProfileError) throw recipientProfileError;
      resolvedRecipientUserId = recipientProfileRows?.[0]?.id || null;
    }

    const preferenceKey = getPreferenceKeyForEvent(eventKey);
    let shouldSend = true;
    if (resolvedRecipientUserId) {
      const { data: preferenceRow, error: preferenceError } = await serviceClient
        .from('communication_preferences')
        .select('profile_id, booking_emails, social_emails, system_emails, marketing_emails, weekly_digest_emails')
        .eq('profile_id', resolvedRecipientUserId)
        .maybeSingle();
      if (preferenceError) throw preferenceError;

      const preferenceDefaults = {
        booking_emails: true,
        social_emails: true,
        system_emails: true,
        marketing_emails: false,
        weekly_digest_emails: false,
      };
      shouldSend = (preferenceRow?.[preferenceKey as keyof typeof preferenceDefaults] ?? preferenceDefaults[preferenceKey as keyof typeof preferenceDefaults]) as boolean;
    } else if (preferenceKey === 'marketing_emails' || preferenceKey === 'weekly_digest_emails') {
      shouldSend = false;
    }

    const { data: templateRows, error: templateError } = await serviceClient
      .from('communication_templates')
      .select('id, event_key, name, locale, subject_template, html_template, text_template, enabled')
      .eq('event_key', eventKey)
      .eq('enabled', true)
      .order('updated_at', { ascending: false, nullsFirst: false });
    if (templateError) throw templateError;

    const templateRow = (templateRows || []).find((row: any) => row.locale === locale)
      || (templateRows || []).find((row: any) => row.locale === 'both')
      || (templateRows || [])[0]
      || null;

    const fallback = defaultTemplate(eventKey, locale);
    const context = {
      ...payload,
      userName: recipientName || payload.userName || payload.recipientName || 'Explorer',
      actionUrl: payload.actionUrl || payload.link || payload.detailUrl || '',
      listingName: payload.listingName || payload.spotName || payload.title || 'tu publicación',
      providerName: payload.providerName || 'Prestador',
      explorerName: payload.explorerName || 'Explorador',
      bookingDate: payload.bookingDate || payload.date || '',
      reason: payload.reason || payload.providerMessage || '',
      message: payload.message || payload.description || payload.body || '',
    };

    const subject = rawPayload?.subject
      || interpolate(templateRow?.subject_template || fallback.subject, context);
    const html = rawPayload?.html
      || interpolate(templateRow?.html_template || fallback.html, context);
    const text = rawPayload?.text
      || interpolate(templateRow?.text_template || fallback.text, context);

    const logBase = {
      event_key: eventKey,
      channel: 'email',
      recipient_email: recipientEmail,
      recipient_user_id: resolvedRecipientUserId,
      subject,
      payload,
      status: 'queued',
    } as const;

    if (!shouldSend) {
      const { error: logError } = await serviceClient.from('communication_logs').insert({
        ...logBase,
        status: 'skipped',
        provider_name: 'preferences',
        provider_message: `Preference ${preferenceKey} disabled`,
      });
      if (logError) throw logError;
      return json({
        ok: true,
        skipped: true,
        reason: `Preference ${preferenceKey} disabled`,
      });
    }

    if (rawPayload?.dryRun || !resendApiKey) {
      const { error: logError } = await serviceClient.from('communication_logs').insert({
        ...logBase,
        status: 'sent',
        provider_name: rawPayload?.dryRun ? 'dry-run' : 'resend-missing',
        provider_message: rawPayload?.dryRun
          ? 'Dry run enabled'
          : 'RESEND_API_KEY not configured',
      });
      if (logError) throw logError;
      return json({
        ok: true,
        dryRun: true,
        subject,
        html,
        text,
      });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: defaultFromEmail,
        to: [recipientEmail],
        subject,
        html,
        text,
      }),
    });

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      const { error: logError } = await serviceClient.from('communication_logs').insert({
        ...logBase,
        status: 'failed',
        provider_name: 'resend',
        provider_message: JSON.stringify(responseBody || {}),
        error_message: responseBody?.message || `Resend responded with ${response.status}`,
      });
      if (logError) throw logError;
      return json({
        error: responseBody?.message || 'No se pudo enviar el email.',
      }, 400);
    }

    const { error: logError } = await serviceClient.from('communication_logs').insert({
      ...logBase,
      status: 'sent',
      provider_name: 'resend',
      provider_message: JSON.stringify(responseBody || {}),
    });
    if (logError) throw logError;

    return json({
      ok: true,
      id: responseBody?.id || null,
      subject,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado en comunicaciones.';
    return json({ error: message }, 500);
  }
});
