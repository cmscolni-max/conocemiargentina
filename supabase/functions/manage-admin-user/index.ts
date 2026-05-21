import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

type ManagedAccountStatus = 'active' | 'disabled' | 'deleted';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const normalizeText = (value: unknown) => String(value || '').trim();
const PERSON_NAME_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñ'’ -]{2,50}$/;
const isValidPersonName = (value: string) => PERSON_NAME_PATTERN.test(value.trim());

const buildDeletedEmailAlias = (profileId: string) =>
  `deleted+${Math.floor(Date.now() / 1000)}+${profileId.slice(0, 8)}@cumbre.local`;

const buildDeletedUsernameAlias = (username: string) =>
  `${username || 'usuario'}__deleted__${Math.floor(Date.now() / 1000)}`.slice(0, 64);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return json({ error: 'Faltan variables de entorno de Supabase para la función.' }, 500);
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
      return json({ error: 'Sesión inválida para administrar admins.' }, 401);
    }

    const actorId = authData.user.id;
    const { data: actorProfiles, error: actorProfilesError } = await serviceClient
      .from('profiles')
      .select('id, role, account_status')
      .eq('auth_user_id', actorId)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(5);
    if (actorProfilesError) throw actorProfilesError;

    const actorProfile = (actorProfiles || []).find((profile) => profile.role === 'admin');
    if (!actorProfile || (actorProfile.account_status && actorProfile.account_status !== 'active')) {
      return json({ error: 'Tu cuenta no tiene permisos de administrador.' }, 403);
    }

    const payload = await req.json();
    const action = payload?.action;

    if (action === 'create') {
      const email = normalizeEmail(payload?.email);
      const password = String(payload?.password || '');
      const fullName = normalizeText(payload?.fullName);
      const username = normalizeText(payload?.username);
      const province = normalizeText(payload?.province) || null;

      if (!email || !password || !fullName || !username) {
        return json({ error: 'Completá email, contraseña, nombre y usuario.' }, 400);
      }
      if (!isValidPersonName(fullName)) {
        return json({ error: 'El nombre debe tener entre 2 y 50 caracteres y solo puede incluir letras, espacios, apóstrofe y guion.' }, 400);
      }

      const { data: createdAuth, error: createError } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });
      if (createError || !createdAuth.user) {
        return json({ error: createError?.message || 'No se pudo crear el admin en autenticación.' }, 400);
      }

      const authUserId = createdAuth.user.id;
      const { data: existingProfiles, error: existingProfilesError } = await serviceClient
        .from('profiles')
        .select('id')
        .or(`auth_user_id.eq.${authUserId},email.ilike.${email}`)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(1);
      if (existingProfilesError) throw existingProfilesError;

      const existingProfileId = existingProfiles?.[0]?.id as string | undefined;
      const profilePayload = {
        auth_user_id: authUserId,
        full_name: fullName,
        email,
        username,
        province,
        role: 'admin',
        account_status: 'active' as ManagedAccountStatus,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      };

      if (existingProfileId) {
        const { error: updateProfileError } = await serviceClient
          .from('profiles')
          .update(profilePayload)
          .eq('id', existingProfileId);
        if (updateProfileError) throw updateProfileError;
      } else {
        const { error: insertProfileError } = await serviceClient
          .from('profiles')
          .insert(profilePayload);
        if (insertProfileError) throw insertProfileError;
      }

      const { data: confirmedProfiles, error: confirmedProfilesError } = await serviceClient
        .from('profiles')
        .select('id, auth_user_id, full_name, email, username, province, role, account_status, created_at, updated_at')
        .eq('auth_user_id', authUserId)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(1);
      if (confirmedProfilesError) throw confirmedProfilesError;

      const createdProfile = confirmedProfiles?.[0];
      if (!createdProfile) {
        return json({ error: 'El admin se creó en auth pero no se pudo confirmar en profiles.' }, 500);
      }

      return json({ user: createdProfile });
    }

    if (action === 'delete') {
      const profileId = String(payload?.profileId || '').trim();
      const reason = normalizeText(payload?.reason) || null;
      const deletedByProfileId = payload?.deletedByProfileId ? String(payload.deletedByProfileId) : actorProfile.id;
      const deletedByEmail = normalizeEmail(payload?.deletedByEmail) || authData.user.email || null;
      const deletionSnapshot = payload?.deletionSnapshot ?? null;
      if (!profileId) {
        return json({ error: 'Falta el usuario a eliminar.' }, 400);
      }

      const { data: targetProfiles, error: targetProfilesError } = await serviceClient
        .from('profiles')
        .select('id, auth_user_id, full_name, email, username, original_full_name, original_email, original_username, province, role, account_status, created_at, updated_at')
        .eq('id', profileId)
        .limit(1);
      if (targetProfilesError) throw targetProfilesError;

      const target = targetProfiles?.[0];
      if (!target) {
        return json({ error: 'No encontramos ese usuario.' }, 404);
      }
      if (target.id === actorProfile.id) {
        return json({ error: 'No podés eliminar tu propia cuenta desde el portal.' }, 403);
      }

      const deletedAt = new Date().toISOString();
      const deletedEmailAlias = buildDeletedEmailAlias(target.id);
      const deletedUsernameAlias = buildDeletedUsernameAlias(target.username || 'usuario');
      const { error: updateDeleteError } = await serviceClient
        .from('profiles')
        .update({
          auth_user_id: null,
          original_full_name: target.original_full_name || target.full_name,
          original_email: target.original_email || target.email,
          original_username: target.original_username || target.username,
          deleted_reason: reason,
          deleted_by_profile_id: deletedByProfileId,
          deleted_by_email: deletedByEmail,
          deletion_snapshot: deletionSnapshot,
          email: deletedEmailAlias,
          username: deletedUsernameAlias,
          account_status: 'deleted',
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .eq('id', target.id);
      if (updateDeleteError) throw updateDeleteError;

      if (target.auth_user_id) {
        const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(target.auth_user_id);
        if (deleteAuthError) throw deleteAuthError;
      }

      const { data: deletedProfiles, error: deletedProfilesError } = await serviceClient
        .from('profiles')
        .select('id, auth_user_id, full_name, email, username, original_full_name, original_email, original_username, province, role, account_status, created_at, deleted_at, updated_at')
        .eq('id', target.id)
        .limit(1);
      if (deletedProfilesError) throw deletedProfilesError;

      return json({ user: deletedProfiles?.[0] || null });
    }

    return json({ error: 'Acción no soportada.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado en la función.';
    return json({ error: message }, 500);
  }
});
