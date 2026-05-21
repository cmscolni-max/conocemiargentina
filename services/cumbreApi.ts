import { adminSupabase, createIsolatedSupabaseClient, publicSupabase, supabase } from './supabaseClient';
import { MOCK_FRIENDS } from '../constants';
import {
  ActivityType,
  AvailabilityCheck,
  Booking,
  BookingGuest,
  ChatMessage,
  ChatThread,
  Difficulty,
  CommunicationPreferences,
  CommunicationTemplate,
  InAppNotification,
  NotiTip,
  NotiTipMediaItem,
  NotiTipReadStat,
  OutdoorShop,
  OutdoorSpot,
  PlaceType,
  Review,
  SocialPost,
  UserFriend,
} from '../types';

type AuthProfileInput = {
  name: string;
  email?: string;
  phone?: string;
  instagram?: string;
  avatarUrl?: string;
  provincia?: string;
  birthDate?: string;
  preferredSports?: ActivityType[];
  providerServices?: string[];
  isProviderUser?: boolean;
};

type ProviderApplicationStatus = 'pending' | 'approved' | 'rejected';
type ProviderApplication = {
  id: string;
  name: string;
  email: string;
  province: string;
  status: ProviderApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  rejectionMessage?: string;
  snapshot?: {
    instagram?: string;
    birthDate?: string;
    preferredSports?: string[];
    providerServices?: string[];
    providerUsesBookingModule?: boolean;
  };
  profile?: {
    id?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    birthDate?: string;
    instagram?: string;
    province?: string;
    role?: string;
    createdAt?: string;
  };
  explorer?: {
    level?: string;
    preferredSports?: string[];
  };
  provider?: {
    kind?: string;
    acceptsBookings?: boolean;
    displayName?: string;
  };
};

type ProviderApplicationDetail = ProviderApplication;

type ProviderApplicationDetailSeed = {
  id: string;
  name: string;
  email: string;
  province: string;
  status: ProviderApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  rejectionMessage?: string;
};

type RefugeApplicationStatus = 'pending' | 'approved' | 'rejected';

type RefugeApplication = {
  id: string;
  listingId: string;
  providerProfileId?: string;
  title: string;
  providerName: string;
  status: RefugeApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  spot: OutdoorSpot;
  documents?: {
    concession?: string;
    permit?: string;
    insurance?: string;
    taxStatus?: string;
  };
};

type ManagedAccountStatus = 'active' | 'disabled' | 'deleted';
type ManagedUserRole = 'explorer' | 'provider' | 'both' | 'admin';
type ManagedUser = {
  id: string;
  authUserId?: string;
  email: string;
  fullName: string;
  username: string;
  originalFullName?: string;
  originalEmail?: string;
  originalUsername?: string;
  province?: string;
  role: ManagedUserRole;
  accountStatus: ManagedAccountStatus;
  accountType: 'app' | 'admin';
  createdAt?: string;
  deletedAt?: string;
  deletedReason?: string;
  deletedByProfileId?: string;
  deletedByEmail?: string;
  deletionSnapshot?: Record<string, any>;
  updatedAt?: string;
};

const APP_NAMESPACE = 'cumbre';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEXT_WITH_NUMBERS_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñ'’0-9 -]{2,100}$/;
const EXPERIENCE_LEVEL_TO_DB: Record<string, string> = {
  Principiante: 'nivel_1',
  Medio: 'nivel_2',
  Avanzado: 'nivel_3',
  Experto: 'nivel_4',
  nivel_1: 'nivel_1',
  nivel_2: 'nivel_2',
  nivel_3: 'nivel_3',
  nivel_4: 'nivel_4',
};
const EXPERIENCE_LEVEL_FROM_DB: Record<string, string> = {
  nivel_1: 'Principiante',
  nivel_2: 'Medio',
  nivel_3: 'Avanzado',
  nivel_4: 'Experto',
};
const toAppBookingStatus = (dbStatus?: string | null): Booking['status'] => {
  if (dbStatus === 'pending_information') return 'pending_information';
  if (dbStatus === 'confirmed' || dbStatus === 'approved') return 'confirmed';
  if (dbStatus === 'rejected') return 'rejected';
  if (dbStatus === 'cancelled') return 'cancelled';
  return 'pending';
};
const toDbBookingStatus = (status?: Booking['status']): string | null | undefined => {
  if (status === undefined) return undefined;
  if (status === 'pending_information') return 'pending';
  return status;
};
const normalizeBookingText = (value?: string | null) => String(value || '').replace(/\s+/g, ' ').trim();
const isValidTextWithNumbers = (value: string, minLength = 2, maxLength = 100) => {
  const normalized = normalizeBookingText(value);
  return normalized.length >= minLength && normalized.length <= maxLength && TEXT_WITH_NUMBERS_PATTERN.test(normalized);
};
const makeUserName = (name: string) =>
  (name || 'usuario')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || `usuario_${Date.now()}`;

const isPlaceholderAvatarUrl = (value?: string | null) => {
  const normalized = String(value || '').trim();
  return !normalized || normalized.includes('i.pravatar.cc/');
};

const getOAuthIdentityData = (user: any) => {
  if (!Array.isArray(user?.identities)) return {};
  const activeProvider = user?.app_metadata?.provider;
  const matchedIdentity = activeProvider
    ? user.identities.find((identity: any) => identity?.provider === activeProvider && identity?.identity_data)
    : null;
  const fallbackIdentity = user.identities.find((identity: any) => identity?.identity_data);
  return matchedIdentity?.identity_data || fallbackIdentity?.identity_data || {};
};

const getOAuthAvatarUrl = (user: any) => {
  const identityData = getOAuthIdentityData(user);
  const candidates = [
    user?.user_metadata?.avatar_url,
    user?.user_metadata?.picture,
    user?.user_metadata?.photo_url,
    user?.user_metadata?.photoURL,
    user?.user_metadata?.avatar,
    user?.user_metadata?.image,
    identityData?.avatar_url,
    identityData?.picture,
    identityData?.photo_url,
    identityData?.photoURL,
    identityData?.avatar,
    identityData?.image,
  ];

  return candidates.find((candidate) => {
    const normalized = String(candidate || '').trim();
    return normalized && /^https?:\/\//i.test(normalized);
  }) || null;
};

const isProviderRole = (role?: string | null) => role === 'provider' || role === 'both';
const isManagedUserRole = (role?: string | null): role is ManagedUserRole =>
  role === 'explorer' || role === 'provider' || role === 'both' || role === 'admin';
const getManagedAccountType = (role?: string | null): ManagedUser['accountType'] => role === 'admin' ? 'admin' : 'app';
const normalizeManagedAccountStatus = (status?: string | null): ManagedAccountStatus =>
  status === 'disabled' || status === 'deleted' ? status : 'active';

const getProviderEnabledRole = (role?: string | null) => {
  if (role === 'both' || role === 'provider') return role;
  if (role === 'explorer') return 'both';
  return 'provider';
};

const parseJsonSafe = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const toPersistedMediaUrl = (value?: string | null) => {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return null;
  if (/^blob:/i.test(normalizedValue) || /^https?:\/\/localhost[:/]/i.test(normalizedValue)) return null;
  if (/^https?:\/\//i.test(normalizedValue)) return normalizedValue;

  const normalizedPath = normalizedValue.replace(/^cumbre-media\//i, '').replace(/^\/+/, '');
  if (!normalizedPath) return null;

  const { data } = supabase.storage.from('cumbre-media').getPublicUrl(normalizedPath);
  return data.publicUrl || null;
};

const isPersistedMediaUrl = (value?: string | null) => Boolean(toPersistedMediaUrl(value));
const DEFAULT_SHOP_IMAGE_URL = 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&q=80&w=1200';

const filterPersistedMediaUrls = (values: Array<string | null | undefined>) =>
  values
    .map((value) => toPersistedMediaUrl(value))
    .filter((value): value is string => Boolean(value));

const sanitizeStoragePathSegment = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'file';

const sanitizeStoragePath = (path: string) =>
  path
    .split('/')
    .map((segment) => sanitizeStoragePathSegment(segment))
    .filter(Boolean)
    .join('/');

const fromDbDifficulty = (value?: string | null): Difficulty | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'bajo') return Difficulty.EASY;
  if (normalized === 'medio') return Difficulty.MODERATE;
  if (normalized === 'alto') return Difficulty.HARD;
  if (normalized === 'experto') return Difficulty.EXPERT;
  return undefined;
};

const toDbDifficulty = (value?: Difficulty | null): 'bajo' | 'medio' | 'alto' | 'experto' => {
  if (value === Difficulty.EASY) return 'bajo';
  if (value === Difficulty.MODERATE) return 'medio';
  if (value === Difficulty.HARD) return 'alto';
  return 'experto';
};

const fromDbActivityType = (value?: string | null): ActivityType | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'trekking') return ActivityType.TREKKING;
  if (normalized === 'montanismo') return ActivityType.MONTANISMO;
  if (normalized === 'rafting') return ActivityType.RAFTING;
  if (normalized === 'kayak') return ActivityType.KAYAK;
  if (normalized === 'buceo') return ActivityType.BUCEO;
  if (normalized === 'mountain_bike') return ActivityType.MOUNTAIN_BIKE;
  if (normalized === 'escalada_hielo') return ActivityType.ESCALADA_HIELO;
  if (normalized === 'parapente') return ActivityType.PARAPENTE;
  if (normalized === 'paracaidismo') return ActivityType.PARACAIDISMO;
  if (normalized === 'boulder') return ActivityType.BOULDER;
  if (normalized === 'escalada_roca') return ActivityType.ESCALADA;
  return undefined;
};

const toDbActivityType = (value?: ActivityType | null): string | null => {
  if (!value) return null;
  if (value === ActivityType.TREKKING) return 'trekking';
  if (value === ActivityType.MONTANISMO) return 'montanismo';
  if (value === ActivityType.RAFTING) return 'rafting';
  if (value === ActivityType.KAYAK) return 'kayak';
  if (value === ActivityType.BUCEO) return 'buceo';
  if (value === ActivityType.MOUNTAIN_BIKE) return 'mountain_bike';
  if (value === ActivityType.ESCALADA_HIELO) return 'escalada_hielo';
  if (value === ActivityType.PARAPENTE) return 'parapente';
  if (value === ActivityType.PARACAIDISMO) return 'paracaidismo';
  if (value === ActivityType.BOULDER) return 'boulder';
  if (value === ActivityType.ESCALADA) return 'escalada_roca';
  return 'otro';
};

const toAppListingStatus = (dbStatus?: string | null): 'pending' | 'approved' | 'rejected' => {
  if (dbStatus === 'published') return 'approved';
  if (dbStatus === 'archived') return 'rejected';
  return 'pending';
};

const toDbListingStatus = (status: 'pending' | 'approved' | 'rejected'): 'draft' | 'published' | 'archived' => {
  if (status === 'approved') return 'published';
  if (status === 'rejected') return 'archived';
  return 'draft';
};

const ensureArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const getLocalDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toDateKey = (value: unknown): string | undefined => {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  const isoLike = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoLike) return isoLike[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return getLocalDateKey(parsed);
};

const normalizeListingText = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const pickBestListingRow = (rows: any[]) => {
  const sorted = [...rows].sort((a, b) => {
    const aDate = new Date(a?.updated_at || a?.created_at || 0).getTime();
    const bDate = new Date(b?.updated_at || b?.created_at || 0).getTime();
    if (aDate !== bDate) return bDate - aDate;

    const aMediaCount = ensureArray<any>(a?.listing_media).length;
    const bMediaCount = ensureArray<any>(b?.listing_media).length;
    return bMediaCount - aMediaCount;
  });
  return sorted[0] || rows[0];
};

const dedupeLikelyEditedListingRows = (rows: any[]) => {
  const groups = new Map<string, any[]>();
  rows.forEach((row) => {
    const key = [
      normalizeListingText(row?.provider_user_id),
      normalizeListingText(row?.listing_type),
      normalizeListingText(row?.title),
      normalizeListingText(row?.province),
      normalizeListingText(row?.locality || row?.location_label),
    ].join('|');
    const existing = groups.get(key) || [];
    existing.push(row);
    groups.set(key, existing);
  });
  return Array.from(groups.values()).map((group) => pickBestListingRow(group));
};

const isIgnorableSchemaError = (error: any) => error?.code === '42P01' || error?.code === 'PGRST205';

const throwUnlessIgnorable = (error: any) => {
  if (error && !isIgnorableSchemaError(error)) {
    throw error;
  }
};

const ADMIN_RESERVATION_GUARD_ERROR = 'No se puede modificar este elemento porque tiene reservas asociadas.';

const assertListingHasNoReservations = async (listingIds: string[]) => {
  const normalizedListingIds = Array.from(new Set(listingIds.filter(Boolean)));
  if (normalizedListingIds.length === 0) return;
  const { count, error } = await supabase
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .in('listing_id', normalizedListingIds);
  if (error) throw error;
  if ((count || 0) > 0) {
    throw new Error(ADMIN_RESERVATION_GUARD_ERROR);
  }
};

const assertProviderHasNoReservations = async (profileIds: string[]) => {
  const normalizedProfileIds = Array.from(new Set(profileIds.filter(Boolean)));
  if (normalizedProfileIds.length === 0) return;
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('id')
    .in('provider_user_id', normalizedProfileIds);
  if (listingsError) throw listingsError;
  const listingIds = ensureArray<any>(listings).map((row) => row.id).filter(Boolean);
  const [{ count: listingCount, error: listingError }, { count: providerCount, error: providerError }, { count: creatorCount, error: creatorError }] = await Promise.all([
    listingIds.length > 0
      ? supabase
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .in('listing_id', listingIds)
      : Promise.resolve({ count: 0, error: null }),
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .in('provider_user_id', normalizedProfileIds),
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .in('created_by_user_id', normalizedProfileIds),
  ]);
  if (listingError) throw listingError;
  if (providerError) throw providerError;
  if (creatorError) throw creatorError;
  if ((listingCount || 0) > 0 || (providerCount || 0) > 0 || (creatorCount || 0) > 0) {
    throw new Error(ADMIN_RESERVATION_GUARD_ERROR);
  }
};

type RealtimeSubscription = {
  unsubscribe: () => Promise<'ok' | 'timed out' | 'error'>;
};

const mapChatThread = (
  row: any,
  currentProfileIds: string[],
  profilesById: Map<string, any>
): ChatThread => {
  const resolveAvatarWithVersion = (profile: any, fallbackProfileId: string) => {
    const baseAvatar = String(profile?.avatar_url || '').trim();
    if (!baseAvatar) return `https://i.pravatar.cc/150?u=${fallbackProfileId}`;
    const updatedAt = String(profile?.updated_at || '').trim();
    if (!updatedAt) return baseAvatar;
    const separator = baseAvatar.includes('?') ? '&' : '?';
    return `${baseAvatar}${separator}v=${encodeURIComponent(updatedAt)}`;
  };
  const participants = ensureArray<any>(row.chat_thread_participants)
    .map((participantRow) => {
      const profile = profilesById.get(participantRow.profile_id);
      return {
        profileId: participantRow.profile_id,
        name: profile?.full_name || 'Usuario',
        avatar: resolveAvatarWithVersion(profile, participantRow.profile_id),
        role: profile?.role || undefined,
        isProvider: profile?.role === 'provider' || profile?.role === 'both',
      };
    })
    .filter((participant) => Boolean(participant.profileId));

  const lastReadAt = ensureArray<any>(row.chat_thread_participants)
    .filter((participantRow) => currentProfileIds.includes(participantRow.profile_id))
    .reduce((latest, participantRow) => {
      const nextValue = participantRow?.last_read_at ? new Date(participantRow.last_read_at).getTime() : 0;
      return Math.max(latest, nextValue);
    }, 0);
  const unreadCount = typeof row.unread_count === 'number'
    ? row.unread_count
    : ensureArray<any>(row.chat_messages).filter((messageRow) => {
        if (currentProfileIds.includes(messageRow.sender_profile_id)) return false;
        const createdAt = new Date(messageRow.created_at || 0).getTime();
        return createdAt > lastReadAt;
      }).length;

  return {
    id: row.id,
    createdAt: row.created_at || new Date().toISOString(),
    lastMessageAt: row.last_message_at || undefined,
    lastMessagePreview: row.last_message_preview || undefined,
    unreadCount,
    participants,
  };
};

const mapChatMessage = (
  row: any,
  currentProfileIds: string[],
  profilesById: Map<string, any>
): ChatMessage => {
  const sender = profilesById.get(row.sender_profile_id);
  const senderAvatarBase = String(sender?.avatar_url || '').trim();
  const senderUpdatedAt = String(sender?.updated_at || '').trim();
  const senderAvatar = senderAvatarBase
    ? (senderUpdatedAt
      ? `${senderAvatarBase}${senderAvatarBase.includes('?') ? '&' : '?'}v=${encodeURIComponent(senderUpdatedAt)}`
      : senderAvatarBase)
    : `https://i.pravatar.cc/150?u=${row.sender_profile_id}`;
  return {
    id: row.id,
    threadId: row.thread_id,
    senderProfileId: row.sender_profile_id,
    body: row.body || '',
    createdAt: row.created_at || new Date().toISOString(),
    senderName: sender?.full_name || 'Usuario',
    senderAvatar,
    isOwn: currentProfileIds.includes(row.sender_profile_id),
  };
};

const resolveListingType = (spot: OutdoorSpot): 'refuge' | 'activity' | 'course' | 'event' | 'training' | 'expedition' => {
  if (spot.placeType === PlaceType.REFUGIO) return 'refuge';
  if (spot.placeType === PlaceType.ENTRENA) return 'training';
  if (spot.kind === 'course') return 'course';
  if (spot.kind === 'event') return 'event';
  if (spot.activityType === ActivityType.MONTANISMO || spot.activityType === ActivityType.TREKKING) return 'expedition';
  return 'activity';
};

const mapListingToSpot = (row: any): OutdoorSpot => {
  const media = ensureArray<any>(row.listing_media).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const activityDetail = ensureArray<any>(row.listing_activity_details)[0];
  const refugeDetail = ensureArray<any>(row.listing_refuge_details)[0];
  const expeditionDetail = ensureArray<any>(row.listing_expedition_details)[0];
  const amenities = ensureArray<any>(row.listing_amenities).map((a) => a.amenity).filter(Boolean);
  const personalEquipment = ensureArray<any>(row.listing_personal_equipment).map((a) => a.item).filter(Boolean);
  const requirements = ensureArray<any>(row.listing_reservation_requirements)[0];
  const faqItems = Array.isArray(requirements?.faq_items)
    ? requirements.faq_items
        .map((item: any) => ({
          question: String(item?.question || '').trim(),
          answer: String(item?.answer || '').trim(),
        }))
        .filter((item: any) => item.question && item.answer)
    : [];
  const listingType = row.listing_type;
  const isRefuge = listingType === 'refuge';
  const mappedActivityType = fromDbActivityType(activityDetail?.activity_type);
  const isLegacyCourseFromTraining = listingType === 'training' && mappedActivityType === ActivityType.BOULDER;
  const isTraining = listingType === 'training' && !isLegacyCourseFromTraining;

  return {
    id: row.id,
    isSponsored: Boolean(row.is_sponsored),
    sponsoredStartDate: row.sponsored_start_date || undefined,
    sponsoredEndDate: row.sponsored_end_date || undefined,
    name: row.title || 'Sin título',
    location: row.locality || row.location_label || row.province || 'Argentina',
    province: row.province || 'Argentina',
    country: 'Argentina',
    description: row.description || '',
    price: Number(row.price_amount || 0),
    rating: Number(row.rating || 0),
    reviewsCount: Number(row.reviews_count || 0),
    placeType: isRefuge ? PlaceType.REFUGIO : isTraining ? PlaceType.ENTRENA : PlaceType.ACTIVIDAD,
    activityType: mappedActivityType,
    difficulty: fromDbDifficulty(row.difficulty),
    images: filterPersistedMediaUrls(media.map((item) => item.url)),
    amenities,
    coordinates: {
      lat: Number(row.latitude || -34.6037),
      lng: Number(row.longitude || -58.3816),
    },
    weather: {
      temp: 0,
      condition: 'N/A',
      forecast: 'N/A',
    },
    rules: parseJsonSafe<string[]>(row.rules_json, []),
    season: row.season || '',
    date: toDateKey(row.start_date) || undefined,
    expeditionStartDate: toDateKey(row.start_date) || undefined,
    expeditionEndDate: toDateKey(row.end_date) || undefined,
    expeditionDays: row.days_count ?? undefined,
    expeditionNights: row.nights_count ?? undefined,
    expeditionCapacity: row.capacity ?? undefined,
    enrollmentStartDate: toDateKey(row.enrollment_start_date) || undefined,
    enrollmentEndDate: toDateKey(row.enrollment_end_date) || undefined,
    allowEnrollment: row.allow_enrollment ?? undefined,
    isAcceptingEnrollments: row.is_accepting_enrollments ?? undefined,
    meetingPoint: row.meeting_point || undefined,
    maxAltitudeReached: activityDetail?.max_altitude_masn || undefined,
    immersionDepth: activityDetail?.immersion_meters || undefined,
    minorsAllowed: row.minors_allowed ?? undefined,
    personalGear: personalEquipment.length > 0 ? personalEquipment : undefined,
    transferIncludedFrom: expeditionDetail?.includes_transport_from || undefined,
    requiresMedicalCertificate: requirements?.require_physical_fitness_certificate ?? undefined,
    bookingRequireMedicalInsurance: requirements?.require_medical_insurance ?? undefined,
    bookingRequireHealthDeclaration: requirements?.require_health_declaration ?? undefined,
    bookingRequireLiabilityWaiver: requirements?.require_liability_waiver ?? undefined,
    bookingLiabilityWaiverText: requirements?.liability_waiver_text || undefined,
    bookingRequireEmergencyContact: requirements?.require_emergency_contact ?? undefined,
    faqs: faqItems.length > 0 ? faqItems : undefined,
    expeditionVideoUrl: isPersistedMediaUrl(media.find((item) => item.media_type === 'video')?.url)
      ? media.find((item) => item.media_type === 'video')?.url
      : undefined,
    camasCount: refugeDetail?.beds_count ?? undefined,
    carpasCount: refugeDetail?.tent_spots_count ?? undefined,
    organizerName: row.organizer_name || undefined,
    organizerUserId: expeditionDetail?.organized_by_user_id || row.provider_user_id || undefined,
    guidedByName: row.guided_by_name || undefined,
    guidedByUserId: expeditionDetail?.guided_by_user_id || undefined,
    kind: listingType === 'course'
      ? 'course'
      : listingType === 'event'
        ? 'event'
        : isLegacyCourseFromTraining
          ? 'course'
          : undefined,
  };
};

const mapRefugeSnapshotToSpot = (snapshot: any): OutdoorSpot => ({
  id: snapshot?.id || `refuge-${Date.now()}`,
  name: snapshot?.name || 'Refugio',
  location: snapshot?.location || snapshot?.province || 'Argentina',
  province: snapshot?.province || 'Argentina',
  country: snapshot?.country || 'Argentina',
  description: snapshot?.description || '',
  price: Number(snapshot?.price || 0),
  rating: Number(snapshot?.rating || 0),
  reviewsCount: Number(snapshot?.reviewsCount || 0),
  placeType: PlaceType.REFUGIO,
  difficulty: fromDbDifficulty(snapshot?.difficulty) || Difficulty.MODERATE,
  images: filterPersistedMediaUrls(Array.isArray(snapshot?.images) ? snapshot.images : []),
  amenities: Array.isArray(snapshot?.amenities) ? snapshot.amenities : [],
  coordinates: snapshot?.coordinates?.lat && snapshot?.coordinates?.lng
    ? { lat: Number(snapshot.coordinates.lat), lng: Number(snapshot.coordinates.lng) }
    : { lat: -34.6037, lng: -58.3816 },
  weather: { temp: 0, condition: 'N/A', forecast: 'N/A' },
  rules: Array.isArray(snapshot?.rules)
    ? snapshot.rules
    : parseJsonSafe<string[]>(snapshot?.rules, []),
  season: snapshot?.season || '',
  camasCount: snapshot?.camasCount ?? undefined,
  carpasCount: snapshot?.carpasCount ?? undefined,
  organizerName: snapshot?.organizerName || undefined,
  organizerUserId: snapshot?.organizerUserId || snapshot?.providerUserId || undefined,
});

const mapShop = (row: any): OutdoorShop => {
  const media = ensureArray<any>(row.shop_media).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const branches = ensureArray<any>(row.shop_branches);
  const persistedMedia = filterPersistedMediaUrls(media.map((item) => item.url));
  const resolvedImage = toPersistedMediaUrl(row.image_url) || persistedMedia[0] || DEFAULT_SHOP_IMAGE_URL;
  return {
    id: row.id,
    providerUserId: row.provider_user_id || undefined,
    sponsoredStartDate: row.sponsored_start_date || undefined,
    sponsoredEndDate: row.sponsored_end_date || undefined,
    name: row.name || '',
    address: row.address || '',
    province: row.province || '',
    specialty: row.specialty || '',
    image: resolvedImage,
    rating: Number(row.rating || 0),
    isSponsored: Boolean(row.is_sponsored),
    website: row.website || undefined,
    branches: branches.map((b) => b.branch_name).filter(Boolean),
    phone: row.phone || undefined,
    instagram: row.instagram_handle || row.instagram || undefined,
    description: row.description || undefined,
    productGallery: persistedMedia.length > 0 ? persistedMedia : [resolvedImage],
    coordinates: {
      lat: Number(row.latitude || -34.6037),
      lng: Number(row.longitude || -58.3816),
    },
  };
};

const mapListingReview = (row: any): Review => ({
  id: row.id,
  userName: row.author_name_snapshot || 'Usuario',
  userAvatar: toPersistedMediaUrl(row.author_avatar_snapshot) || row.author_avatar_snapshot || `https://i.pravatar.cc/150?u=${row.author_user_id || 'review'}`,
  rating: Number(row.rating || 0),
  comment: row.comment || '',
  date: row.created_at ? new Date(row.created_at).toLocaleDateString('es-AR') : 'Ahora',
});

const mapPost = (row: any): SocialPost => {
  const media = ensureArray<any>(row.post_media)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((item) => ({
      type: item.media_type === 'video' ? 'video' as const : 'image' as const,
      src: toPersistedMediaUrl(item.url) || item.url,
    }))
    .filter((item) => Boolean(item.src));
  const firstImage = media.find((m) => m.type === 'image')?.src;
  const likesCount = Number(row.likes_count ?? ensureArray<any>(row.post_likes)?.[0]?.count ?? 0);
  const commentsCount = Number(row.comments_count ?? ensureArray<any>(row.post_comments)?.[0]?.count ?? 0);
  const resolvedAuthorAvatar = toPersistedMediaUrl(row.author_avatar) || row.author_avatar || '';
  return {
    id: row.id,
    userId: row.author_user_id,
    userName: row.author_name || row.author_username || 'Usuario',
    userAvatar: resolvedAuthorAvatar,
    content: row.content || '',
    image: firstImage || undefined,
    media,
    location: row.location || undefined,
    timestamp: row.created_at ? new Date(row.created_at).toLocaleString('es-AR') : 'Ahora',
    likes: likesCount,
    comments: commentsCount,
    type: 'post',
  };
};

const attachListingReviews = async (spots: OutdoorSpot[]): Promise<OutdoorSpot[]> => {
  if (spots.length === 0) return spots;
  const reviewsByListing = await cumbreApi.getListingReviews(spots.map((spot) => spot.id));
  return spots.map((spot) => ({
    ...spot,
    reviews: reviewsByListing[spot.id] || spot.reviews || [],
  }));
};

const mapBookingGuest = (member: any): BookingGuest => ({
  documentType: member.document_type || undefined,
  firstName: member.first_name || '',
  lastName: member.last_name || '',
  document: member.dni_or_passport || '',
  documentIssuerCountry: member.document_issuer_country || undefined,
  nationality: member.nationality || '',
  residenceCountry: member.residence_country || member.nationality || undefined,
  gender: member.gender || undefined,
  birthDate: member.birth_date || '',
  age: member.age ?? null,
  appUserId: member.linked_user_id || undefined,
  appUserHandle: member.app_user_handle || undefined,
  email: member.email || '',
  phone: member.phone || '',
  countryCallingCode: member.country_calling_code || undefined,
  phoneNumber: member.phone_number || undefined,
  contactRelation: member.contact_relation || undefined,
  allergies: member.allergies || undefined,
  insuranceCoverage: member.insurance_coverage || undefined,
  responsibilityDeclaration: member.responsibility_declaration ?? undefined,
  hasExperience: Boolean(member.has_experience),
  experienceLevel: member.experience_level ? (EXPERIENCE_LEVEL_FROM_DB[member.experience_level] || member.experience_level) : undefined,
  insurance: {
    hasInsurance: Boolean(member.has_medical_insurance),
    provider: member.insurance_name || '',
    memberNumber: member.insurance_member_number || '',
  },
  healthDeclarationAnswers: member.health_declaration_answers || undefined,
  healthDeclarationConfirmed: member.health_truth_declared ?? undefined,
  medicalCertificateFileName: member.medical_certificate_file_name || undefined,
  liabilityWaiverAccepted: member.liability_accepted ?? undefined,
  liabilityWaiverAcceptedAt: member.liability_accepted_at || undefined,
  liabilityWaiverTextSnapshot: member.liability_text_snapshot || undefined,
  trekkingNoticeAscentDate: member.trekking_notice_ascent_date || undefined,
  trekkingNoticeReturnDate: member.trekking_notice_return_date || undefined,
  trekkingNoticeHasAdequateEquipment: typeof member.trekking_notice_has_adequate_equipment === 'boolean'
    ? member.trekking_notice_has_adequate_equipment
    : undefined,
  trekkingNoticeEmergencyContactName: member.trekking_notice_emergency_contact_name || undefined,
  trekkingNoticeEmergencyContactPhone: member.trekking_notice_emergency_contact_phone || undefined,
  emergencyContactName: member.emergency_contact_name || '',
  emergencyContactPhone: member.emergency_contact_phone || '',
});

const mapBooking = (row: any): Booking => {
  const members = ensureArray<any>(row.reservation_members);
  const creatorMember = members.find((m) => m.is_creator) || members[0];
  const hasPendingInformationState = Boolean(
    row.requires_revalidation
    || row.missing_medical_certificate
    || row.missing_health_declaration
    || row.missing_liability_waiver
    || row.missing_emergency_contact
    || row.information_deadline_at
  );
  const appStatus =
    row.status === 'pending' && hasPendingInformationState
      ? 'pending_information'
      : toAppBookingStatus(row.status);
  return {
    id: row.id,
    spotId: row.listing_id,
    availabilityCheckId: row.availability_check_id || undefined,
    providerUserId: row.provider_user_id || undefined,
    createdByUserId: row.created_by_user_id || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    reservationName: creatorMember?.first_name || row.reservation_name || '',
    reservationLastName: creatorMember?.last_name || row.reservation_last_name || '',
    reservationUser: row.reservation_user || row.created_by_handle || '',
    email: creatorMember?.email || row.email || '',
    phone: creatorMember?.phone || row.phone || '',
    countryCallingCode: row.country_calling_code || creatorMember?.countryCallingCode || undefined,
    phoneNumber: row.phone_number || creatorMember?.phoneNumber || undefined,
    dateFrom: row.start_date || '',
    dateTo: row.end_date || '',
    needsCarStorage: Boolean(row.needs_car_parking),
    shelterTransport: row.medium_transport || undefined,
    needsParking: row.needs_parking ?? undefined,
    licensePlate: row.license_plate || undefined,
    arrivalTime: row.arrival_time || undefined,
    departureTime: row.departure_time || undefined,
    observations: row.observations || undefined,
    acceptsTerms: row.accepts_terms ?? undefined,
    acceptsCancellation: row.accepts_cancellation ?? undefined,
    consentContact: row.consent_contact ?? undefined,
    shelterRoute: row.shelter_route || undefined,
    trekkingDifficultyLevel: row.trekking_difficulty_level || undefined,
    trekkingWithGuide: row.trekking_with_guide ?? undefined,
    trekkingGuideName: row.trekking_guide_name || undefined,
    trekkingGuideLastName: row.trekking_guide_last_name || undefined,
    trekkingGuidePhone: row.trekking_guide_phone || undefined,
    trekkingResponsibleGroup: row.trekking_responsible_group || undefined,
    trekkingPointOfDeparture: row.trekking_point_of_departure || undefined,
    trekkingDepartureTime: row.trekking_departure_time || undefined,
    trekkingReturnTime: row.trekking_return_time || undefined,
    trekkingGroupCount: row.trekking_group_count || undefined,
    trekkingCommunicationMedium: row.trekking_communication_medium || undefined,
    trekkingDeclarationAptitude: row.trekking_declaration_aptitude ?? undefined,
    trekkingAcceptRecommendations: row.trekking_accept_recommendations ?? undefined,
    trekkingAcceptEquipment: row.trekking_accept_equipment ?? undefined,
    trekkingWeatherRead: row.trekking_weather_read ?? undefined,
    objective: row.objective || '',
    medicalCertificateFileName: creatorMember?.medical_certificate_file_name || row.medical_certificate_file_name || undefined,
    liabilityWaiverAccepted: row.liability_waiver_accepted ?? undefined,
    liabilityWaiverAcceptedAt: row.liability_waiver_accepted_at || undefined,
    liabilityWaiverTextSnapshot: row.liability_waiver_text_snapshot || creatorMember?.liability_text_snapshot || undefined,
    requiresRevalidation: row.requires_revalidation ?? undefined,
    revalidationReason: row.revalidation_reason || undefined,
    revalidationRequestedAt: row.revalidation_requested_at || undefined,
    missingMedicalCertificate: row.missing_medical_certificate ?? undefined,
    missingHealthDeclaration: row.missing_health_declaration ?? undefined,
    missingLiabilityWaiver: row.missing_liability_waiver ?? undefined,
    missingEmergencyContact: row.missing_emergency_contact ?? undefined,
    informationDeadlineAt: row.information_deadline_at || undefined,
    trekkingNoticeAscentDate: creatorMember?.trekking_notice_ascent_date || row.trekking_notice_ascent_date || undefined,
    trekkingNoticeReturnDate: creatorMember?.trekking_notice_return_date || row.trekking_notice_return_date || undefined,
    trekkingNoticeHasAdequateEquipment: typeof creatorMember?.trekking_notice_has_adequate_equipment === 'boolean'
      ? creatorMember.trekking_notice_has_adequate_equipment
      : typeof row.trekking_notice_has_adequate_equipment === 'boolean'
        ? row.trekking_notice_has_adequate_equipment
        : undefined,
    trekkingNoticeEmergencyContactName: creatorMember?.trekking_notice_emergency_contact_name || row.trekking_notice_emergency_contact_name || undefined,
    trekkingNoticeEmergencyContactPhone: creatorMember?.trekking_notice_emergency_contact_phone || row.trekking_notice_emergency_contact_phone || undefined,
    peopleCount: Number(row.participants_count || members.length || 1),
    guests: members.map(mapBookingGuest),
    status: appStatus,
    providerMessage: row.provider_message || undefined,
    updatedAt: row.updated_at || undefined,
    total: Number(row.total_amount || 0),
  };
};

const mapAvailabilityCheck = (row: any): AvailabilityCheck => ({
  id: row.id,
  spotId: row.listing_id,
  providerUserId: row.provider_user_id,
  createdByUserId: row.created_by_user_id,
  explorerHandle: row.explorer_handle || '@explorador',
  dateFrom: row.date_from,
  dateTo: row.date_to,
  peopleCount: Number(row.people_count || 1),
  status: (row.status || 'pending') as AvailabilityCheck['status'],
  providerMessage: row.provider_message || undefined,
  createdAt: row.created_at || new Date().toISOString(),
  updatedAt: row.updated_at || undefined,
  reviewedAt: row.reviewed_at || undefined,
  linkedBookingId: row.linked_reservation_id || undefined,
});

const toReservationMembersPayload = (reservationId: string, guests: BookingGuest[]) =>
  guests.map((guest, index) => {
    const rawLinkedUserId = guest.appUserId?.trim() || '';
    return {
      reservation_id: reservationId,
      role: index === 0 ? 'creator' : 'participant',
      linked_user_id: UUID_PATTERN.test(rawLinkedUserId) ? rawLinkedUserId : null,
      is_creator: index === 0,
      document_type: guest.documentType || null,
      first_name: guest.firstName || null,
      last_name: guest.lastName || null,
      dni_or_passport: guest.document || null,
      document_issuer_country: guest.documentIssuerCountry || null,
      nationality: guest.nationality || null,
      residence_country: guest.residenceCountry || guest.nationality || null,
      gender: guest.gender || null,
      email: guest.email || null,
      phone: guest.phone || null,
      country_calling_code: guest.countryCallingCode || null,
      phone_number: guest.phoneNumber || null,
      contact_relation: guest.contactRelation || null,
      allergies: guest.allergies || null,
      insurance_coverage: guest.insuranceCoverage || null,
      responsibility_declaration: guest.responsibilityDeclaration ?? null,
      birth_date: guest.birthDate || null,
      age: guest.age ?? null,
      has_experience: Boolean(guest.hasExperience),
      experience_level: guest.hasExperience ? (EXPERIENCE_LEVEL_TO_DB[guest.experienceLevel || ''] || guest.experienceLevel || null) : null,
      has_medical_insurance: Boolean(guest.insurance?.hasInsurance),
      insurance_name: guest.insurance?.provider || null,
      insurance_member_number: guest.insurance?.memberNumber || null,
      emergency_contact_name: guest.emergencyContactName || null,
      emergency_contact_phone: guest.emergencyContactPhone || null,
      trekking_notice_ascent_date: guest.trekkingNoticeAscentDate || null,
      trekking_notice_return_date: guest.trekkingNoticeReturnDate || null,
      trekking_notice_has_adequate_equipment: typeof guest.trekkingNoticeHasAdequateEquipment === 'boolean'
        ? guest.trekkingNoticeHasAdequateEquipment
        : null,
      trekking_notice_emergency_contact_name: guest.trekkingNoticeEmergencyContactName || null,
      trekking_notice_emergency_contact_phone: guest.trekkingNoticeEmergencyContactPhone || null,
      health_truth_declared: guest.healthDeclarationConfirmed ?? false,
      liability_accepted: guest.liabilityWaiverAccepted ?? false,
      liability_accepted_at: guest.liabilityWaiverAcceptedAt || null,
      liability_text_snapshot: guest.liabilityWaiverTextSnapshot || null,
      app_user_handle: guest.appUserHandle || null,
      health_declaration_answers: guest.healthDeclarationAnswers || {},
    };
  });

const ensureAuthenticated = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user) throw new Error('No se pudo iniciar sesión anónima en Supabase.');
  return data.user;
};

let authReadyPromise: Promise<void> | null = null;
const ensureSessionReady = async () => {
  if (!authReadyPromise) {
    authReadyPromise = ensureAuthenticated()
      .then(() => undefined)
      .catch((error) => {
        console.warn('No se pudo iniciar sesión anónima en Supabase; se continúa en modo anon.', error);
      });
  }
  await authReadyPromise;
};
const resolveChatProfileIds = async (profileId?: string): Promise<string[]> => {
  await ensureSessionReady();
  const ids = new Set<string>();
  if (profileId) ids.add(profileId);
  const { data: userData } = await supabase.auth.getUser();
  const authUserId = userData.user?.id;
  const authEmail = (userData.user?.email || '').trim().toLowerCase();
  let profileEmail = '';
  if (profileId) {
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', profileId)
      .maybeSingle();
    profileEmail = (currentProfile?.email || '').trim().toLowerCase();
  }
  if (!authUserId && !authEmail && !profileEmail) {
    return Array.from(ids);
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .or(
      [
        authUserId ? `auth_user_id.eq.${authUserId}` : null,
        authEmail ? `email.ilike.${authEmail}` : null,
        profileEmail ? `email.ilike.${profileEmail}` : null,
      ].filter(Boolean).join(',')
    );
  if (error) throw error;
  ensureArray<any>(data).forEach((row) => {
    if (row?.id) ids.add(row.id);
  });
  return Array.from(ids);
};
const isMissingRpcError = (error: unknown) =>
  typeof error === 'object'
  && error !== null
  && (
    String((error as { code?: unknown }).code || '') === '42883'
    || /function .* does not exist/i.test(String((error as { message?: unknown }).message || ''))
  );
const withRequestTimeout = async <T,>(promise: Promise<T>, message: string, ms = 120000): Promise<T> => {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = globalThis.setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timeoutId) {
      globalThis.clearTimeout(timeoutId);
    }
  }
};
const ADMIN_AUTH_STORAGE_KEY = 'cumbre-admin-auth';
const PROFILE_ADMIN_SELECT_WITH_STATUS = 'id, auth_user_id, full_name, email, username, role, account_status';
const PROFILE_ADMIN_SELECT = 'id, auth_user_id, full_name, email, username, role';
const PROFILE_MANAGED_SELECT_WITH_STATUS = 'id, auth_user_id, full_name, email, username, original_full_name, original_email, original_username, province, role, account_status, created_at, deleted_at, deleted_reason, deleted_by_profile_id, deleted_by_email, deletion_snapshot, updated_at';
const PROFILE_MANAGED_SELECT_WITH_CORE_STATUS = 'id, auth_user_id, full_name, email, username, province, role, account_status, created_at, deleted_at, updated_at';
const PROFILE_MANAGED_SELECT = 'id, auth_user_id, full_name, email, username, province, role, created_at, updated_at';

const profileColumnMissing = (error: any, column: 'account_status' | 'deleted_at' | 'original_full_name' | 'original_email' | 'original_username' | 'deleted_reason' | 'deleted_by_profile_id' | 'deleted_by_email' | 'deletion_snapshot') => {
  const errorText = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return errorText.includes(`profiles.${column}`) || errorText.includes(column);
};

const injectDefaultAccountStatus = <T>(data: T): T => {
  if (Array.isArray(data)) {
    return data.map((row) => ({
      ...row,
      account_status: row?.account_status || 'active',
      original_full_name: row?.original_full_name || null,
      original_email: row?.original_email || null,
      original_username: row?.original_username || null,
      deleted_at: row?.deleted_at || null,
      deleted_reason: row?.deleted_reason || null,
      deleted_by_profile_id: row?.deleted_by_profile_id || null,
      deleted_by_email: row?.deleted_by_email || null,
      deletion_snapshot: row?.deletion_snapshot || null,
    })) as T;
  }
  if (data && typeof data === 'object') {
    return {
      ...(data as any),
      account_status: (data as any).account_status || 'active',
      original_full_name: (data as any).original_full_name || null,
      original_email: (data as any).original_email || null,
      original_username: (data as any).original_username || null,
      deleted_at: (data as any).deleted_at || null,
      deleted_reason: (data as any).deleted_reason || null,
      deleted_by_profile_id: (data as any).deleted_by_profile_id || null,
      deleted_by_email: (data as any).deleted_by_email || null,
      deletion_snapshot: (data as any).deletion_snapshot || null,
    } as T;
  }
  return data;
};

const runProfilesSelectWithOptionalStatus = async <T>(runner: (selectClause: string) => Promise<{ data: T; error: any }>, managed = false) => {
  const withStatusSelect = managed ? PROFILE_MANAGED_SELECT_WITH_STATUS : PROFILE_ADMIN_SELECT_WITH_STATUS;
  const fallbackSelect = managed ? PROFILE_MANAGED_SELECT : PROFILE_ADMIN_SELECT;

  const firstAttempt = await runner(withStatusSelect);
  if (!firstAttempt.error) {
    return injectDefaultAccountStatus(firstAttempt.data);
  }
  if (
    managed
    && (
      profileColumnMissing(firstAttempt.error, 'original_full_name')
      || profileColumnMissing(firstAttempt.error, 'original_email')
      || profileColumnMissing(firstAttempt.error, 'original_username')
      || profileColumnMissing(firstAttempt.error, 'deleted_reason')
      || profileColumnMissing(firstAttempt.error, 'deleted_by_profile_id')
      || profileColumnMissing(firstAttempt.error, 'deleted_by_email')
      || profileColumnMissing(firstAttempt.error, 'deletion_snapshot')
    )
  ) {
    const secondAttempt = await runner(PROFILE_MANAGED_SELECT_WITH_CORE_STATUS as string);
    if (!secondAttempt.error) {
      return injectDefaultAccountStatus(secondAttempt.data);
    }
    if (
      !profileColumnMissing(secondAttempt.error, 'account_status')
      && !profileColumnMissing(secondAttempt.error, 'deleted_at')
    ) {
      throw secondAttempt.error;
    }
  }
  if (
    !profileColumnMissing(firstAttempt.error, 'account_status')
    && !profileColumnMissing(firstAttempt.error, 'deleted_at')
    && !profileColumnMissing(firstAttempt.error, 'original_full_name')
    && !profileColumnMissing(firstAttempt.error, 'original_email')
    && !profileColumnMissing(firstAttempt.error, 'original_username')
    && !profileColumnMissing(firstAttempt.error, 'deleted_reason')
    && !profileColumnMissing(firstAttempt.error, 'deleted_by_profile_id')
    && !profileColumnMissing(firstAttempt.error, 'deleted_by_email')
    && !profileColumnMissing(firstAttempt.error, 'deletion_snapshot')
  ) {
    throw firstAttempt.error;
  }

  const fallbackAttempt = await runner(fallbackSelect);
  if (fallbackAttempt.error) throw fallbackAttempt.error;
  return injectDefaultAccountStatus(fallbackAttempt.data);
};

const runProfilesMutationWithOptionalStatus = async <T>(runner: (includeStatusFields: boolean) => Promise<{ data?: T; error: any }>) => {
  const firstAttempt = await runner(true);
  if (!firstAttempt.error) return firstAttempt.data;
  if (!profileColumnMissing(firstAttempt.error, 'account_status') && !profileColumnMissing(firstAttempt.error, 'deleted_at')) {
    throw firstAttempt.error;
  }

  const fallbackAttempt = await runner(false);
  if (fallbackAttempt.error) throw fallbackAttempt.error;
  return fallbackAttempt.data;
};

const pickBestActiveAdminProfile = (
  candidates: any[],
  user: { id: string; email?: string | null },
  normalizedUsername: string
) => {
  const normalizedEmail = (user.email || '').trim().toLowerCase();
  const activeAdminCandidates = candidates.filter((candidate) => (
    candidate?.role === 'admin'
    && normalizeManagedAccountStatus(candidate?.account_status) === 'active'
  ));

  if (activeAdminCandidates.length === 0) return null;

  const scoreCandidate = (candidate: any) => {
    const candidateEmail = (candidate?.email || '').trim().toLowerCase();
    const candidateUsername = (candidate?.username || '').trim().toLowerCase();
    const authMatch = candidate?.auth_user_id === user.id ? 100 : 0;
    const emailMatch = normalizedEmail && candidateEmail === normalizedEmail ? 25 : 0;
    const usernameMatch = normalizedUsername && candidateUsername === normalizedUsername ? 10 : 0;
    const updatedAt = candidate?.updated_at ? new Date(candidate.updated_at).getTime() : 0;
    const createdAt = candidate?.created_at ? new Date(candidate.created_at).getTime() : 0;
    return authMatch + emailMatch + usernameMatch + (updatedAt || createdAt || 0) / 1_000_000_000_000;
  };

  return [...activeAdminCandidates].sort((left, right) => scoreCandidate(right) - scoreCandidate(left))[0] || null;
};

const findAdminProfileForUser = async (user: { id: string; email?: string | null }) => {
  const normalizedEmail = (user.email || '').trim().toLowerCase();
  const normalizedUsername = normalizedEmail ? normalizedEmail.split('@')[0] : '';
  const mergedCandidates = new Map<string, any>();

  const collectCandidates = (rows: any) => {
    ensureArray<any>(rows as any).forEach((candidate) => {
      if (candidate?.id) {
        mergedCandidates.set(candidate.id, candidate);
      }
    });
  };

  const profileByAuthRows = await runProfilesSelectWithOptionalStatus(
    (selectClause) => adminSupabase
      .from('profiles')
      .select(selectClause)
      .eq('auth_user_id', user.id)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false }),
    false
  );

  collectCandidates(profileByAuthRows);

  if (normalizedEmail) {
    const profileByEmailRows = await runProfilesSelectWithOptionalStatus(
      (selectClause) => adminSupabase
        .from('profiles')
        .select(selectClause)
        .ilike('email', normalizedEmail)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false }),
      false
    );

    collectCandidates(profileByEmailRows);
  }

  if (normalizedUsername) {
    const profileByUsernameRows = await runProfilesSelectWithOptionalStatus(
      (selectClause) => adminSupabase
        .from('profiles')
        .select(selectClause)
        .ilike('username', normalizedUsername)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false }),
      false
    );

    collectCandidates(profileByUsernameRows);
  }

  let profile = pickBestActiveAdminProfile(Array.from(mergedCandidates.values()), user, normalizedUsername);

  if (!profile) {
    const { data: existingAdminRows, error: existingAdminError } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);
    if (existingAdminError) throw existingAdminError;

    const hasAnyAdmin = ensureArray<any>(existingAdminRows).length > 0;
    if (!hasAnyAdmin) {
      const fallbackName = (user.email || 'Administrador').split('@')[0] || 'Administrador';
      const bootstrapPayload = {
        auth_user_id: user.id,
        full_name: fallbackName,
        email: normalizedEmail || null,
        username: makeUserName(fallbackName),
        role: 'admin',
        updated_at: new Date().toISOString(),
      };

      const insertedProfile = await runProfilesMutationWithOptionalStatus<any>((includeStatusFields) => {
        const payload = includeStatusFields
          ? { ...bootstrapPayload, account_status: 'active' }
          : bootstrapPayload;
        return adminSupabase
          .from('profiles')
          .insert(payload)
          .select(includeStatusFields ? PROFILE_ADMIN_SELECT_WITH_STATUS : PROFILE_ADMIN_SELECT)
          .single();
      });
      profile = insertedProfile;
    }
  }

  if (!profile || profile.role !== 'admin' || normalizeManagedAccountStatus(profile.account_status) !== 'active') return null;

  const profileEmail = (profile.email || '').trim().toLowerCase();
  const needsRepair = profile.auth_user_id !== user.id || (normalizedEmail && profileEmail !== normalizedEmail);
  if (needsRepair) {
    const repairPayload: Record<string, string> = {
      auth_user_id: user.id,
      updated_at: new Date().toISOString(),
    };
    if (normalizedEmail && profileEmail !== normalizedEmail) {
      repairPayload.email = normalizedEmail;
    }

    const { error: repairError } = await adminSupabase
      .from('profiles')
      .update(repairPayload)
      .eq('id', profile.id);
    if (repairError) {
      console.warn('No se pudo reparar el vinculo del perfil admin con Auth:', repairError);
    } else {
      profile = {
        ...profile,
        auth_user_id: user.id,
        email: normalizedEmail || profile.email,
      };
    }
  }

  return profile;
};

const mapManagedUserRow = (row: any): ManagedUser | null => {
  if (!row?.id || !row?.email || !isManagedUserRole(row.role)) return null;
  return {
    id: row.id,
    authUserId: row.auth_user_id || undefined,
    email: row.email || '',
    fullName: row.full_name || 'Usuario',
    username: row.username || '',
    originalFullName: row.original_full_name || undefined,
    originalEmail: row.original_email || undefined,
    originalUsername: row.original_username || undefined,
    province: row.province || undefined,
    role: row.role,
    accountStatus: normalizeManagedAccountStatus(row.account_status),
    accountType: getManagedAccountType(row.role),
    createdAt: row.created_at || undefined,
    deletedAt: row.deleted_at || undefined,
    deletedReason: row.deleted_reason || undefined,
    deletedByProfileId: row.deleted_by_profile_id || undefined,
    deletedByEmail: row.deleted_by_email || undefined,
    deletionSnapshot: row.deletion_snapshot || undefined,
    updatedAt: row.updated_at || undefined,
  };
};

export const cumbreApi = {
  async signInAdmin(identifier: string, password: string) {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    if (!normalizedIdentifier || !password) {
      throw new Error('Ingresá email o usuario y contraseña.');
    }

    try {
      await adminSupabase.auth.signOut();
    } catch (error) {
      console.warn('No se pudo limpiar la sesion previa antes del login admin:', error);
    }
    try {
      localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    } catch (error) {
      console.warn('No se pudo limpiar el storage local del admin antes del login:', error);
    }

    let resolvedEmail = normalizedIdentifier;
    if (!normalizedIdentifier.includes('@')) {
      const matchedProfiles = await runProfilesSelectWithOptionalStatus(
        (selectClause) => adminSupabase
          .from('profiles')
          .select(selectClause)
          .ilike('username', normalizedIdentifier)
          .order('updated_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false, nullsFirst: false }),
        false
      );
      const matchedProfile = pickBestActiveAdminProfile(
        ensureArray<any>(matchedProfiles as any),
        { id: '', email: null },
        normalizedIdentifier
      );

      if (!matchedProfile?.email) {
        throw new Error('No encontramos un administrador con ese usuario.');
      }

      resolvedEmail = matchedProfile.email.trim().toLowerCase();
    }

    let data: { user: any } | null = null;
    let error: any = null;
    try {
      const result = await adminSupabase.auth.signInWithPassword({
        email: resolvedEmail,
        password,
      });
      data = result.data;
      error = result.error;
    } catch (authError: any) {
      const rawMessage = String(authError?.message || '');
      if (/load failed|failed to fetch|networkerror/i.test(rawMessage)) {
        throw new Error('No se pudo conectar con el servicio de acceso del portal. Probá recargando la página.');
      }
      throw authError;
    }
    if (error) throw error;

    const user = data.user;
    if (!user) {
      throw new Error('No se pudo iniciar sesión.');
    }

    const profile = await findAdminProfileForUser(user);
    if (!profile || profile.role !== 'admin') {
      await adminSupabase.auth.signOut();
      throw new Error('Tu cuenta no tiene permisos de administrador.');
    }

    return {
      id: profile.id,
      authUserId: profile.auth_user_id || user.id,
      fullName: profile.full_name || 'Administrador',
      email: profile.email || resolvedEmail,
      username: profile.username || '',
      role: profile.role || 'admin',
    };
  },

  async getAdminSessionProfile() {
    const { data: sessionData, error: sessionError } = await adminSupabase.auth.getSession();
    if (sessionError) throw sessionError;
    const user = sessionData.session?.user;
    if (!user) return null;

    const profile = await findAdminProfileForUser(user);
    if (!profile || profile.role !== 'admin') return null;

    return {
      id: profile.id,
      authUserId: profile.auth_user_id || user.id,
      fullName: profile.full_name || 'Administrador',
      email: profile.email || user.email || '',
      username: profile.username || '',
      role: profile.role || 'admin',
    };
  },

  async updateAdminProfile(input: {
    fullName: string;
    username: string;
    email: string;
    currentPassword?: string;
    newPassword?: string;
  }) {
    const { data: sessionData, error: sessionError } = await adminSupabase.auth.getSession();
    if (sessionError) throw sessionError;
    const user = sessionData.session?.user;
    if (!user) throw new Error('No hay una sesión administrativa activa.');

    const profile = await findAdminProfileForUser(user);
    if (!profile || profile.role !== 'admin') {
      throw new Error('Tu cuenta no tiene permisos de administrador.');
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const nextFullName = input.fullName.trim();
    const nextUsername = input.username.trim();
    if (!normalizedEmail || !nextFullName || !nextUsername) {
      throw new Error('Completá nombre, usuario y email.');
    }

    if (input.newPassword) {
      const { error: verifyError } = await adminSupabase.auth.signInWithPassword({
        email: profile.email || normalizedEmail,
        password: input.currentPassword || '',
      });
      if (verifyError) {
        throw new Error('La contraseña actual no coincide.');
      }
    }

    const authPayload: { email?: string; password?: string } = {};
    if (normalizedEmail !== (profile.email || '').trim().toLowerCase()) {
      authPayload.email = normalizedEmail;
    }
    if (input.newPassword) {
      authPayload.password = input.newPassword;
    }
    if (authPayload.email || authPayload.password) {
      const { error: authUpdateError } = await adminSupabase.auth.updateUser(authPayload);
      if (authUpdateError) throw authUpdateError;
    }

    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update({
        full_name: nextFullName,
        username: nextUsername,
        email: normalizedEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);
    if (updateError) throw updateError;

    return {
      id: profile.id,
      authUserId: profile.auth_user_id || user.id,
      fullName: nextFullName,
      email: normalizedEmail,
      username: nextUsername,
      role: profile.role || 'admin',
    };
  },

  async listManagedUsers(): Promise<ManagedUser[]> {
    const data = await runProfilesSelectWithOptionalStatus(
      (selectClause) => adminSupabase
        .from('profiles')
        .select(selectClause)
        .in('role', ['explorer', 'provider', 'both', 'admin'])
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false }),
      true
    );
    return ensureArray<any>(data).map(mapManagedUserRow).filter(Boolean) as ManagedUser[];
  },

  async createManagedUser(input: {
    email: string;
    password: string;
    fullName: string;
    username: string;
    role: ManagedUserRole;
    province?: string;
  }): Promise<ManagedUser> {
    const email = input.email.trim().toLowerCase();
    const password = input.password;
    const fullName = input.fullName.trim();
    const username = input.username.trim();
    const role = input.role;
    if (!email || !password || !fullName || !username || !isManagedUserRole(role)) {
      throw new Error('Completá email, contraseña, nombre, usuario y rol.');
    }
    if (role !== 'admin') {
      throw new Error('Desde Usuarios solo podés crear cuentas admin.');
    }
    const { data: functionData, error: functionError } = await adminSupabase.functions.invoke('manage-admin-user', {
      body: {
        action: 'create',
        email,
        password,
        fullName,
        username,
        province: input.province?.trim() || null,
      },
    });
    if (!functionError && functionData?.user) {
      const createdFromFunction = mapManagedUserRow(functionData.user);
      if (createdFromFunction && createdFromFunction.role === 'admin' && createdFromFunction.email.trim().toLowerCase() === email) {
        return createdFromFunction;
      }
    }

    const signupClient = createIsolatedSupabaseClient(`cumbre-admin-signup-${Date.now()}`);
    const { data: authData, error: authError } = await signupClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username,
          role: 'admin',
          province: input.province?.trim() || null,
        },
      },
    });
    if (authError) throw authError;

    const authUserId = authData.user?.id;
    if (!authUserId) {
      throw new Error('No se pudo crear el usuario en autenticación.');
    }

    await signupClient.auth.signOut().catch(() => undefined);

    const { data: profileData, error: profileError } = await adminSupabase.rpc('upsert_admin_profile', {
      p_auth_user_id: authUserId,
      p_email: email,
      p_full_name: fullName,
      p_username: username,
      p_province: input.province?.trim() || null,
    });
    if (profileError) throw profileError;

    const createdFromRpc = mapManagedUserRow(ensureArray<any>(profileData)[0]);
    if (createdFromRpc && createdFromRpc.role === 'admin' && createdFromRpc.email.trim().toLowerCase() === email) {
      return createdFromRpc;
    }

    const verifiedRows = await runProfilesSelectWithOptionalStatus(
      (selectClause) => adminSupabase
        .from('profiles')
        .select(selectClause)
        .or(`auth_user_id.eq.${authUserId},email.ilike.${email}`)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(1),
      true
    );

    const created = mapManagedUserRow(ensureArray<any>(verifiedRows)[0]);
    if (!created || created.role !== 'admin' || created.email.trim().toLowerCase() !== email) {
      throw new Error('El admin no quedó confirmado en la base.');
    }
    return created;
  },

  async updateManagedUser(input: {
    id: string;
    fullName: string;
    username: string;
    role: ManagedUserRole;
    province?: string;
  }): Promise<ManagedUser> {
    if (!input.id || !input.fullName.trim() || !input.username.trim() || !isManagedUserRole(input.role)) {
      throw new Error('Completá nombre, usuario y rol.');
    }

    const payload = {
      full_name: input.fullName.trim(),
      username: input.username.trim(),
      role: input.role,
      province: input.province?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await adminSupabase.from('profiles').update(payload).eq('id', input.id);
    if (error) throw error;

    const data = await runProfilesSelectWithOptionalStatus(
      (selectClause) => adminSupabase
        .from('profiles')
        .select(selectClause)
        .eq('id', input.id)
        .maybeSingle(),
      true
    );
    const updated = mapManagedUserRow(data);
    if (!updated) throw new Error('No se pudo resolver el usuario actualizado.');
    return updated;
  },

  async setManagedUserStatus(
    id: string,
    status: ManagedAccountStatus,
    options?: { reason?: string }
  ): Promise<ManagedUser> {
    if (!id) throw new Error('Falta el usuario.');
    if (status === 'deleted') {
      const normalizedReason = (options?.reason || '').trim();
      if (!normalizedReason) {
        throw new Error('Escribí un motivo de eliminación.');
      }
      const targetRows = await runProfilesSelectWithOptionalStatus(
        (selectClause) => adminSupabase
          .from('profiles')
          .select(selectClause)
          .eq('id', id)
          .limit(1),
        true
      );
      const targetBeforeDelete = mapManagedUserRow(ensureArray<any>(targetRows)[0]);
      const { data: sessionData, error: sessionError } = await adminSupabase.auth.getSession();
      if (sessionError) throw sessionError;
      const actorUser = sessionData.session?.user;
      const actorProfile = actorUser ? await findAdminProfileForUser(actorUser) : null;

      const auditPayload = {
        original_full_name: targetBeforeDelete?.originalFullName || targetBeforeDelete?.fullName || null,
        original_email: targetBeforeDelete?.originalEmail || targetBeforeDelete?.email || null,
        original_username: targetBeforeDelete?.originalUsername || targetBeforeDelete?.username || null,
        deleted_reason: normalizedReason,
        deleted_by_profile_id: actorProfile?.id || null,
        deleted_by_email: actorProfile?.email || actorUser?.email || null,
        deletion_snapshot: {
          id: targetBeforeDelete?.id || id,
          authUserId: targetBeforeDelete?.authUserId || null,
          fullName: targetBeforeDelete?.fullName || null,
          email: targetBeforeDelete?.email || null,
          username: targetBeforeDelete?.username || null,
          originalFullName: targetBeforeDelete?.originalFullName || null,
          originalEmail: targetBeforeDelete?.originalEmail || null,
          originalUsername: targetBeforeDelete?.originalUsername || null,
          province: targetBeforeDelete?.province || null,
          role: targetBeforeDelete?.role || null,
          accountStatus: targetBeforeDelete?.accountStatus || null,
          accountType: targetBeforeDelete?.accountType || null,
          createdAt: targetBeforeDelete?.createdAt || null,
          updatedAt: targetBeforeDelete?.updatedAt || null,
          deletedReason: normalizedReason,
          deletedByProfileId: actorProfile?.id || null,
          deletedByEmail: actorProfile?.email || actorUser?.email || null,
          capturedAt: new Date().toISOString(),
        },
      };

      const { error: preDeleteAuditError } = await adminSupabase
        .from('profiles')
        .update(auditPayload)
        .eq('id', id);
      if (preDeleteAuditError) {
        if (
          profileColumnMissing(preDeleteAuditError, 'deleted_reason')
          || profileColumnMissing(preDeleteAuditError, 'deleted_by_profile_id')
          || profileColumnMissing(preDeleteAuditError, 'deleted_by_email')
          || profileColumnMissing(preDeleteAuditError, 'deletion_snapshot')
        ) {
          throw new Error('Falta aplicar la migración de auditoría de usuarios antes de eliminar cuentas.');
        }
        throw preDeleteAuditError;
      }

      const ensureDeletedHistory = async (deletedUser: ManagedUser | null) => {
        if (!deletedUser || !targetBeforeDelete) return deletedUser;
        const needsOriginalHistory =
          !deletedUser.originalEmail
          || !deletedUser.originalFullName
          || !deletedUser.originalUsername
          || !deletedUser.deletedReason
          || !deletedUser.deletedByEmail;
        if (!needsOriginalHistory) return deletedUser;

        const repairPayload: Record<string, string> = {};
        if (!deletedUser.originalEmail && targetBeforeDelete.email) {
          repairPayload.original_email = targetBeforeDelete.originalEmail || targetBeforeDelete.email;
        }
        if (!deletedUser.originalFullName && targetBeforeDelete.fullName) {
          repairPayload.original_full_name = targetBeforeDelete.originalFullName || targetBeforeDelete.fullName;
        }
        if (!deletedUser.originalUsername && targetBeforeDelete.username) {
          repairPayload.original_username = targetBeforeDelete.originalUsername || targetBeforeDelete.username;
        }
        if (!deletedUser.deletedReason) {
          repairPayload.deleted_reason = normalizedReason;
        }
        if (!deletedUser.deletedByProfileId && actorProfile?.id) {
          repairPayload.deleted_by_profile_id = actorProfile.id;
        }
        if (!deletedUser.deletedByEmail && (actorProfile?.email || actorUser?.email)) {
          repairPayload.deleted_by_email = actorProfile?.email || actorUser?.email || '';
        }

        if (Object.keys(repairPayload).length === 0) return deletedUser;

        const { error: repairError } = await adminSupabase
          .from('profiles')
          .update(repairPayload)
          .eq('id', id);
        if (repairError) throw repairError;

        const repairedRows = await runProfilesSelectWithOptionalStatus(
          (selectClause) => adminSupabase
            .from('profiles')
            .select(selectClause)
            .eq('id', id)
            .limit(1),
          true
        );
        return mapManagedUserRow(ensureArray<any>(repairedRows)[0]);
      };

      const { data: functionData, error: functionError } = await adminSupabase.functions.invoke('manage-admin-user', {
        body: {
          action: 'delete',
          profileId: id,
          reason: normalizedReason,
          deletedByProfileId: actorProfile?.id || null,
          deletedByEmail: actorProfile?.email || actorUser?.email || null,
          deletionSnapshot: auditPayload.deletion_snapshot,
        },
      });
      if (!functionError && functionData?.user) {
        const deletedFromFunction = await ensureDeletedHistory(mapManagedUserRow(functionData.user));
        if (!deletedFromFunction) throw new Error('No se pudo resolver el usuario eliminado.');
        return deletedFromFunction;
      }

      const { data, error } = await adminSupabase.rpc('delete_managed_account', {
        p_profile_id: id,
      });
      if (error) throw error;
      const deleted = await ensureDeletedHistory(mapManagedUserRow(ensureArray<any>(data)[0]));
      if (!deleted) throw new Error('No se pudo resolver el usuario eliminado.');
      return deleted;
    }

    await runProfilesMutationWithOptionalStatus((includeStatusFields) => {
      const payload = includeStatusFields
        ? {
            account_status: status,
            deleted_at: status === 'deleted' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }
        : {
            updated_at: new Date().toISOString(),
          };
      return adminSupabase.from('profiles').update(payload).eq('id', id);
    });

    const data = await runProfilesSelectWithOptionalStatus(
      (selectClause) => adminSupabase
        .from('profiles')
        .select(selectClause)
        .eq('id', id)
        .maybeSingle(),
      true
    );
    const updated = mapManagedUserRow(data);
    if (!updated) throw new Error('No se pudo resolver el estado de la cuenta.');
    return updated;
  },

  async ensureAuthProfile(input: AuthProfileInput) {
    const user = await ensureAuthenticated();
    const oauthAvatarUrl = getOAuthAvatarUrl(user);
    const resolvedAvatarUrl = !isPlaceholderAvatarUrl(input.avatarUrl)
      ? input.avatarUrl
      : oauthAvatarUrl || input.avatarUrl;
    const fallbackUserName = makeUserName(input.name);
    const existingByAuth = await runProfilesSelectWithOptionalStatus(
      (selectClause) => supabase
        .from('profiles')
        .select(selectClause === PROFILE_ADMIN_SELECT_WITH_STATUS ? '*' : '*')
        .eq('auth_user_id', user.id)
        .maybeSingle(),
      false
    );
    let existingProfile = existingByAuth;

    // Cross-provider merge: reuse same profile when email matches.
    if (!existingProfile && input.email) {
      const { data: existingByEmailRows } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', input.email)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false });
      const existingByEmail = ensureArray<any>(existingByEmailRows).find((profile) => profile.auth_user_id === user.id)
        || ensureArray<any>(existingByEmailRows).find((profile) => isProviderRole(profile.role))
        || ensureArray<any>(existingByEmailRows)[0];
      if (existingByEmail) {
        existingProfile = existingByEmail;
      }
    }

    const existingStatus = normalizeManagedAccountStatus(existingProfile?.account_status);
    if (existingProfile && existingStatus !== 'active') {
      await supabase.auth.signOut().catch(() => undefined);
      throw new Error(existingStatus === 'deleted'
        ? 'Tu cuenta fue eliminada y no puede volver a ingresar.'
        : 'Tu cuenta está inhabilitada. Contactá al administrador.');
    }

    if (existingProfile?.role === 'admin') {
      await supabase.auth.signOut().catch(() => undefined);
      throw new Error('Esta cuenta es administrativa. Ingresá desde el portal.');
    }

    const nowUserName = existingProfile?.username || `${fallbackUserName}_${Date.now().toString().slice(-5)}`;
    // Provider role must never be granted from client-side registration intent.
    // Keep provider/both only if it already exists (typically set by admin approval flow).
    const role = existingProfile?.role === 'admin'
      ? 'admin'
      : isProviderRole(existingProfile?.role)
        ? existingProfile.role
        : 'explorer';
    const payload = {
      auth_user_id: user.id,
      username: nowUserName,
      full_name: input.name || existingProfile?.full_name || 'Usuario',
      email: input.email || existingProfile?.email || null,
      phone: input.phone || existingProfile?.phone || null,
      birth_date: input.birthDate || existingProfile?.birth_date || null,
      instagram_handle: input.instagram || existingProfile?.instagram_handle || null,
      avatar_url: resolvedAvatarUrl || existingProfile?.avatar_url || null,
      role,
      updated_at: new Date().toISOString(),
    };

    let profileId = existingProfile?.id as string | undefined;
    if (!existingProfile) {
      const inserted = await runProfilesMutationWithOptionalStatus<any>((includeStatusFields) =>
        supabase
          .from('profiles')
          .insert(includeStatusFields ? { ...payload, account_status: 'active' } : payload)
          .select('id')
          .single()
      );
      profileId = inserted.id;
    } else {
      await runProfilesMutationWithOptionalStatus((includeStatusFields) =>
        supabase
          .from('profiles')
          .update(includeStatusFields ? { ...payload, account_status: 'active' } : payload)
          .eq('id', existingProfile.id)
      );
    }

    if (!profileId) throw new Error('No se pudo resolver perfil actual.');

    // Optional bridge fields while schema is being normalized.
    // These updates are best-effort so auth flow does not break if columns are missing.
    if (typeof input.provincia !== 'undefined') {
      try {
        await supabase.from('profiles').update({ province: input.provincia || null }).eq('id', profileId);
      } catch (error) {
        console.warn('No se pudo guardar province en profiles (columna opcional):', error);
      }
    }

    if (isProviderRole(role)) {
      await supabase.from('provider_profiles').upsert({
        user_id: profileId,
        provider_kind: 'operator',
        accepts_bookings: true,
        display_name: input.name || null,
      });
    } else {
      const explorerPayload: any = {
        user_id: profileId,
        explorer_level: 'nivel_1',
      };
      if (typeof input.preferredSports !== 'undefined') {
        explorerPayload.preferred_sports = input.preferredSports;
      }
      try {
        await supabase.from('explorer_profiles').upsert(explorerPayload);
      } catch (error) {
        // fallback for schemas without preferred_sports yet
        await supabase.from('explorer_profiles').upsert({
          user_id: profileId,
          explorer_level: 'nivel_1',
        });
        console.warn('No se pudo guardar preferred_sports en explorer_profiles (columna opcional):', error);
      }
    }

    return { authUserId: user.id, profileId, username: nowUserName };
  },

  async getCurrentProfile() {
    const user = await ensureAuthenticated();
    const data = await runProfilesSelectWithOptionalStatus(
      (selectClause) => supabase
        .from('profiles')
        .select(selectClause === PROFILE_ADMIN_SELECT_WITH_STATUS ? '*' : '*')
        .eq('auth_user_id', user.id)
        .maybeSingle(),
      false
    );
    if (data && normalizeManagedAccountStatus(data.account_status) !== 'active') {
      await supabase.auth.signOut().catch(() => undefined);
      return null;
    }
    return data;
  },

  async getRefugios() {
    try {
      const { data, error } = await publicSupabase
        .from('listings')
        .select('*, listing_refuge_details(*), listing_media(*), listing_amenities(*), listing_reservation_requirements(*)')
        .eq('listing_type', 'refuge')
        .eq('status', 'published')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const dedupedRows = dedupeLikelyEditedListingRows(ensureArray<any>(data));
      return attachListingReviews(dedupedRows.map(mapListingToSpot));
    } catch (error) {
      console.error('Falling back to seed refugios:', error);
      return [];
    }
  },

  async getRefugioDetail(id: string) {
    const { data, error } = await publicSupabase
      .from('listings')
      .select('*, listing_refuge_details(*), listing_media(*), listing_amenities(*), listing_reservation_requirements(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    const [spot] = await attachListingReviews([mapListingToSpot(data)]);
    return spot;
  },

  async getActividades() {
    try {
      const { data, error } = await publicSupabase
        .from('listings')
        .select('*, listing_activity_details(*), listing_expedition_details(*), listing_media(*), listing_amenities(*), listing_personal_equipment(*), listing_reservation_requirements(*)')
        .in('listing_type', ['activity', 'course', 'event', 'training', 'expedition'])
        .eq('status', 'published')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const dedupedRows = dedupeLikelyEditedListingRows(ensureArray<any>(data));
      const liveActividades = dedupedRows.map(mapListingToSpot);
      return attachListingReviews(liveActividades);
    } catch (error) {
      console.error('Falling back to seed actividades:', error);
      return [];
    }
  },

  async getActivityDetail(id: string) {
    const { data, error } = await publicSupabase
      .from('listings')
      .select('*, listing_activity_details(*), listing_expedition_details(*), listing_media(*), listing_amenities(*), listing_personal_equipment(*), listing_reservation_requirements(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    const [spot] = await attachListingReviews([mapListingToSpot(data)]);
    return spot;
  },

  async getListingReviews(listingIds: string[]): Promise<Record<string, Review[]>> {
    const uniqueListingIds = Array.from(new Set(listingIds.filter(Boolean)));
    if (uniqueListingIds.length === 0) return {};

    try {
      const { data, error } = await publicSupabase
        .from('listing_reviews')
        .select('id, listing_id, author_user_id, author_name_snapshot, author_avatar_snapshot, rating, comment, created_at')
        .in('listing_id', uniqueListingIds)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return ensureArray<any>(data).reduce((acc, row) => {
        const review = mapListingReview(row);
        if (!acc[row.listing_id]) acc[row.listing_id] = [];
        acc[row.listing_id].push(review);
        return acc;
      }, {} as Record<string, Review[]>);
    } catch (error) {
      console.error('No se pudieron cargar reseñas de listings:', error);
      return {};
    }
  },

  async saveListingReview(input: {
    listingId: string;
    authorUserId?: string;
    authorNameSnapshot: string;
    authorAvatarSnapshot: string;
    rating: number;
    comment: string;
  }) {
    await ensureSessionReady();
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_listing_review_for_profile', {
      p_listing_id: input.listingId,
      p_profile_id: null,
      p_author_name_snapshot: input.authorNameSnapshot.trim() || 'Usuario',
      p_author_avatar_snapshot: input.authorAvatarSnapshot?.trim() || '',
      p_rating: input.rating,
      p_comment: input.comment.trim(),
    });
    if (!rpcError && rpcData) {
      return mapListingReview(rpcData);
    }
    if (rpcError && rpcError.code !== '42883') {
      throw rpcError;
    }
    if (!input.authorUserId) {
      throw rpcError || new Error('No profile id available for listing review fallback insert.');
    }

    const { data, error } = await supabase
      .from('listing_reviews')
      .insert({
        listing_id: input.listingId,
        author_user_id: input.authorUserId,
        author_name_snapshot: input.authorNameSnapshot.trim() || 'Usuario',
        author_avatar_snapshot: input.authorAvatarSnapshot?.trim() || '',
        rating: input.rating,
        comment: input.comment.trim(),
      })
      .select('id, listing_id, author_user_id, author_name_snapshot, author_avatar_snapshot, rating, comment, created_at')
      .single();
    if (error) throw error;
    return mapListingReview(data);
  },

  async getRefugeApplications() {
    await ensureSessionReady();
    const { data: appRows, error: appError } = await supabase
      .from('refuge_applications')
      .select('*, listings(provider_user_id)')
      .order('submitted_at', { ascending: false });
    if (appError) throw appError;

    return ensureArray<any>(appRows)
      .map((row) => {
        const providerProfileId = row.listings?.provider_user_id || row.spot_snapshot?.providerUserId || row.spot_snapshot?.organizerUserId || undefined;
        const nextSpot = {
          ...mapRefugeSnapshotToSpot(row.spot_snapshot),
          organizerUserId: providerProfileId || mapRefugeSnapshotToSpot(row.spot_snapshot).organizerUserId,
        };
        return {
          id: row.id,
          listingId: row.listing_id,
          providerProfileId,
          title: row.title || row.spot_snapshot?.name || 'Refugio',
          providerName: row.provider_name || row.spot_snapshot?.organizerName || 'Prestador',
          status: (row.status || 'pending') as 'pending' | 'approved' | 'rejected',
          submittedAt: row.submitted_at || row.created_at || new Date().toISOString(),
          reviewedAt: row.reviewed_at || undefined,
          spot: nextSpot,
          documents: {
            concession: row.spot_snapshot?.uploadedDocConcessionFileUrl || undefined,
            permit: row.spot_snapshot?.uploadedDocPermitFileUrl || undefined,
            insurance: row.spot_snapshot?.uploadedDocInsuranceFileUrl || undefined,
            taxStatus: row.spot_snapshot?.uploadedDocTaxStatusFileUrl || undefined,
          },
        } satisfies RefugeApplication;
      });
  },

  async setRefugeApplicationStatus(id: string, status: RefugeApplicationStatus) {
    await ensureSessionReady();
    const reviewedAt = status === 'pending' ? null : new Date().toISOString();
    const { data, error } = await supabase
      .from('refuge_applications')
      .update({
        status,
        reviewed_at: reviewedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    const listingStatus = toDbListingStatus(status);
    const isActive = status !== 'rejected';
    const { error: listingError } = await supabase
      .from('listings')
      .update({
        status: listingStatus,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.listing_id);
    if (listingError) throw listingError;
    const { data: refreshedListing, error: refreshedListingError } = await supabase
      .from('listings')
      .select('provider_user_id')
      .eq('id', data.listing_id)
      .maybeSingle();
    if (refreshedListingError) throw refreshedListingError;

    const nextSpot = mapRefugeSnapshotToSpot(data.spot_snapshot);
    return {
      id: data.id,
      listingId: data.listing_id,
      providerProfileId: refreshedListing?.provider_user_id || nextSpot.organizerUserId || undefined,
      title: data.title || nextSpot.name || 'Refugio',
      providerName: data.provider_name || nextSpot.organizerName || 'Prestador',
      status: (data.status || 'pending') as RefugeApplicationStatus,
      submittedAt: data.submitted_at || data.created_at || new Date().toISOString(),
      reviewedAt: data.reviewed_at || undefined,
      spot: nextSpot,
      documents: {
        concession: data.spot_snapshot?.uploadedDocConcessionFileUrl || undefined,
        permit: data.spot_snapshot?.uploadedDocPermitFileUrl || undefined,
        insurance: data.spot_snapshot?.uploadedDocInsuranceFileUrl || undefined,
        taxStatus: data.spot_snapshot?.uploadedDocTaxStatusFileUrl || undefined,
      },
    } satisfies RefugeApplication;
  },

  async sendSystemNotification(
    recipientUserId: string,
    title: string,
    body: string,
    actorUserId?: string,
    type:
      | 'booking_created'
      | 'booking_pending_review'
      | 'booking_confirmed'
      | 'booking_rejected'
      | 'booking_cancelled'
      | 'booking_updated'
      | 'booking_added_as_participant'
      | 'friend_request_received'
      | 'friend_request_accepted'
      | 'post_liked'
      | 'post_commented'
      | 'comment_liked'
      | 'mentioned_in_post' = 'booking_updated'
  ) {
    await ensureSessionReady();
    const { error } = await supabase.from('notifications').insert({
      recipient_user_id: recipientUserId,
      actor_user_id: actorUserId || null,
      title,
      body,
      type,
      is_read: false,
    });
    if (error) throw error;
  },

  async resolveProfileIdByEmail(email?: string): Promise<string | null> {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return null;
    await ensureSessionReady();
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.id || null;
  },

  subscribeToUserNotifications(profileId: string, onChange: () => void): RealtimeSubscription {
    const channel = supabase
      .channel(`notifications:${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${profileId}`,
        },
        () => onChange()
      )
      .subscribe();

    return {
      unsubscribe: () => supabase.removeChannel(channel),
    };
  },

  subscribeToOperationalChanges(onChange: () => void): RealtimeSubscription {
    const channel = supabase
      .channel('operational-content')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refuge_applications' }, () => onChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => onChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => onChange())
      .subscribe();

    return {
      unsubscribe: () => supabase.removeChannel(channel),
    };
  },

  subscribeToSocialChanges(profileId: string, onChange: () => void): RealtimeSubscription {
    const channel = supabase
      .channel(`social:${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => onChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => onChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, () => onChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_likes' }, () => onChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => onChange())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `from_user_id=eq.${profileId}` },
        () => onChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `to_user_id=eq.${profileId}` },
        () => onChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${profileId}` },
        () => onChange()
      )
      .subscribe();

    return {
      unsubscribe: () => supabase.removeChannel(channel),
    };
  },

  async upsertRefugeApplication(input: {
    listingId: string;
    title: string;
    providerName: string;
    province: string;
    status?: 'pending' | 'approved' | 'rejected';
    spot?: OutdoorSpot;
  }) {
    const payload = {
      id: `refuge-app-${input.listingId}`,
      listing_id: input.listingId,
      title: input.title || 'Refugio',
      provider_name: input.providerName || 'Prestador',
      province: input.province || '',
      status: input.status || 'pending',
      spot_snapshot: input.spot || null,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('refuge_applications')
      .upsert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async createRefugeSubmission(spot: Record<string, any>) {
    const { data, error } = await supabase.rpc('create_refuge_submission', {
      p_spot: spot,
    });
    if (error) throw error;
    return data;
  },

  async saveSpot(spot: OutdoorSpot, providerProfileId: string, desiredStatus: 'pending' | 'approved' | 'rejected' = 'approved') {
    const listingType = resolveListingType(spot);
    const dbStatus = listingType === 'refuge' ? toDbListingStatus(desiredStatus) : 'published';
    if (listingType !== 'refuge') {
      if (!spot.expeditionCapacity || spot.expeditionCapacity <= 0) {
        throw new Error('La actividad debe tener cupo disponible mayor a 0.');
      }
      if (!spot.expeditionStartDate || !spot.expeditionEndDate) {
        throw new Error('La actividad debe tener fecha de inicio y fin.');
      }
      if (!spot.expeditionDays || spot.expeditionDays <= 0) {
        throw new Error('La actividad debe tener cantidad de días mayor a 0.');
      }
      if (spot.expeditionNights === undefined || spot.expeditionNights < 0) {
        throw new Error('La actividad debe tener cantidad de noches válida.');
      }
    }
    const refugeCapacity = Math.max(
      Number(spot.camasCount || 0) + Number(spot.carpasCount || 0),
      0
    );
    const normalizedCapacity = listingType === 'refuge'
      ? (refugeCapacity > 0 ? refugeCapacity : 1)
      : (spot.expeditionCapacity || null);
    const { data: previousRequirementsRow } = await supabase
      .from('listing_reservation_requirements')
      .select('require_physical_fitness_certificate, require_medical_insurance, require_health_declaration, require_liability_waiver, liability_waiver_text, require_emergency_contact')
      .eq('listing_id', spot.id)
      .maybeSingle();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = getLocalDateKey(today);
    const hasEnrollmentWindow = Boolean(spot.enrollmentStartDate && spot.enrollmentEndDate);
    const computedIsAcceptingEnrollments = Boolean(
      spot.allowEnrollment &&
      hasEnrollmentWindow &&
      todayKey >= String(spot.enrollmentStartDate || '') &&
      todayKey <= String(spot.enrollmentEndDate || '')
    );

    const listingPayload: any = {
      id: spot.id,
      provider_user_id: providerProfileId,
      listing_type: listingType,
      title: spot.name,
      description: spot.description,
      province: spot.province,
      locality: spot.location,
      location_label: spot.location,
      meeting_point: spot.meetingPoint || null,
      price_amount: spot.price || 0,
      currency: (spot.currency || 'ARS').toUpperCase(),
      difficulty: spot.difficulty ? toDbDifficulty(spot.difficulty) : null,
      season: spot.season || null,
      capacity: normalizedCapacity,
      enrollment_start_date: spot.enrollmentStartDate || null,
      enrollment_end_date: spot.enrollmentEndDate || null,
      allow_enrollment: spot.allowEnrollment ?? false,
      is_accepting_enrollments: computedIsAcceptingEnrollments,
      minors_allowed: spot.minorsAllowed ?? null,
      start_date: spot.expeditionStartDate || null,
      end_date: spot.expeditionEndDate || null,
      days_count: spot.expeditionDays || null,
      nights_count: spot.expeditionNights || null,
      status: dbStatus,
      is_active: true,
      is_sponsored: spot.isSponsored ?? false,
      sponsored_start_date: spot.sponsoredStartDate || null,
      sponsored_end_date: spot.sponsoredEndDate || null,
      organizer_name: spot.organizerName || null,
      guided_by_name: spot.guidedByName || null,
      rules_json: JSON.stringify(spot.rules || []),
      latitude: spot.coordinates?.lat ?? null,
      longitude: spot.coordinates?.lng ?? null,
    };

    const { error: listingError } = await supabase.from('listings').upsert(listingPayload);
    if (listingError) throw listingError;

    if (listingType === 'refuge') {
      const { error: refugeDetailsError } = await supabase.from('listing_refuge_details').upsert({
        listing_id: spot.id,
        beds_count: spot.camasCount ?? null,
        tent_spots_count: spot.carpasCount ?? null,
      });
      if (refugeDetailsError) throw refugeDetailsError;
    } else {
      const { error: activityDetailsError } = await supabase.from('listing_activity_details').upsert({
        listing_id: spot.id,
        activity_type: toDbActivityType(spot.activityType),
        max_altitude_masn: spot.maxAltitudeReached || null,
        immersion_meters: spot.immersionDepth || null,
      });
      if (activityDetailsError) throw activityDetailsError;
      const { error: expeditionDetailsError } = await supabase.from('listing_expedition_details').upsert({
        listing_id: spot.id,
        organized_by_user_id: spot.organizerUserId || null,
        guided_by_user_id: spot.guidedByUserId || null,
        includes_transport_from: spot.transferIncludedFrom || null,
      });
      if (expeditionDetailsError) throw expeditionDetailsError;
      const { error: deleteEquipmentError } = await supabase.from('listing_personal_equipment').delete().eq('listing_id', spot.id);
      if (deleteEquipmentError) throw deleteEquipmentError;
      if (spot.personalGear?.length) {
        const { error: insertEquipmentError } = await supabase.from('listing_personal_equipment').insert(
          spot.personalGear.map((item) => ({ listing_id: spot.id, item }))
        );
        if (insertEquipmentError) throw insertEquipmentError;
      }
    }

    const { error: requirementsError } = await supabase.from('listing_reservation_requirements').upsert({
      listing_id: spot.id,
      require_physical_fitness_certificate: spot.requiresMedicalCertificate ?? false,
      require_medical_insurance: spot.bookingRequireMedicalInsurance ?? false,
      require_health_declaration: spot.bookingRequireHealthDeclaration ?? false,
      require_liability_waiver: spot.bookingRequireLiabilityWaiver ?? false,
      liability_waiver_text: spot.bookingLiabilityWaiverText || null,
      require_emergency_contact: spot.bookingRequireEmergencyContact ?? false,
      faq_items: Array.isArray(spot.faqs) && spot.faqs.length > 0
        ? spot.faqs
            .map((item) => ({
              question: String(item?.question || '').trim(),
              answer: String(item?.answer || '').trim(),
            }))
            .filter((item) => item.question && item.answer)
        : [],
    });
    if (requirementsError) throw requirementsError;

    const previousRequirements = {
      medicalCertificate: Boolean(previousRequirementsRow?.require_physical_fitness_certificate),
      medicalInsurance: Boolean(previousRequirementsRow?.require_medical_insurance),
      healthDeclaration: Boolean(previousRequirementsRow?.require_health_declaration),
      liabilityWaiver: Boolean(previousRequirementsRow?.require_liability_waiver),
      liabilityWaiverText: (previousRequirementsRow?.liability_waiver_text || '').trim(),
      emergencyContact: Boolean(previousRequirementsRow?.require_emergency_contact),
    };
    const nextRequirements = {
      medicalCertificate: Boolean(spot.requiresMedicalCertificate),
      medicalInsurance: Boolean(spot.bookingRequireMedicalInsurance),
      healthDeclaration: Boolean(spot.bookingRequireHealthDeclaration),
      liabilityWaiver: Boolean(spot.bookingRequireLiabilityWaiver),
      liabilityWaiverText: (spot.bookingLiabilityWaiverText || '').trim(),
      emergencyContact: Boolean(spot.bookingRequireEmergencyContact),
    };
    const revalidationReasons: string[] = [];
    if (!previousRequirements.medicalCertificate && nextRequirements.medicalCertificate) {
      revalidationReasons.push('Se requiere apto físico');
    }
    if (!previousRequirements.medicalInsurance && nextRequirements.medicalInsurance) {
      revalidationReasons.push('Se requiere información de seguro médico');
    }
    if (!previousRequirements.healthDeclaration && nextRequirements.healthDeclaration) {
      revalidationReasons.push('Se requiere declaración jurada de salud');
    }
    if (!previousRequirements.emergencyContact && nextRequirements.emergencyContact) {
      revalidationReasons.push('Se requiere contacto de emergencia');
    }
    const liabilityWaiverTextChanged = nextRequirements.liabilityWaiver
      && previousRequirements.liabilityWaiver
      && nextRequirements.liabilityWaiverText !== previousRequirements.liabilityWaiverText;
    if ((!previousRequirements.liabilityWaiver && nextRequirements.liabilityWaiver) || liabilityWaiverTextChanged) {
      revalidationReasons.push('Se requiere reaceptar el deslinde');
    }

    if (revalidationReasons.length > 0) {
      const requestedAt = new Date().toISOString();
      const reasonText = revalidationReasons.join('. ');
      const { error: revalidationError } = await supabase
        .from('reservations')
        .update({
          requires_revalidation: true,
          revalidation_reason: reasonText,
          revalidation_requested_at: requestedAt,
          liability_waiver_accepted: ((!previousRequirements.liabilityWaiver && nextRequirements.liabilityWaiver) || liabilityWaiverTextChanged) ? false : undefined,
          liability_waiver_accepted_at: ((!previousRequirements.liabilityWaiver && nextRequirements.liabilityWaiver) || liabilityWaiverTextChanged) ? null : undefined,
          liability_waiver_text_snapshot: liabilityWaiverTextChanged || (!previousRequirements.liabilityWaiver && nextRequirements.liabilityWaiver)
            ? null
            : undefined,
        })
        .eq('listing_id', spot.id)
        .in('status', ['pending', 'confirmed']);
      if (revalidationError) throw revalidationError;

      if ((!previousRequirements.liabilityWaiver && nextRequirements.liabilityWaiver) || liabilityWaiverTextChanged) {
        const { error: membersRevalidationError } = await supabase
          .from('reservation_members')
          .update({
            liability_accepted: false,
            liability_accepted_at: null,
            liability_text_snapshot: null,
          })
          .in(
            'reservation_id',
            (
              await supabase
                .from('reservations')
                .select('id')
                .eq('listing_id', spot.id)
                .in('status', ['pending', 'confirmed'])
            ).data?.map((item) => item.id) || []
          );
        if (membersRevalidationError) throw membersRevalidationError;
      }
    }

    const { error: deleteAmenitiesError } = await supabase.from('listing_amenities').delete().eq('listing_id', spot.id);
    if (deleteAmenitiesError) throw deleteAmenitiesError;
    if (spot.amenities?.length) {
      const { error: insertAmenitiesError } = await supabase.from('listing_amenities').insert(
        spot.amenities.map((amenity) => ({ listing_id: spot.id, amenity }))
      );
      if (insertAmenitiesError) throw insertAmenitiesError;
    }

    const { error: deleteMediaError } = await supabase.from('listing_media').delete().eq('listing_id', spot.id);
    if (deleteMediaError) throw deleteMediaError;
    if (spot.images?.length) {
      const { error: insertMediaError } = await supabase.from('listing_media').insert(
        spot.images.map((url, index) => ({
          listing_id: spot.id,
          media_type: 'image',
          url,
          sort_order: index,
        }))
      );
      if (insertMediaError) throw insertMediaError;
    }
  },

  async deleteSpot(id: string) {
    await assertListingHasNoReservations([id]);
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (error) throw error;
  },

  async deactivateSpot(id: string) {
    await assertListingHasNoReservations([id]);
    const { error } = await supabase
      .from('listings')
      .update({
        status: 'archived',
        is_active: false,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async setSpotSponsored(id: string, isSponsored: boolean) {
    const { error } = await supabase
      .from('listings')
      .update({
        is_sponsored: isSponsored,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async setSpotSponsoredWindow(id: string, startDate: string, endDate: string, isSponsored: boolean) {
    const { error } = await supabase
      .from('listings')
      .update({
        is_sponsored: isSponsored,
        sponsored_start_date: startDate,
        sponsored_end_date: endDate,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async clearSpotSponsoredWindow(id: string) {
    const { error } = await supabase
      .from('listings')
      .update({
        is_sponsored: false,
        sponsored_start_date: null,
        sponsored_end_date: null,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async setSpotEnrollmentAvailability(id: string, allowEnrollment: boolean, isAcceptingEnrollments: boolean) {
    const { error } = await supabase
      .from('listings')
      .update({
        allow_enrollment: allowEnrollment,
        is_accepting_enrollments: isAcceptingEnrollments,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async getShops() {
    try {
      await ensureSessionReady();
      const { data, error } = await supabase
        .from('shops')
        .select('*, shop_media(*), shop_branches(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const liveShops = ensureArray<any>(data).map(mapShop);
      return liveShops;
    } catch (error) {
      console.error('Falling back to seed shops:', error);
      return [];
    }
  },

  async getShopDetail(id: string) {
    await ensureSessionReady();
    const { data, error } = await supabase
      .from('shops')
      .select('*, shop_media(*), shop_branches(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapShop(data);
  },

  async saveShop(shop: OutdoorShop, providerProfileId: string) {
    const { error } = await supabase.from('shops').upsert({
      id: shop.id,
      provider_user_id: providerProfileId,
      name: shop.name,
      province: shop.province,
      locality: shop.address || null,
      address: shop.address || null,
      specialty: shop.specialty || null,
      description: shop.description || null,
      phone: shop.phone || null,
      website: shop.website || null,
      instagram_handle: shop.instagram || null,
      has_equipment_rental: (shop.description || '').toLowerCase().includes('alquil'),
      rating: shop.rating || null,
      is_sponsored: shop.isSponsored ?? false,
      sponsored_start_date: shop.sponsoredStartDate || null,
      sponsored_end_date: shop.sponsoredEndDate || null,
      is_active: true,
      latitude: shop.coordinates?.lat ?? null,
      longitude: shop.coordinates?.lng ?? null,
    });
    if (error) throw error;
  },

  async deleteShop(id: string) {
    const { error } = await supabase.from('shops').delete().eq('id', id);
    if (error) throw error;
  },

  async deactivateShop(id: string) {
    const { error } = await supabase
      .from('shops')
      .update({
        is_active: false,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async setShopSponsored(id: string, isSponsored: boolean) {
    const { error } = await supabase
      .from('shops')
      .update({
        is_sponsored: isSponsored,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async setShopSponsoredWindow(id: string, startDate: string, endDate: string, isSponsored: boolean) {
    const { error } = await supabase
      .from('shops')
      .update({
        is_sponsored: isSponsored,
        sponsored_start_date: startDate,
        sponsored_end_date: endDate,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async clearShopSponsoredWindow(id: string) {
    const { error } = await supabase
      .from('shops')
      .update({
        is_sponsored: false,
        sponsored_start_date: null,
        sponsored_end_date: null,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async getPosts() {
    await ensureSessionReady();
    let rows: any[] = [];
    const selectVariants = [
      'id, author_user_id, content, location, created_at, updated_at, author_name, author_username, author_avatar, likes_count, comments_count, post_media(*)',
      'id, author_user_id, content, location, created_at, updated_at, likes_count, comments_count, post_media(*)',
      'id, author_user_id, content, location, created_at, updated_at, post_media(*)',
      'id, author_user_id, content, created_at, updated_at, post_media(*)',
    ];

    let lastError: any = null;
    for (const selectFields of selectVariants) {
      const result = await supabase
        .from('posts')
        .select(selectFields)
        .order('created_at', { ascending: false });
      if (!result.error) {
        rows = ensureArray<any>(result.data);
        lastError = null;
        break;
      }
      lastError = result.error;
      if (result.error?.code !== '42703') {
        throw result.error;
      }
    }

    if (lastError) {
      throw lastError;
    }

    const authorIds = Array.from(new Set(rows.map((row) => row.author_user_id).filter(Boolean)));
    let profilesById = new Map<string, any>();

    if (authorIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .in('id', authorIds);
      if (profilesError) {
        console.warn('No se pudieron resolver perfiles para posts; se continúa con snapshot del post:', profilesError);
      } else {
        profilesById = new Map(ensureArray<any>(profilesData).map((profile) => [profile.id, profile]));
      }
    }

    return rows.map((row) => {
      const profile = profilesById.get(row.author_user_id);
      return mapPost({
        ...row,
        author_name: row.author_name || profile?.full_name || row.author_username,
        author_username: row.author_username || profile?.username || '',
        author_avatar: profile?.avatar_url || row.author_avatar || '',
      });
    });
  },

  async getLikedPostIds(profileId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', profileId);
    if (error) throw error;
    return ensureArray<any>(data).map((row) => row.post_id).filter(Boolean);
  },

  async getLikedCommentIds(profileId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', profileId);
    if (error) throw error;
    return ensureArray<any>(data).map((row) => row.comment_id).filter(Boolean);
  },

  async getPostComments(postIds: string[]): Promise<Record<string, Array<{ id: string; authorName: string; authorHandle: string; text: string; createdAt: string; likes: number }>>> {
    if (postIds.length === 0) return {};

    const { data: commentsData, error: commentsError } = await supabase
      .from('post_comments')
      .select('id, post_id, author_user_id, content, created_at, comment_likes(count)')
      .in('post_id', postIds)
      .order('created_at', { ascending: false });
    if (commentsError) throw commentsError;

    const authorIds = Array.from(new Set(ensureArray<any>(commentsData).map((row) => row.author_user_id).filter(Boolean)));
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', authorIds.length > 0 ? authorIds : ['00000000-0000-0000-0000-000000000000']);
    if (profilesError) throw profilesError;

    const profilesById = new Map(ensureArray<any>(profilesData).map((profile) => [profile.id, profile]));
    return ensureArray<any>(commentsData).reduce((acc, row) => {
      const authorProfile = profilesById.get(row.author_user_id);
      const authorName = authorProfile?.full_name || 'Usuario';
      const comment = {
        id: row.id,
        authorName,
        authorHandle: `@${authorName.trim().toLowerCase().replace(/\s+/g, '_')}`,
        text: row.content || '',
        createdAt: row.created_at ? new Date(row.created_at).toLocaleString('es-AR') : 'Ahora',
        likes: Number(ensureArray<any>(row.comment_likes)?.[0]?.count ?? 0),
      };
      if (!acc[row.post_id]) acc[row.post_id] = [];
      acc[row.post_id].push(comment);
      return acc;
    }, {} as Record<string, Array<{ id: string; authorName: string; authorHandle: string; text: string; createdAt: string; likes: number }>>);
  },

  async sendPost(
    authorUserId: string,
    content: string,
    media: Array<{ type: 'image' | 'video'; url: string }> = [],
    location?: string | null,
  ) {
    const { data, error } = await supabase.from('posts').insert({
      author_user_id: authorUserId,
      content,
      location: location?.trim() || null,
    }).select('*').single();
    if (error) throw error;
    const mediaRows = media.map((item, index) => ({
      post_id: data.id,
      media_type: item.type,
      url: item.url,
      sort_order: index,
    }));
    if (mediaRows.length > 0) {
      const { error: mediaError } = await supabase.from('post_media').insert(mediaRows);
      if (mediaError) throw mediaError;
    }
    return data.id as string;
  },

  async sendComment(postId: string, authorUserId: string, content: string) {
    const { data, error } = await supabase.from('post_comments').insert({
      post_id: postId,
      author_user_id: authorUserId,
      content,
    }).select('*').single();
    if (error) throw error;
    return data;
  },

  async editPost(postId: string, content: string, location?: string | null) {
    const { error } = await supabase.from('posts').update({ content, location: location?.trim() || null }).eq('id', postId);
    if (error) throw error;
  },

  async replacePostMedia(postId: string, media: Array<{ type: 'image' | 'video'; url: string }> = []) {
    const { error: deleteError } = await supabase.from('post_media').delete().eq('post_id', postId);
    if (deleteError) throw deleteError;

    const mediaRows = media.map((item, index) => ({
      post_id: postId,
      media_type: item.type,
      url: item.url,
      sort_order: index,
    }));

    if (mediaRows.length > 0) {
      const { error: insertError } = await supabase.from('post_media').insert(mediaRows);
      if (insertError) throw insertError;
    }
  },

  async deletePost(postId: string) {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;
  },

  async editComment(commentId: string, content: string) {
    const { error } = await supabase.from('post_comments').update({ content }).eq('id', commentId);
    if (error) throw error;
  },

  async deleteComment(commentId: string) {
    const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
    if (error) throw error;
  },

  async sendLike(targetType: 'post' | 'comment', targetId: string, userId: string) {
    if (targetType === 'post') {
      const { error } = await supabase.from('post_likes').upsert({ post_id: targetId, user_id: userId });
      if (error) throw error;
      return;
    }
    const { error } = await supabase.from('comment_likes').upsert({ comment_id: targetId, user_id: userId });
    if (error) throw error;
  },

  async removeLike(targetType: 'post' | 'comment', targetId: string, userId: string) {
    if (targetType === 'post') {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', targetId).eq('user_id', userId);
      if (error) throw error;
      return;
    }
    const { error } = await supabase.from('comment_likes').delete().eq('comment_id', targetId).eq('user_id', userId);
    if (error) throw error;
  },

  async getNotifications(userId: string): Promise<InAppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, type, actor_user_id, is_read, created_at')
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return ensureArray<any>(data).map((row) => ({
      id: row.id,
      title: row.title || 'Notificación',
      description: row.body || '',
      type: row.type === 'friend_request_received' ? 'friend_request' : row.type === 'friend_request_accepted' ? 'friend_accepted' : 'system',
      friendId: row.actor_user_id || undefined,
      read: Boolean(row.is_read),
      createdAt: row.created_at ? new Date(row.created_at).toLocaleString('es-AR') : 'Ahora',
    }));
  },

  async getBookings(profileId: string, as: 'provider' | 'creator' | 'participant'): Promise<Booking[]> {
    let query = supabase
      .from('reservations')
      .select('*, reservation_members(*)')
      .order('created_at', { ascending: false });

    if (as === 'provider') query = query.eq('provider_user_id', profileId);
    if (as === 'creator') query = query.eq('created_by_user_id', profileId);

    const { data, error } = await query;
    if (error) throw error;
    let rows = ensureArray<any>(data);
    if (as === 'participant') {
      rows = rows.filter((row) =>
        ensureArray<any>(row.reservation_members).some((member) => member.linked_user_id === profileId)
      );
    }
    return rows.map(mapBooking);
  },

  async getAllBookings(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*, reservation_members(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ensureArray<any>(data).map(mapBooking);
  },

  async createAvailabilityCheck(input: {
    spotId: string;
    providerUserId: string;
    createdByUserId: string;
    explorerHandle: string;
    dateFrom: string;
    dateTo: string;
    peopleCount: number;
  }): Promise<AvailabilityCheck> {
    await ensureSessionReady();
    const { data, error } = await supabase
      .from('booking_availability_checks')
      .insert({
        listing_id: input.spotId,
        provider_user_id: input.providerUserId,
        created_by_user_id: input.createdByUserId,
        explorer_handle: input.explorerHandle,
        date_from: input.dateFrom,
        date_to: input.dateTo,
        people_count: Math.max(1, Math.trunc(input.peopleCount || 1)),
        status: 'pending',
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapAvailabilityCheck(data);
  },

  async getAvailabilityChecksForExplorer(profileId: string): Promise<AvailabilityCheck[]> {
    await ensureSessionReady();
    const { data, error } = await supabase
      .from('booking_availability_checks')
      .select('*')
      .eq('created_by_user_id', profileId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ensureArray<any>(data).map(mapAvailabilityCheck);
  },

  async getAvailabilityChecksForProvider(profileId: string): Promise<AvailabilityCheck[]> {
    await ensureSessionReady();
    const { data, error } = await supabase
      .from('booking_availability_checks')
      .select('*')
      .eq('provider_user_id', profileId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ensureArray<any>(data).map(mapAvailabilityCheck);
  },

  async updateAvailabilityCheckStatus(
    checkId: string,
    status: 'approved' | 'rejected',
    providerMessage?: string
  ): Promise<AvailabilityCheck | null> {
    await ensureSessionReady();
    const { data, error } = await supabase
      .from('booking_availability_checks')
      .update({
        status,
        provider_message: providerMessage?.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', checkId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data ? mapAvailabilityCheck(data) : null;
  },

  async createBooking(profileId: string, payload: Booking) {
    const sanitizedObjective = normalizeBookingText(payload.objective);
    const sanitizedShelterRoute = normalizeBookingText(payload.shelterRoute);
    if (!isValidTextWithNumbers(sanitizedObjective, 2, 50)) {
      throw new Error('El objetivo debe tener entre 2 y 50 caracteres y puede incluir letras, números, espacios, apóstrofes y guiones.');
    }
    if (payload.shelterRoute && !isValidTextWithNumbers(sanitizedShelterRoute, 3, 100)) {
      throw new Error('La ruta debe tener entre 3 y 100 caracteres y puede incluir letras, números, espacios, apóstrofes y guiones.');
    }
    const payloadProviderUserId = UUID_PATTERN.test(String(payload.providerUserId || ''))
      ? String(payload.providerUserId)
      : null;
    let providerUserId = payloadProviderUserId;
    let listingName = 'tu publicación';

    if (!providerUserId) {
      const { data: listingData, error: listingError } = await withRequestTimeout(
        publicSupabase
          .from('listings')
          .select('id, provider_user_id, organizer_name, title')
          .eq('id', payload.spotId)
          .maybeSingle(),
        'La reserva tardó demasiado en validar el prestador.'
      );

      if (listingError) throw listingError;
      listingName = String(listingData?.title || listingData?.organizer_name || listingName);
      providerUserId = UUID_PATTERN.test(String(listingData?.provider_user_id || ''))
        ? String(listingData?.provider_user_id)
        : null;

      if (!providerUserId && listingData?.organizer_name) {
        const organizerName = String(listingData.organizer_name).trim();
        if (organizerName) {
          const { data: providerProfile } = await supabase
            .from('profiles')
            .select('id, role, full_name')
            .ilike('full_name', organizerName)
          .in('role', ['provider', 'both'])
          .limit(1)
          .maybeSingle();

          providerUserId = UUID_PATTERN.test(String(providerProfile?.id || ''))
            ? String(providerProfile?.id)
            : null;
        }
      }
    } else {
      try {
        const { data: listingData } = await supabase
          .from('listings')
          .select('title, organizer_name')
          .eq('id', payload.spotId)
          .maybeSingle();
        listingName = String(listingData?.title || listingData?.organizer_name || listingName);
      } catch (error) {
        console.warn('No se pudo resolver el nombre de la publicación para el email:', error);
      }
    }

    if (!providerUserId) {
      throw new Error('No se pudo resolver el prestador de la reserva.');
    }

    const primaryGuest = payload.guests[0];
    const primaryMedicalCertificateFileName = (payload.medicalCertificateFileName || primaryGuest?.medicalCertificateFileName || '').trim() || null;
    const waiverAccepted = payload.liabilityWaiverAccepted ?? primaryGuest?.liabilityWaiverAccepted ?? false;
    const waiverAcceptedAt = waiverAccepted
      ? (payload.liabilityWaiverAcceptedAt || primaryGuest?.liabilityWaiverAcceptedAt || new Date().toISOString())
      : null;
    const waiverTextSnapshot = waiverAccepted
      ? (payload.liabilityWaiverTextSnapshot || primaryGuest?.liabilityWaiverTextSnapshot || null)
      : null;

    const { error: reservationError } = await withRequestTimeout(
      supabase.from('reservations').insert({
        id: payload.id,
        availability_check_id: payload.availabilityCheckId || null,
        listing_id: payload.spotId,
        provider_user_id: providerUserId,
        created_by_user_id: profileId,
        status: toDbBookingStatus(payload.status) || 'pending',
        start_date: payload.dateFrom || null,
        end_date: payload.dateTo || null,
        needs_car_parking: Boolean(payload.needsCarStorage),
        objective: sanitizedObjective || null,
        liability_waiver_accepted: waiverAccepted,
        liability_waiver_accepted_at: waiverAcceptedAt,
        liability_waiver_text_snapshot: waiverTextSnapshot,
        requires_revalidation: payload.requiresRevalidation ?? false,
        revalidation_reason: payload.revalidationReason || null,
        revalidation_requested_at: payload.revalidationRequestedAt || null,
        missing_medical_certificate: payload.missingMedicalCertificate ?? false,
        missing_health_declaration: payload.missingHealthDeclaration ?? false,
        missing_liability_waiver: payload.missingLiabilityWaiver ?? false,
        missing_emergency_contact: payload.missingEmergencyContact ?? false,
        information_deadline_at: payload.informationDeadlineAt || null,
        participants_count: payload.peopleCount || payload.guests.length || 1,
        provider_message: payload.providerMessage || null,
        medical_certificate_file_name: primaryMedicalCertificateFileName,
        reservation_user: payload.reservationUser || null,
        reservation_name: payload.reservationName || null,
        reservation_last_name: payload.reservationLastName || null,
        email: payload.email || null,
        phone: payload.phone || null,
        country_calling_code: payload.countryCallingCode || null,
        phone_number: payload.phoneNumber || null,
        medium_transport: payload.shelterTransport || null,
        needs_parking: typeof payload.needsParking === 'boolean' ? payload.needsParking : null,
        license_plate: payload.licensePlate || null,
        arrival_time: payload.arrivalTime || null,
        departure_time: payload.departureTime || null,
        observations: payload.observations || null,
        accepts_terms: payload.acceptsTerms ?? null,
        accepts_cancellation: payload.acceptsCancellation ?? null,
        consent_contact: payload.consentContact ?? null,
        shelter_route: sanitizedShelterRoute || null,
        trekking_difficulty_level: payload.trekkingDifficultyLevel || null,
        trekking_with_guide: payload.trekkingWithGuide ?? null,
        trekking_guide_name: payload.trekkingGuideName || null,
        trekking_guide_last_name: payload.trekkingGuideLastName || null,
        trekking_guide_phone: payload.trekkingGuidePhone || null,
        trekking_responsible_group: payload.trekkingResponsibleGroup || null,
        trekking_point_of_departure: payload.trekkingPointOfDeparture || null,
        trekking_departure_time: payload.trekkingDepartureTime || null,
        trekking_return_time: payload.trekkingReturnTime || null,
        trekking_group_count: payload.trekkingGroupCount ?? null,
        trekking_communication_medium: payload.trekkingCommunicationMedium || null,
        trekking_declaration_aptitude: payload.trekkingDeclarationAptitude ?? null,
        trekking_accept_recommendations: payload.trekkingAcceptRecommendations ?? null,
        trekking_accept_equipment: payload.trekkingAcceptEquipment ?? null,
        trekking_weather_read: payload.trekkingWeatherRead ?? null,
        trekking_notice_ascent_date: payload.trekkingNoticeAscentDate || null,
        trekking_notice_return_date: payload.trekkingNoticeReturnDate || null,
        trekking_notice_has_adequate_equipment: typeof payload.trekkingNoticeHasAdequateEquipment === 'boolean'
          ? payload.trekkingNoticeHasAdequateEquipment
          : null,
        trekking_notice_emergency_contact_name: payload.trekkingNoticeEmergencyContactName || null,
        trekking_notice_emergency_contact_phone: payload.trekkingNoticeEmergencyContactPhone || null,
        total_amount: payload.total ?? 0,
      }),
      'La reserva tardó demasiado en guardarse.'
    );

    if (reservationError) throw reservationError;

    const membersPayload = toReservationMembersPayload(payload.id, payload.guests);

    if (membersPayload.length > 0) {
      const { error: membersError } = await withRequestTimeout(
        supabase.from('reservation_members').insert(membersPayload),
        'La reserva tardó demasiado en guardar los participantes.'
      );
      if (membersError) {
        await supabase.from('reservations').delete().eq('id', payload.id);
        throw membersError;
      }
    }

    if (payload.availabilityCheckId) {
      try {
        await supabase
          .from('booking_availability_checks')
          .update({ linked_reservation_id: payload.id, updated_at: new Date().toISOString() })
          .eq('id', payload.availabilityCheckId);
      } catch (availabilityLinkError) {
        console.error('Error linking availability check to booking:', availabilityLinkError);
      }
    }

    try {
      await cumbreApi.updateBooking(payload.id, payload);
    } catch (updateError) {
      console.error('Error enriching booking after direct insert:', updateError);
    }

    let providerEmail: string | undefined;
    let providerName: string | undefined;
    try {
      const { data: providerProfile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', providerUserId)
        .maybeSingle();
      providerEmail = providerProfile?.email || undefined;
      providerName = providerProfile?.full_name || undefined;
    } catch (error) {
      console.warn('No se pudo resolver el email del prestador para comunicaciones:', error);
    }

    try {
      await cumbreApi.sendSystemNotification(
        providerUserId,
        payload.status === 'pending_information' ? 'Nueva reserva con información pendiente' : 'Nueva reserva pendiente',
        payload.status === 'pending_information'
          ? 'Hay una nueva reserva que todavía debe completar información obligatoria.'
          : 'Tenes una nueva reserva para revisar.',
        profileId,
        'booking_pending_review'
      );
    } catch (notificationError) {
      console.error('Error sending provider booking notification:', notificationError);
    }

    if (providerEmail) {
      try {
        await cumbreApi.sendCommunicationEmail({
          eventKey: 'new_booking_received',
          recipientEmail: providerEmail,
          recipientUserId: providerUserId,
          recipientName: providerName || payload.providerMessage || 'Prestador',
          locale: 'es',
          payload: {
            userName: providerName || 'Prestador',
            listingName,
            explorerName: payload.reservationName || 'Explorador',
            bookingDate: payload.dateFrom || '',
            actionUrl: `${window.location.origin}${APP_PUBLIC_PATH}`,
            message: payload.status === 'pending_information'
              ? 'Hay una nueva reserva que todavía debe completar información obligatoria.'
              : 'Tenes una nueva reserva para revisar.',
          },
        });
      } catch (communicationError) {
        console.error('Error sending provider booking email:', communicationError);
      }
    }

    return payload.id;
  },

  async getBookingById(bookingId: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*, reservation_members(*)')
      .eq('id', bookingId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapBooking(data);
  },

  async updateBooking(bookingId: string, payload: Partial<Booking>) {
    const sanitizedObjective = typeof payload.objective === 'string' ? normalizeBookingText(payload.objective) : undefined;
    const sanitizedShelterRoute = typeof payload.shelterRoute === 'string' ? normalizeBookingText(payload.shelterRoute) : undefined;
    if (typeof payload.objective === 'string' && !isValidTextWithNumbers(sanitizedObjective || '', 2, 50)) {
      throw new Error('El objetivo debe tener entre 2 y 50 caracteres y puede incluir letras, números, espacios, apóstrofes y guiones.');
    }
    if (typeof payload.shelterRoute === 'string' && !isValidTextWithNumbers(sanitizedShelterRoute || '', 3, 100)) {
      throw new Error('La ruta debe tener entre 3 y 100 caracteres y puede incluir letras, números, espacios, apóstrofes y guiones.');
    }
    const primaryGuest = payload.guests?.[0];
    const resolvedMedicalCertificateFileName = (payload.medicalCertificateFileName || primaryGuest?.medicalCertificateFileName || '').trim() || null;
    const resolvedWaiverAccepted = typeof payload.liabilityWaiverAccepted === 'boolean'
      ? payload.liabilityWaiverAccepted
      : (typeof primaryGuest?.liabilityWaiverAccepted === 'boolean' ? primaryGuest.liabilityWaiverAccepted : undefined);
    const resolvedWaiverAcceptedAt = resolvedWaiverAccepted === true
      ? (payload.liabilityWaiverAcceptedAt || primaryGuest?.liabilityWaiverAcceptedAt || new Date().toISOString())
      : (resolvedWaiverAccepted === false ? null : undefined);
    const resolvedWaiverTextSnapshot = resolvedWaiverAccepted === true
      ? (payload.liabilityWaiverTextSnapshot || primaryGuest?.liabilityWaiverTextSnapshot || undefined)
      : (resolvedWaiverAccepted === false ? null : undefined);
    const reservationUpdatePayload: Record<string, any> = {
      status: toDbBookingStatus(payload.status),
      start_date: payload.dateFrom,
      end_date: payload.dateTo,
      needs_car_parking: payload.needsCarStorage,
      country_calling_code: payload.countryCallingCode || null,
      phone_number: payload.phoneNumber || null,
      medium_transport: payload.shelterTransport || null,
      needs_parking: typeof payload.needsParking === 'boolean' ? payload.needsParking : null,
      license_plate: payload.licensePlate || null,
      arrival_time: payload.arrivalTime || null,
      departure_time: payload.departureTime || null,
      observations: payload.observations || null,
      accepts_terms: payload.acceptsTerms ?? null,
      accepts_cancellation: payload.acceptsCancellation ?? null,
      consent_contact: payload.consentContact ?? null,
      shelter_route: sanitizedShelterRoute || null,
      trekking_difficulty_level: payload.trekkingDifficultyLevel || null,
      trekking_with_guide: payload.trekkingWithGuide ?? null,
      trekking_guide_name: payload.trekkingGuideName || null,
      trekking_guide_last_name: payload.trekkingGuideLastName || null,
      trekking_guide_phone: payload.trekkingGuidePhone || null,
      trekking_responsible_group: payload.trekkingResponsibleGroup || null,
      trekking_point_of_departure: payload.trekkingPointOfDeparture || null,
      trekking_departure_time: payload.trekkingDepartureTime || null,
      trekking_return_time: payload.trekkingReturnTime || null,
      trekking_group_count: payload.trekkingGroupCount ?? null,
      trekking_communication_medium: payload.trekkingCommunicationMedium || null,
      trekking_declaration_aptitude: payload.trekkingDeclarationAptitude ?? null,
      trekking_accept_recommendations: payload.trekkingAcceptRecommendations ?? null,
      trekking_accept_equipment: payload.trekkingAcceptEquipment ?? null,
      trekking_weather_read: payload.trekkingWeatherRead ?? null,
      objective: sanitizedObjective,
      requires_revalidation: payload.requiresRevalidation ?? false,
      revalidation_reason: payload.revalidationReason || null,
      revalidation_requested_at: payload.revalidationRequestedAt || null,
      missing_medical_certificate: payload.missingMedicalCertificate ?? false,
      missing_health_declaration: payload.missingHealthDeclaration ?? false,
      missing_liability_waiver: payload.missingLiabilityWaiver ?? false,
      missing_emergency_contact: payload.missingEmergencyContact ?? false,
      information_deadline_at: payload.informationDeadlineAt || null,
      participants_count: payload.peopleCount,
      provider_message: payload.providerMessage || null,
      medical_certificate_file_name: resolvedMedicalCertificateFileName,
      trekking_notice_ascent_date: payload.trekkingNoticeAscentDate || null,
      trekking_notice_return_date: payload.trekkingNoticeReturnDate || null,
      trekking_notice_has_adequate_equipment: typeof payload.trekkingNoticeHasAdequateEquipment === 'boolean'
        ? payload.trekkingNoticeHasAdequateEquipment
        : null,
      trekking_notice_emergency_contact_name: payload.trekkingNoticeEmergencyContactName || null,
      trekking_notice_emergency_contact_phone: payload.trekkingNoticeEmergencyContactPhone || null,
      total_amount: payload.total ?? null,
    };

    if (typeof resolvedWaiverAccepted === 'boolean') {
      reservationUpdatePayload.liability_waiver_accepted = resolvedWaiverAccepted;
      reservationUpdatePayload.liability_waiver_accepted_at = resolvedWaiverAcceptedAt;
      reservationUpdatePayload.liability_waiver_text_snapshot = resolvedWaiverTextSnapshot;
    }

    const { error } = await supabase.from('reservations').update(reservationUpdatePayload).eq('id', bookingId);
    if (error) throw error;

    if (payload.guests) {
      const { error: deleteMembersError } = await supabase
        .from('reservation_members')
        .delete()
        .eq('reservation_id', bookingId);
      if (deleteMembersError) throw deleteMembersError;

      const membersPayload = toReservationMembersPayload(bookingId, payload.guests);
      if (membersPayload.length > 0) {
        const { error: insertMembersError } = await supabase
          .from('reservation_members')
          .insert(membersPayload);
        if (insertMembersError) throw insertMembersError;
      }
    }
  },

  async deleteBooking(bookingId: string) {
    const { error } = await supabase.from('reservations').delete().eq('id', bookingId);
    if (error) throw error;
  },

  async expirePendingInformationBookings() {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('reservations')
      .update({
        status: 'rejected',
        provider_message: 'Reserva rechazada automáticamente por falta de información obligatoria.',
        updated_at: now,
      })
      .eq('status', 'pending')
      .lt('information_deadline_at', now);
    if (error) throw error;
  },

  async getFriends(profileId: string | null = null): Promise<UserFriend[]> {
    let profiles: any[] = [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, updated_at')
        .limit(100);
      if (error) throw error;
      profiles = ensureArray<any>(data);
    } catch (error) {
      console.error('Falling back to seed friends:', error);
      return MOCK_FRIENDS;
    }

    let followSet = new Set<string>();
    let incomingSet = new Set<string>();
    let outgoingSet = new Set<string>();
    let friendSet = new Set<string>();

    if (profileId) {
      const [{ data: follows }, { data: incomingReq }, { data: outgoingReq }, { data: acceptedReq }, { data: friendships }] = await Promise.all([
        supabase.from('follows').select('*').eq('follower_id', profileId),
        supabase.from('friend_requests').select('*').eq('to_user_id', profileId).eq('status', 'pending'),
        supabase.from('friend_requests').select('*').eq('from_user_id', profileId).eq('status', 'pending'),
        supabase.from('friend_requests').select('*').or(`from_user_id.eq.${profileId},to_user_id.eq.${profileId}`).eq('status', 'accepted'),
        supabase.from('friendships').select('*').or(`user_a_id.eq.${profileId},user_b_id.eq.${profileId}`),
      ]);

      followSet = new Set(ensureArray<any>(follows).map((row) => row.followed_id));
      incomingSet = new Set(ensureArray<any>(incomingReq).map((row) => row.from_user_id));
      outgoingSet = new Set(ensureArray<any>(outgoingReq).map((row) => row.to_user_id));
      friendSet = new Set(
        ensureArray<any>(friendships).map((row) => (row.user_a_id === profileId ? row.user_b_id : row.user_a_id))
      );
      ensureArray<any>(acceptedReq).forEach((row) => {
        const friendId = row.from_user_id === profileId ? row.to_user_id : row.from_user_id;
        if (friendId) friendSet.add(friendId);
      });
    }

    const liveFriends = ensureArray<any>(profiles)
      .filter((profile) => !profileId || profile.id !== profileId)
      .map((profile) => ({
      id: profile.id,
      name: profile.full_name || 'Usuario',
      avatar: profile.avatar_url
        ? (profile.updated_at
          ? `${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(profile.updated_at))}`
          : profile.avatar_url)
        : `https://i.pravatar.cc/150?u=${profile.id}`,
      role: profile.role || undefined,
      isFriend: friendSet.has(profile.id),
      friendStatus: friendSet.has(profile.id)
        ? 'friends'
        : incomingSet.has(profile.id)
          ? 'received'
          : outgoingSet.has(profile.id)
            ? 'sent'
            : 'none',
      isProvider: profile.role === 'provider' || profile.role === 'both',
      isFollowing: followSet.has(profile.id),
      mutualFriends: 0,
    }));

    return liveFriends.length > 0 ? liveFriends : MOCK_FRIENDS;
  },

  async sendFriendRequest(fromUserId: string, toUserId: string) {
    const { error } = await supabase.from('friend_requests').insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      status: 'pending',
    });
    if (error) throw error;

    try {
      await this.sendSystemNotification(
        toUserId,
        'Nueva solicitud de amistad',
        'Tenés una nueva solicitud de amistad pendiente de aprobación.',
        fromUserId,
        'friend_request_received'
      );
    } catch (notificationError) {
      console.error('Error sending friend request notification:', notificationError);
    }
  },

  async acceptFriendRequest(requestId: string) {
    const { error } = await supabase.from('friend_requests').update({
      status: 'accepted',
      responded_at: new Date().toISOString(),
    }).eq('id', requestId);
    if (error) throw error;
  },

  async acceptFriendRequestBetween(fromUserId: string, toUserId: string) {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('from_user_id', fromUserId)
      .eq('to_user_id', toUserId)
      .eq('status', 'pending')
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) return;
    await this.acceptFriendRequest(data.id);

    const [userAId, userBId] = [fromUserId, toUserId].sort();
    const { error: friendshipError } = await supabase
      .from('friendships')
      .insert({
        user_a_id: userAId,
        user_b_id: userBId,
      });
    if (friendshipError && friendshipError.code !== '23505') {
      console.warn('No se pudo insertar friendship explícita; se mantiene la solicitud aceptada:', friendshipError);
    }

    try {
      await this.sendSystemNotification(
        fromUserId,
        'Solicitud de amistad aceptada',
        'Tu solicitud de amistad fue aceptada.',
        toUserId,
        'friend_request_accepted'
      );
    } catch (notificationError) {
      console.error('Error sending friend acceptance notification:', notificationError);
    }
  },

  async cancelFriendRequest(fromUserId: string, toUserId: string) {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('from_user_id', fromUserId)
      .eq('to_user_id', toUserId)
      .eq('status', 'pending');
    if (error) throw error;
  },

  async rejectFriendRequest(fromUserId: string, toUserId: string) {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('from_user_id', fromUserId)
      .eq('to_user_id', toUserId)
      .eq('status', 'pending');
    if (error) throw error;
  },

  async removeFriendship(userId: string, friendId: string) {
    const [userAId, userBId] = [userId, friendId].sort();

    const { error: friendshipError } = await supabase
      .from('friendships')
      .delete()
      .eq('user_a_id', userAId)
      .eq('user_b_id', userBId);
    if (friendshipError) throw friendshipError;

    const { error: requestError } = await supabase
      .from('friend_requests')
      .delete()
      .or(`and(from_user_id.eq.${userId},to_user_id.eq.${friendId}),and(from_user_id.eq.${friendId},to_user_id.eq.${userId})`);
    if (requestError) throw requestError;
  },

  async toggleFollow(followerId: string, followedId: string, shouldFollow: boolean) {
    if (shouldFollow) {
      const { error } = await supabase.from('follows').upsert({
        follower_id: followerId,
        followed_id: followedId,
      });
      if (error) throw error;
      return;
    }
    const { error } = await supabase.from('follows').delete().eq('follower_id', followerId).eq('followed_id', followedId);
    if (error) throw error;
  },

  async getChatThreads(profileId: string): Promise<ChatThread[]> {
    await ensureSessionReady();
    const currentProfileIds = await resolveChatProfileIds(profileId);
    const { data: rpcThreads, error: rpcError } = await supabase.rpc('list_chat_threads_for_current_user');
    let liveProfilesById = new Map<string, any>();
    if (!rpcError && Array.isArray(rpcThreads) && rpcThreads.length > 0) {
      const participantIds = Array.from(new Set(
        ensureArray<any>(rpcThreads)
          .flatMap((row: any) => ensureArray<any>(row.participants).map((participant: any) => participant?.profile_id))
          .filter(Boolean)
      ));
      if (participantIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, updated_at')
          .in('id', participantIds);
        if (profilesError) {
          console.warn('No se pudieron refrescar perfiles para hilos de chat:', profilesError);
        } else {
          liveProfilesById = new Map(ensureArray<any>(profilesData).map((profile) => [profile.id, profile]));
        }
      }
    }
    const mappedRpcThreads = !rpcError && Array.isArray(rpcThreads)
      ? rpcThreads.map((row: any) => mapChatThread({
        id: row.id,
        created_at: row.created_at,
        last_message_at: row.last_message_at,
        last_message_preview: row.last_message_preview,
        chat_messages: [],
        chat_thread_participants: ensureArray<any>(row.participants).map((participant) => ({
          profile_id: participant.profile_id,
          last_read_at: null,
        })),
        unread_count: row.unread_count,
      }, currentProfileIds, new Map(
        ensureArray<any>(row.participants).map((participant) => [
          participant.profile_id,
          liveProfilesById.get(participant.profile_id) || {
            id: participant.profile_id,
            full_name: participant.full_name,
            avatar_url: participant.avatar_url,
            role: participant.role,
            updated_at: participant.updated_at,
          },
        ])
      )))
      : [];

    return mappedRpcThreads.sort((a, b) => {
      const aDate = new Date(a.lastMessageAt || a.createdAt || 0).getTime();
      const bDate = new Date(b.lastMessageAt || b.createdAt || 0).getTime();
      return bDate - aDate;
    });
  },

  async getChatMessages(profileId: string, threadId: string): Promise<ChatMessage[]> {
    await ensureSessionReady();
    const currentProfileIds = await resolveChatProfileIds(profileId);
    const { data: rpcMessages, error: rpcError } = await supabase.rpc('list_chat_messages_for_current_user', {
      p_thread_id: threadId,
    });
    if (!rpcError && Array.isArray(rpcMessages) && rpcMessages.length > 0) {
      const senderIds = Array.from(new Set(
        ensureArray<any>(rpcMessages).map((messageRow) => messageRow?.sender_profile_id).filter(Boolean)
      ));
      let liveProfilesById = new Map<string, any>();
      if (senderIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, updated_at')
          .in('id', senderIds);
        if (profilesError) {
          console.warn('No se pudieron refrescar perfiles para mensajes de chat:', profilesError);
        } else {
          liveProfilesById = new Map(ensureArray<any>(profilesData).map((profile) => [profile.id, profile]));
        }
      }
      return rpcMessages.map((row: any) => mapChatMessage({
        id: row.id,
        thread_id: row.thread_id,
        sender_profile_id: row.sender_profile_id,
        body: row.body,
        created_at: row.created_at,
      }, currentProfileIds, new Map(
        ensureArray<any>(rpcMessages)
          .filter((messageRow) => messageRow?.sender_profile_id)
          .map((messageRow) => [
            messageRow.sender_profile_id,
            liveProfilesById.get(messageRow.sender_profile_id) || {
              id: messageRow.sender_profile_id,
              full_name: messageRow.sender_full_name,
              avatar_url: messageRow.sender_avatar_url,
              role: messageRow.sender_role,
              updated_at: messageRow.sender_updated_at,
            },
          ])
      )));
    }
    if (isMissingRpcError(rpcError)) {
      throw new Error('Falta la migracion 041 del chat en Supabase. El detalle del hilo no puede cargarse hasta aplicarla.');
    }
    const [{ data: messagesData, error: messagesError }, { data: participantsData, error: participantsError }] = await Promise.all([
      supabase
        .from('chat_messages')
        .select('id, thread_id, sender_profile_id, body, created_at')
        .eq('thread_id', threadId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('chat_thread_participants')
        .select('profile_id')
        .eq('thread_id', threadId),
    ]);
    if (messagesError) throw messagesError;
    if (participantsError) throw participantsError;
    const participantIds = Array.from(new Set(ensureArray<any>(participantsData).map((row) => row.profile_id).filter(Boolean)));
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, updated_at')
      .in('id', participantIds.length > 0 ? participantIds : ['00000000-0000-0000-0000-000000000000']);
    if (profilesError) throw profilesError;
    const profilesById = new Map(ensureArray<any>(profilesData).map((profile) => [profile.id, profile]));
    return ensureArray<any>(messagesData).map((row) => mapChatMessage(row, currentProfileIds, profilesById));
  },

  async getOrCreateDirectChatThread(currentProfileId: string, otherProfileId: string): Promise<string> {
    await ensureSessionReady();
    const { data: rpcThreadId, error: rpcError } = await supabase.rpc('get_or_create_direct_chat_thread', {
      p_other_profile_id: otherProfileId,
    });
    if (!rpcError && typeof rpcThreadId === 'string' && rpcThreadId) {
      return rpcThreadId;
    }

    const currentProfileIds = await resolveChatProfileIds(currentProfileId);
    const otherProfileIds = await resolveChatProfileIds(otherProfileId);
    const allCandidateProfileIds = Array.from(new Set([
      ...currentProfileIds,
      ...otherProfileIds,
    ]));
    const { data: participantRows, error: participantError } = await supabase
      .from('chat_thread_participants')
      .select('thread_id, profile_id')
      .in('profile_id', allCandidateProfileIds);
    if (participantError) throw participantError;

    const threadCounts = new Map<string, Set<string>>();
    ensureArray<any>(participantRows).forEach((row) => {
      if (!threadCounts.has(row.thread_id)) threadCounts.set(row.thread_id, new Set());
      threadCounts.get(row.thread_id)!.add(row.profile_id);
    });
    const matchingThreadIds = Array.from(threadCounts.entries())
      .filter(([, members]) =>
        Array.from(members).some((memberId) => currentProfileIds.includes(memberId))
        && Array.from(members).some((memberId) => otherProfileIds.includes(memberId))
      )
      .map(([threadId]) => threadId);
    if (matchingThreadIds.length > 0) {
      const { data: matchingThreads, error: matchingThreadsError } = await supabase
        .from('chat_threads')
        .select('id, last_message_at, created_at')
        .in('id', matchingThreadIds)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (matchingThreadsError) throw matchingThreadsError;
      const existingThreadId = ensureArray<any>(matchingThreads)[0]?.id;
      if (existingThreadId) return existingThreadId;
    }

    const threadId = globalThis.crypto?.randomUUID?.()
      || `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const { error: threadError } = await supabase
      .from('chat_threads')
      .insert({
        id: threadId,
        created_by_profile_id: currentProfileId,
        last_message_preview: '',
      });
    if (threadError) throw threadError;

    const { error: currentParticipantError } = await supabase
      .from('chat_thread_participants')
      .insert({
        thread_id: threadId,
        profile_id: currentProfileId,
        last_read_at: new Date().toISOString(),
      });
    if (currentParticipantError) {
      await supabase.from('chat_threads').delete().eq('id', threadId);
      throw currentParticipantError;
    }

    const { error: otherParticipantError } = await supabase
      .from('chat_thread_participants')
      .insert({
        thread_id: threadId,
        profile_id: otherProfileId,
      });
    if (otherParticipantError) {
      await supabase.from('chat_thread_participants').delete().eq('thread_id', threadId);
      await supabase.from('chat_threads').delete().eq('id', threadId);
      throw otherParticipantError;
    }

    return threadId;
  },

  async sendChatMessage(threadId: string, senderProfileId: string, body: string): Promise<ChatMessage | null> {
    await ensureSessionReady();
    const trimmedBody = body.trim();
    if (!trimmedBody) return null;
    const currentProfileIds = await resolveChatProfileIds(senderProfileId);
    let effectiveSenderProfileId = senderProfileId;

    const { data: participantRows, error: participantError } = await supabase
      .from('chat_thread_participants')
      .select('profile_id')
      .eq('thread_id', threadId);
    if (!participantError) {
      const matchingProfileId = ensureArray<any>(participantRows)
        .map((row) => row.profile_id)
        .find((profileId) => currentProfileIds.includes(profileId));
      if (matchingProfileId) {
        effectiveSenderProfileId = matchingProfileId;
      }
    }

    const persistDirectMessage = async () => {
      const { data: insertedMessage, error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: threadId,
          sender_profile_id: effectiveSenderProfileId,
          body: trimmedBody,
          message_type: 'text',
        })
        .select('id, thread_id, sender_profile_id, body, created_at')
        .single();
      if (insertError) throw insertError;

      const nowIso = new Date().toISOString();
      await Promise.all([
        supabase
          .from('chat_threads')
          .update({
            last_message_at: nowIso,
            last_message_preview: trimmedBody.slice(0, 140),
          })
          .eq('id', threadId),
        supabase
          .from('chat_thread_participants')
          .update({
            last_read_at: nowIso,
          })
          .eq('thread_id', threadId)
          .eq('profile_id', effectiveSenderProfileId),
      ]);

      return insertedMessage;
    };

    let insertedMessage: any | null = null;
    try {
      insertedMessage = await persistDirectMessage();
    } catch (directInsertError) {
      const { data: currentUserRpcInsertedMessage, error: currentUserRpcInsertError } = await supabase.rpc('send_chat_message_for_current_user', {
        p_thread_id: threadId,
        p_body: trimmedBody,
      });
      insertedMessage = currentUserRpcInsertError ? null : ensureArray<any>(currentUserRpcInsertedMessage)[0];
      if (!insertedMessage && isMissingRpcError(currentUserRpcInsertError)) {
        const { data: rpcInsertedMessage, error: rpcInsertError } = await supabase.rpc('send_chat_message', {
          p_thread_id: threadId,
          p_body: trimmedBody,
        });
        insertedMessage = rpcInsertError ? null : ensureArray<any>(rpcInsertedMessage)[0];
      }
      if (!insertedMessage) {
        throw directInsertError;
      }
    }

    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .eq('id', effectiveSenderProfileId)
      .maybeSingle();
    if (senderError) throw senderError;
    const profilesById = new Map(senderProfile ? [[senderProfile.id, senderProfile]] : []);
    return mapChatMessage(insertedMessage, currentProfileIds, profilesById);
  },

  async markChatThreadRead(threadId: string, profileId: string) {
    await ensureSessionReady();
    const currentProfileIds = await resolveChatProfileIds(profileId);
    const { error: rpcError } = await supabase.rpc('mark_chat_thread_read_for_current_user', {
      p_thread_id: threadId,
    });
    if (!rpcError) return;
    const { error } = await supabase
      .from('chat_thread_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .in('profile_id', currentProfileIds);
    if (error) throw error;
  },

  subscribeToChatThreads(profileId: string, onChange: () => void): RealtimeSubscription {
    const channel = supabase
      .channel(`chat-threads-${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_thread_participants', filter: `profile_id=eq.${profileId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, onChange)
      .subscribe();

    return {
      unsubscribe: async () => {
        const status = await supabase.removeChannel(channel);
        return status;
      },
    };
  },

  subscribeToChatMessages(threadId: string, onChange: () => void): RealtimeSubscription {
    const channel = supabase
      .channel(`chat-messages-${threadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` }, onChange)
      .subscribe();

    return {
      unsubscribe: async () => {
        const status = await supabase.removeChannel(channel);
        return status;
      },
    };
  },

  async blockUser(blockerId: string, blockedId: string) {
    const { error } = await supabase.from('blocks').upsert({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });
    if (error) throw error;
  },

  async unblockUser(blockerId: string, blockedId: string) {
    const { error } = await supabase.from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId);
    if (error) throw error;
  },

  async getFavorites(profileId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('favorites')
      .select('entity_id')
      .eq('user_id', profileId);
    if (error) {
      return new Set();
    }
    return new Set(ensureArray<any>(data).map((row) => row.entity_id));
  },

  async toggleFavorite(profileId: string, entityId: string, isFavorite: boolean, entityType: 'listing' | 'shop' = 'listing') {
    if (isFavorite) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', profileId).eq('entity_id', entityId);
      if (error) throw error;
      return;
    }
    const { error } = await supabase.from('favorites').upsert({
      user_id: profileId,
      entity_type: entityType,
      entity_id: entityId,
      namespace: APP_NAMESPACE,
    });
    if (error) throw error;
  },

  async uploadFile(bucket: string, path: string, file: File) {
    const safePath = sanitizeStoragePath(path);
    const { error } = await supabase.storage.from(bucket).upload(safePath, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(safePath);
    return data.publicUrl;
  },

  async listNotiTips(): Promise<NotiTip[]> {
    const { data, error } = await publicSupabase
      .from('noti_tips')
      .select('id, title, description, cover_image_url, media_items, body_html, body_text, author_name, published_at, is_published, created_at, updated_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return ensureArray<any>(data).map((row) => ({
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      coverImageUrl: row.cover_image_url || '',
      media: Array.isArray(row.media_items) ? row.media_items as NotiTipMediaItem[] : [],
      bodyHtml: row.body_html || '',
      bodyText: row.body_text || '',
      authorName: row.author_name || 'Equipo Explorer',
      publishedAt: row.published_at || row.created_at || new Date().toISOString(),
      isPublished: Boolean(row.is_published),
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined,
    }));
  },

  async listNotiTipsAdmin(): Promise<NotiTip[]> {
    const { data, error } = await adminSupabase
      .from('noti_tips')
      .select('id, title, description, cover_image_url, media_items, body_html, body_text, author_name, published_at, is_published, created_at, updated_at')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return ensureArray<any>(data).map((row) => ({
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      coverImageUrl: row.cover_image_url || '',
      media: Array.isArray(row.media_items) ? row.media_items as NotiTipMediaItem[] : [],
      bodyHtml: row.body_html || '',
      bodyText: row.body_text || '',
      authorName: row.author_name || 'Equipo Explorer',
      publishedAt: row.published_at || row.created_at || new Date().toISOString(),
      isPublished: Boolean(row.is_published),
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined,
    }));
  },

  async createNotiTip(input: {
    title: string;
    description: string;
    coverImageUrl: string;
    media: NotiTipMediaItem[];
    bodyHtml: string;
    bodyText: string;
    authorName: string;
    publishedAt: string;
    isPublished: boolean;
  }): Promise<NotiTip> {
    const payload = {
      title: input.title.trim(),
      description: input.description.trim(),
      cover_image_url: input.coverImageUrl.trim(),
      media_items: input.media.slice(0, 4),
      body_html: input.bodyHtml,
      body_text: input.bodyText,
      author_name: input.authorName.trim() || 'Equipo Explorer',
      published_at: input.publishedAt || new Date().toISOString(),
      is_published: input.isPublished,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await adminSupabase
      .from('noti_tips')
      .insert(payload)
      .select('id, title, description, cover_image_url, media_items, body_html, body_text, author_name, published_at, is_published, created_at, updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('No se pudo crear el Noti-tip.');
    return {
      id: data.id,
      title: data.title || '',
      description: data.description || '',
      coverImageUrl: data.cover_image_url || '',
      media: Array.isArray(data.media_items) ? data.media_items as NotiTipMediaItem[] : [],
      bodyHtml: data.body_html || '',
      bodyText: data.body_text || '',
      authorName: data.author_name || 'Equipo Explorer',
      publishedAt: data.published_at || data.created_at || new Date().toISOString(),
      isPublished: Boolean(data.is_published),
      createdAt: data.created_at || undefined,
      updatedAt: data.updated_at || undefined,
    };
  },

  async editNotiTip(id: string, input: {
    title: string;
    description: string;
    coverImageUrl: string;
    media: NotiTipMediaItem[];
    bodyHtml: string;
    bodyText: string;
    authorName: string;
    publishedAt: string;
    isPublished: boolean;
  }): Promise<NotiTip> {
    const payload = {
      title: input.title.trim(),
      description: input.description.trim(),
      cover_image_url: input.coverImageUrl.trim(),
      media_items: input.media.slice(0, 4),
      body_html: input.bodyHtml,
      body_text: input.bodyText,
      author_name: input.authorName.trim() || 'Equipo Explorer',
      published_at: input.publishedAt || new Date().toISOString(),
      is_published: input.isPublished,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await adminSupabase
      .from('noti_tips')
      .update(payload)
      .eq('id', id)
      .select('id, title, description, cover_image_url, media_items, body_html, body_text, author_name, published_at, is_published, created_at, updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('No se pudo editar el Noti-tip.');
    return {
      id: data.id,
      title: data.title || '',
      description: data.description || '',
      coverImageUrl: data.cover_image_url || '',
      media: Array.isArray(data.media_items) ? data.media_items as NotiTipMediaItem[] : [],
      bodyHtml: data.body_html || '',
      bodyText: data.body_text || '',
      authorName: data.author_name || 'Equipo Explorer',
      publishedAt: data.published_at || data.created_at || new Date().toISOString(),
      isPublished: Boolean(data.is_published),
      createdAt: data.created_at || undefined,
      updatedAt: data.updated_at || undefined,
    };
  },

  async getNotiTipById(id: string): Promise<NotiTip | null> {
    const { data, error } = await publicSupabase
      .from('noti_tips')
      .select('id, title, description, cover_image_url, media_items, body_html, body_text, author_name, published_at, is_published, created_at, updated_at')
      .eq('id', id)
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      title: data.title || '',
      description: data.description || '',
      coverImageUrl: data.cover_image_url || '',
      media: Array.isArray(data.media_items) ? data.media_items as NotiTipMediaItem[] : [],
      bodyHtml: data.body_html || '',
      bodyText: data.body_text || '',
      authorName: data.author_name || 'Equipo Explorer',
      publishedAt: data.published_at || data.created_at || new Date().toISOString(),
      isPublished: Boolean(data.is_published),
      createdAt: data.created_at || undefined,
      updatedAt: data.updated_at || undefined,
    };
  },

  subscribeToPublishedNotiTips(onChange: (payload: { id?: string; event: 'INSERT' | 'UPDATE' | 'DELETE' }) => void): RealtimeSubscription {
    const channel = supabase
      .channel('noti-tips-published')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'noti_tips',
          filter: 'is_published=eq.true',
        },
        (payload) => {
          const row: any = payload.new || payload.old || {};
          const event = String(payload.eventType || 'UPDATE').toUpperCase() as 'INSERT' | 'UPDATE' | 'DELETE';
          onChange({ id: row.id, event });
        }
      )
      .subscribe();

    return {
      unsubscribe: () => supabase.removeChannel(channel),
    };
  },

  async markNotiTipRead(profileId: string, notiTipId: string): Promise<void> {
    if (!UUID_PATTERN.test(String(profileId || '')) || !UUID_PATTERN.test(String(notiTipId || ''))) return;
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('noti_tip_reads')
      .upsert(
        {
          profile_id: profileId,
          noti_tip_id: notiTipId,
          read_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'noti_tip_id,profile_id' }
      );
    if (error) throw error;
  },

  async getNotiTipReadMap(profileId: string, notiTipIds: string[]): Promise<Record<string, string>> {
    if (!UUID_PATTERN.test(String(profileId || ''))) return {};
    const validIds = Array.from(new Set(notiTipIds.filter((id) => UUID_PATTERN.test(String(id || '')))));
    if (validIds.length === 0) return {};
    const { data, error } = await supabase
      .from('noti_tip_reads')
      .select('noti_tip_id, read_at')
      .eq('profile_id', profileId)
      .in('noti_tip_id', validIds);
    if (error) throw error;
    return ensureArray<any>(data).reduce((acc, row) => {
      const id = String(row.noti_tip_id || '');
      if (!id) return acc;
      acc[id] = String(row.read_at || '');
      return acc;
    }, {} as Record<string, string>);
  },

  async listNotiTipReadStats(): Promise<NotiTipReadStat[]> {
    const { data, error } = await adminSupabase
      .from('noti_tip_reads')
      .select('noti_tip_id, read_at');
    if (error) throw error;
    const grouped = new Map<string, { readers: number; lastReadAt?: string }>();
    ensureArray<any>(data).forEach((row) => {
      const id = String(row.noti_tip_id || '');
      if (!id) return;
      const readAt = String(row.read_at || '');
      const previous = grouped.get(id) || { readers: 0, lastReadAt: undefined };
      const nextReaders = previous.readers + 1;
      const nextLastReadAt = !previous.lastReadAt || (readAt && new Date(readAt).getTime() > new Date(previous.lastReadAt).getTime())
        ? readAt
        : previous.lastReadAt;
      grouped.set(id, { readers: nextReaders, lastReadAt: nextLastReadAt });
    });
    return Array.from(grouped.entries()).map(([notiTipId, info]) => ({
      notiTipId,
      readers: info.readers,
      lastReadAt: info.lastReadAt,
    }));
  },

  async getProviderApplications(): Promise<ProviderApplication[]> {
    await ensureSessionReady();
    const { data, error } = await supabase
      .from('provider_applications')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (error) throw error;

    const baseApplications = ensureArray<any>(data).map((row) => ({
      id: row.id,
      name: row.name || '',
      email: row.email || '',
      province: row.province || '',
      status: (row.status || 'pending') as ProviderApplicationStatus,
      submittedAt: row.submitted_at || row.created_at || new Date().toISOString(),
      reviewedAt: row.reviewed_at || undefined,
      rejectionMessage: row.details_json?.rejectionMessage || undefined,
      snapshot: {
        instagram: row.details_json?.instagram || undefined,
        birthDate: row.details_json?.birthDate || undefined,
        preferredSports: Array.isArray(row.details_json?.preferredSports) ? row.details_json.preferredSports : [],
        providerServices: Array.isArray(row.details_json?.providerServices) ? row.details_json.providerServices : [],
        providerUsesBookingModule: typeof row.details_json?.providerUsesBookingModule === 'boolean'
          ? row.details_json.providerUsesBookingModule
          : undefined,
      },
    }));

    const { data: providerRoleProfileRows, error: providerRoleProfileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, birth_date, instagram_handle, province, role, created_at')
      .in('role', ['provider', 'both']);

    const normalizedEmails = Array.from(new Set(
      [
        ...baseApplications.map((application) => application.email.trim().toLowerCase()),
        ...ensureArray<any>(providerRoleProfileRows).map((profile) => (profile.email || '').trim().toLowerCase()),
      ]
        .filter(Boolean)
    ));

    const profiles = normalizedEmails.length > 0
      ? await (async () => {
          const { data: profileRows, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, birth_date, instagram_handle, province, role, created_at')
            .in('email', normalizedEmails);
          if (profileError) {
            return [] as any[];
          }
          return ensureArray<any>(profileRows);
        })()
      : [];
    const providerRoleProfiles = providerRoleProfileError ? [] : ensureArray<any>(providerRoleProfileRows);
    const allProfiles = [
      ...profiles,
      ...providerRoleProfiles.filter((profile) => {
        const normalizedEmail = (profile.email || '').trim().toLowerCase();
        return normalizedEmail && !profiles.some((row) => ((row.email || '').trim().toLowerCase() === normalizedEmail));
      }),
    ];

    const profileByEmail = new Map<string, any>();
    allProfiles.forEach((profile) => {
      const normalizedEmail = (profile.email || '').trim().toLowerCase();
      if (normalizedEmail && !profileByEmail.has(normalizedEmail)) {
        profileByEmail.set(normalizedEmail, profile);
      }
    });

    const profileIds = allProfiles.map((profile) => profile.id).filter(Boolean);
    const [explorerRowsRes, providerRowsRes] = await Promise.all([
      profileIds.length > 0
        ? supabase.from('explorer_profiles').select('user_id, explorer_level, preferred_sports').in('user_id', profileIds)
        : Promise.resolve({ data: [], error: null }),
      profileIds.length > 0
        ? supabase.from('provider_profiles').select('user_id, provider_kind, accepts_bookings, display_name').in('user_id', profileIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const explorerByUserId = new Map<string, any>();
    ensureArray<any>(explorerRowsRes.data).forEach((row) => {
      if (row.user_id && !explorerByUserId.has(row.user_id)) {
        explorerByUserId.set(row.user_id, row);
      }
    });

    const providerByUserId = new Map<string, any>();
    ensureArray<any>(providerRowsRes.data).forEach((row) => {
      if (row.user_id && !providerByUserId.has(row.user_id)) {
        providerByUserId.set(row.user_id, row);
      }
    });

    const mergedByEmail = new Map<string, ProviderApplication>();

    baseApplications.forEach((application) => {
      const profile = profileByEmail.get(application.email.trim().toLowerCase());
      if (!profile) {
        mergedByEmail.set(application.email.trim().toLowerCase(), application);
        return;
      }

      const explorer = explorerByUserId.get(profile.id);
      const provider = providerByUserId.get(profile.id);

      mergedByEmail.set(application.email.trim().toLowerCase(), {
        ...application,
        // Do not auto-promote status from profile role; approval status must come from provider_applications review.
        status: application.status,
        profile: {
          id: profile.id,
          fullName: profile.full_name || undefined,
          email: profile.email || undefined,
          phone: profile.phone || undefined,
          birthDate: profile.birth_date || undefined,
          instagram: profile.instagram_handle || undefined,
          province: profile.province || undefined,
          role: profile.role || undefined,
          createdAt: profile.created_at || undefined,
        },
        explorer: explorer
          ? {
              level: explorer.explorer_level || undefined,
              preferredSports: Array.isArray(explorer.preferred_sports) ? explorer.preferred_sports : [],
            }
          : undefined,
        provider: provider
          ? {
              kind: provider.provider_kind || undefined,
              acceptsBookings: provider.accepts_bookings ?? undefined,
              displayName: provider.display_name || undefined,
            }
          : undefined,
      });
    });

    providerRoleProfiles.forEach((profile) => {
      const normalizedEmail = (profile.email || '').trim().toLowerCase();
      if (!normalizedEmail) return;
      if (mergedByEmail.has(normalizedEmail)) return;

      const explorer = explorerByUserId.get(profile.id);
      const provider = providerByUserId.get(profile.id);

      mergedByEmail.set(normalizedEmail, {
        id: `profile-${profile.id}`,
        name: profile.full_name || provider?.display_name || 'Prestador',
        email: profile.email || '',
        province: profile.province || '',
        status: 'approved',
        submittedAt: profile.created_at || new Date().toISOString(),
        reviewedAt: profile.created_at || undefined,
        rejectionMessage: undefined,
        snapshot: undefined,
        profile: {
          id: profile.id,
          fullName: profile.full_name || undefined,
          email: profile.email || undefined,
          phone: profile.phone || undefined,
          birthDate: profile.birth_date || undefined,
          instagram: profile.instagram_handle || undefined,
          province: profile.province || undefined,
          role: profile.role || undefined,
          createdAt: profile.created_at || undefined,
        },
        explorer: explorer
          ? {
              level: explorer.explorer_level || undefined,
              preferredSports: Array.isArray(explorer.preferred_sports) ? explorer.preferred_sports : [],
            }
          : undefined,
        provider: provider
          ? {
              kind: provider.provider_kind || undefined,
              acceptsBookings: provider.accepts_bookings ?? undefined,
            displayName: provider.display_name || undefined,
          }
          : undefined,
      });
    });

    const providerProfileIdsInDirectory = new Set(
      Array.from(mergedByEmail.values())
        .map((application) => application.profile?.id)
        .filter(Boolean)
    );

    const { data: listingProviderRows, error: listingProviderError } = await supabase
      .from('listings')
      .select('provider_user_id, organizer_name, province, created_at, updated_at, status, is_active')
      .not('provider_user_id', 'is', null)
      .order('updated_at', { ascending: false });

    if (!listingProviderError) {
      ensureArray<any>(listingProviderRows).forEach((row) => {
        const providerUserId = (row.provider_user_id || '').trim();
        if (!providerUserId || providerProfileIdsInDirectory.has(providerUserId)) return;

        providerProfileIdsInDirectory.add(providerUserId);
        mergedByEmail.set(`recovered:${providerUserId}`, {
          id: `recovered-listing-provider-${providerUserId}`,
          name: row.organizer_name || 'Prestador recuperado',
          email: '',
          province: row.province || '',
          status: row.status === 'archived' || row.is_active === false ? 'rejected' : 'approved',
          submittedAt: row.updated_at || row.created_at || new Date().toISOString(),
          reviewedAt: row.updated_at || row.created_at || undefined,
          rejectionMessage: undefined,
          snapshot: {
            providerUsesBookingModule: true,
          },
          profile: {
            id: providerUserId,
            fullName: row.organizer_name || undefined,
            province: row.province || undefined,
            role: 'provider',
            createdAt: row.created_at || undefined,
          },
          provider: {
            kind: 'operator',
            acceptsBookings: true,
            displayName: row.organizer_name || undefined,
          },
        });
      });
    }

    return Array.from(mergedByEmail.values()).sort((a, b) => (
      new Date(b.reviewedAt || b.submittedAt).getTime() - new Date(a.reviewedAt || a.submittedAt).getTime()
    ));
  },

  async getProviderApplicationByEmail(email: string): Promise<ProviderApplication | null> {
    await ensureSessionReady();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return null;
    const { data, error } = await supabase
      .from('provider_applications')
      .select('*')
      .ilike('email', normalizedEmail)
      .order('reviewed_at', { ascending: false, nullsFirst: false })
      .order('submitted_at', { ascending: false, nullsFirst: false });
    if (error) throw error;
    const rows = ensureArray<any>(data);
    if (rows.length === 0) return null;
    const selected =
      rows.find((row) => row.status === 'approved') ||
      rows.find((row) => row.status === 'pending') ||
      rows[0];
    return {
      id: selected.id,
      name: selected.name || '',
      email: selected.email || '',
      province: selected.province || '',
      status: (selected.status || 'pending') as ProviderApplicationStatus,
      submittedAt: selected.submitted_at || selected.created_at || new Date().toISOString(),
      reviewedAt: selected.reviewed_at || undefined,
      rejectionMessage: selected.details_json?.rejectionMessage || undefined,
      snapshot: {
        instagram: selected.details_json?.instagram || undefined,
        birthDate: selected.details_json?.birthDate || undefined,
        preferredSports: Array.isArray(selected.details_json?.preferredSports) ? selected.details_json.preferredSports : [],
        providerServices: Array.isArray(selected.details_json?.providerServices) ? selected.details_json.providerServices : [],
        providerUsesBookingModule: typeof selected.details_json?.providerUsesBookingModule === 'boolean'
          ? selected.details_json.providerUsesBookingModule
          : undefined,
      },
    };
  },

  async upsertProviderApplication(payload: {
    email: string;
    name: string;
    province?: string;
    status?: ProviderApplicationStatus;
    details?: {
      instagram?: string;
      birthDate?: string;
      preferredSports?: string[];
      providerServices?: string[];
      providerUsesBookingModule?: boolean;
    };
  }): Promise<ProviderApplication> {
    await ensureSessionReady();
    const normalizedEmail = payload.email.trim().toLowerCase();
    const requestedStatus = payload.status || 'pending';
    let status = requestedStatus;
    const row: any = {
      email: normalizedEmail,
      name: payload.name || 'Prestador',
      province: payload.province || null,
      status: requestedStatus,
      details_json: payload.details || {},
    };
    if (requestedStatus !== 'pending') {
      row.reviewed_at = new Date().toISOString();
    } else {
      row.reviewed_at = null;
    }

    const { data: existingRows, error: existingError } = await supabase
      .from('provider_applications')
      .select('id, status, reviewed_at')
      .ilike('email', normalizedEmail)
      .order('reviewed_at', { ascending: false, nullsFirst: false })
      .order('submitted_at', { ascending: false, nullsFirst: false });
    if (existingError) throw existingError;
    const rows = ensureArray<any>(existingRows);
    const selectedExisting =
      rows.find((item) => item.status === 'approved') ||
      rows[0] ||
      null;

    // Never downgrade an approved provider automatically to pending.
    // Pending should only be used for first-time submission or explicit re-submission after rejection.
    if (requestedStatus === 'pending' && selectedExisting?.status === 'approved') {
      status = 'approved';
      row.status = 'approved';
      row.reviewed_at = selectedExisting.reviewed_at || new Date().toISOString();
    }

    let data: any;
    if (selectedExisting?.id) {
      const updateRes = await supabase
        .from('provider_applications')
        .update(row)
        .eq('id', selectedExisting.id)
        .select('*')
        .single();
      if (updateRes.error) throw updateRes.error;
      data = updateRes.data;
    } else {
      const insertRes = await supabase
        .from('provider_applications')
        .insert(row)
        .select('*')
        .single();
      if (insertRes.error) throw insertRes.error;
      data = insertRes.data;
    }

    return {
      id: data.id,
      name: data.name || '',
      email: data.email || '',
      province: data.province || '',
      status: (data.status || 'pending') as ProviderApplicationStatus,
      submittedAt: data.submitted_at || data.created_at || new Date().toISOString(),
      reviewedAt: data.reviewed_at || undefined,
      rejectionMessage: data.details_json?.rejectionMessage || undefined,
      snapshot: {
        instagram: data.details_json?.instagram || undefined,
        birthDate: data.details_json?.birthDate || undefined,
        preferredSports: Array.isArray(data.details_json?.preferredSports) ? data.details_json.preferredSports : [],
        providerServices: Array.isArray(data.details_json?.providerServices) ? data.details_json.providerServices : [],
        providerUsesBookingModule: typeof data.details_json?.providerUsesBookingModule === 'boolean'
          ? data.details_json.providerUsesBookingModule
          : undefined,
      },
    };
  },

  async setProviderApplicationStatus(id: string, status: ProviderApplicationStatus, rejectionMessage?: string): Promise<ProviderApplication> {
    await ensureSessionReady();
    const { data: current } = await supabase
      .from('provider_applications')
      .select('email, name, province, details_json')
      .eq('id', id)
      .maybeSingle();
    const currentDetails = current?.details_json || {};
    const nextDetails = status === 'rejected'
      ? { ...currentDetails, rejectionMessage: rejectionMessage || '' }
      : { ...currentDetails, rejectionMessage: null };

    const { data, error } = await supabase
      .from('provider_applications')
      .update({
        status,
        reviewed_at: status === 'pending' ? null : new Date().toISOString(),
        details_json: nextDetails,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    if (status === 'approved') {
      const normalizedEmail = (data.email || '').trim().toLowerCase();
      if (normalizedEmail) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, full_name, province')
          .ilike('email', normalizedEmail)
          .maybeSingle();
        if (profileError) throw profileError;

        if (profile?.id) {
          const upgradedRole = getProviderEnabledRole(profile.role);
          const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({
              role: upgradedRole,
              full_name: data.name || profile.full_name || 'Prestador',
              province: data.province || profile.province || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);
          if (updateProfileError) throw updateProfileError;

          const { error: providerProfileError } = await supabase
            .from('provider_profiles')
            .upsert({
              user_id: profile.id,
              provider_kind: 'operator',
              accepts_bookings: typeof currentDetails?.providerUsesBookingModule === 'boolean'
                ? currentDetails.providerUsesBookingModule
                : true,
              display_name: data.name || profile.full_name || null,
            }, {
              onConflict: 'user_id',
            });
          if (providerProfileError) throw providerProfileError;
        }
      }
    }

    return {
      id: data.id,
      name: data.name || '',
      email: data.email || '',
      province: data.province || '',
      status: (data.status || 'pending') as ProviderApplicationStatus,
      submittedAt: data.submitted_at || data.created_at || new Date().toISOString(),
      reviewedAt: data.reviewed_at || undefined,
      rejectionMessage: data.details_json?.rejectionMessage || undefined,
      snapshot: {
        instagram: data.details_json?.instagram || undefined,
        birthDate: data.details_json?.birthDate || undefined,
        preferredSports: Array.isArray(data.details_json?.preferredSports) ? data.details_json.preferredSports : [],
        providerServices: Array.isArray(data.details_json?.providerServices) ? data.details_json.providerServices : [],
        providerUsesBookingModule: typeof data.details_json?.providerUsesBookingModule === 'boolean'
          ? data.details_json.providerUsesBookingModule
          : undefined,
      },
    };
  },

  async deactivateProviderAccount(email: string): Promise<ProviderApplication | null> {
    await ensureSessionReady();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return null;

    const deactivationMessage = 'Cuenta dada de baja por administración.';
    const { data: currentApp, error: currentAppError } = await supabase
      .from('provider_applications')
      .select('*')
      .ilike('email', normalizedEmail)
      .maybeSingle();
    if (currentAppError) throw currentAppError;

    let updatedApplication: any = currentApp;
    if (currentApp?.id) {
      const details = { ...(currentApp.details_json || {}), rejectionMessage: deactivationMessage };
      const { data, error } = await supabase
        .from('provider_applications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          details_json: details,
        })
        .eq('id', currentApp.id)
        .select('*')
        .single();
      if (error) throw error;
      updatedApplication = data;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail);
    if (profilesError) throw profilesError;

    const profileIds = ensureArray<any>(profiles).map((profile) => profile.id).filter(Boolean);
    if (profileIds.length > 0) {
      await assertProviderHasNoReservations(profileIds);
      const { error: listingsError } = await supabase
        .from('listings')
        .update({
          status: 'archived',
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .in('provider_user_id', profileIds);
      throwUnlessIgnorable(listingsError);

      const { error: shopsError } = await supabase
        .from('shops')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .in('provider_user_id', profileIds);
      throwUnlessIgnorable(shopsError);

      const { error: providerProfilesError } = await supabase
        .from('provider_profiles')
        .delete()
        .in('user_id', profileIds);
      throwUnlessIgnorable(providerProfilesError);

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          role: 'explorer',
          updated_at: new Date().toISOString(),
        })
        .in('id', profileIds);
      throwUnlessIgnorable(profileUpdateError);
    }

    if (!updatedApplication) return null;

    return {
      id: updatedApplication.id,
      name: updatedApplication.name || '',
      email: updatedApplication.email || '',
      province: updatedApplication.province || '',
      status: (updatedApplication.status || 'pending') as ProviderApplicationStatus,
      submittedAt: updatedApplication.submitted_at || updatedApplication.created_at || new Date().toISOString(),
      reviewedAt: updatedApplication.reviewed_at || undefined,
      rejectionMessage: updatedApplication.details_json?.rejectionMessage || undefined,
      snapshot: {
        instagram: updatedApplication.details_json?.instagram || undefined,
        birthDate: updatedApplication.details_json?.birthDate || undefined,
        preferredSports: Array.isArray(updatedApplication.details_json?.preferredSports) ? updatedApplication.details_json.preferredSports : [],
        providerServices: Array.isArray(updatedApplication.details_json?.providerServices) ? updatedApplication.details_json.providerServices : [],
        providerUsesBookingModule: typeof updatedApplication.details_json?.providerUsesBookingModule === 'boolean'
          ? updatedApplication.details_json.providerUsesBookingModule
          : undefined,
      },
    };
  },

  async deleteProviderAccount(email: string): Promise<void> {
    await ensureSessionReady();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail);
    if (profilesError) throw profilesError;

    const profileIds = ensureArray<any>(profiles).map((profile) => profile.id).filter(Boolean);
    await assertProviderHasNoReservations(profileIds);

    let listingIds: string[] = [];
    let postIds: string[] = [];
    let shopIds: string[] = [];

    if (profileIds.length > 0) {
      const [{ data: listings, error: listingsError }, { data: posts, error: postsError }, { data: shops, error: shopsError }] = await Promise.all([
        supabase.from('listings').select('id').in('provider_user_id', profileIds),
        supabase.from('posts').select('id').in('author_user_id', profileIds),
        supabase.from('shops').select('id').in('provider_user_id', profileIds),
      ]);
      throwUnlessIgnorable(listingsError);
      throwUnlessIgnorable(postsError);
      throwUnlessIgnorable(shopsError);
      listingIds = ensureArray<any>(listings).map((row) => row.id).filter(Boolean);
      postIds = ensureArray<any>(posts).map((row) => row.id).filter(Boolean);
      shopIds = ensureArray<any>(shops).map((row) => row.id).filter(Boolean);
    }

    if (postIds.length > 0) {
      const { data: comments, error: commentsError } = await supabase
        .from('post_comments')
        .select('id')
        .in('post_id', postIds);
      throwUnlessIgnorable(commentsError);
      const commentIds = ensureArray<any>(comments).map((row) => row.id).filter(Boolean);

      if (commentIds.length > 0) {
        const { error } = await supabase.from('comment_likes').delete().in('comment_id', commentIds);
        throwUnlessIgnorable(error);
      }

      const { error: postMediaError } = await supabase.from('post_media').delete().in('post_id', postIds);
      throwUnlessIgnorable(postMediaError);
      const { error: postLikesError } = await supabase.from('post_likes').delete().in('post_id', postIds);
      throwUnlessIgnorable(postLikesError);
      const { error: postCommentsError } = await supabase.from('post_comments').delete().in('post_id', postIds);
      throwUnlessIgnorable(postCommentsError);
    }

    if (profileIds.length > 0) {
      const { error: ownCommentLikesError } = await supabase.from('comment_likes').delete().in('user_id', profileIds);
      throwUnlessIgnorable(ownCommentLikesError);
      const { error: ownPostLikesError } = await supabase.from('post_likes').delete().in('user_id', profileIds);
      throwUnlessIgnorable(ownPostLikesError);
      const { error: ownCommentsError } = await supabase.from('post_comments').delete().in('author_user_id', profileIds);
      throwUnlessIgnorable(ownCommentsError);
      const { error: ownPostsError } = await supabase.from('posts').delete().in('author_user_id', profileIds);
      throwUnlessIgnorable(ownPostsError);

      const { error: notificationsRecipientError } = await supabase.from('notifications').delete().in('recipient_user_id', profileIds);
      throwUnlessIgnorable(notificationsRecipientError);
      const { error: notificationsActorError } = await supabase.from('notifications').delete().in('actor_user_id', profileIds);
      throwUnlessIgnorable(notificationsActorError);

      const { error: favoritesError } = await supabase.from('favorites').delete().in('user_id', profileIds);
      throwUnlessIgnorable(favoritesError);
      const { error: followsFollowerError } = await supabase.from('follows').delete().in('follower_id', profileIds);
      throwUnlessIgnorable(followsFollowerError);
      const { error: followsFollowedError } = await supabase.from('follows').delete().in('followed_id', profileIds);
      throwUnlessIgnorable(followsFollowedError);
      const { error: friendReqFromError } = await supabase.from('friend_requests').delete().in('from_user_id', profileIds);
      throwUnlessIgnorable(friendReqFromError);
      const { error: friendReqToError } = await supabase.from('friend_requests').delete().in('to_user_id', profileIds);
      throwUnlessIgnorable(friendReqToError);
      const { error: friendshipsAError } = await supabase.from('friendships').delete().in('user_a_id', profileIds);
      throwUnlessIgnorable(friendshipsAError);
      const { error: friendshipsBError } = await supabase.from('friendships').delete().in('user_b_id', profileIds);
      throwUnlessIgnorable(friendshipsBError);
      const { error: blocksBlockerError } = await supabase.from('blocks').delete().in('blocker_id', profileIds);
      throwUnlessIgnorable(blocksBlockerError);
      const { error: blocksBlockedError } = await supabase.from('blocks').delete().in('blocked_id', profileIds);
      throwUnlessIgnorable(blocksBlockedError);
      const { error: reservationMembersError } = await supabase.from('reservation_members').delete().in('linked_user_id', profileIds);
      throwUnlessIgnorable(reservationMembersError);
      const { error: reservationsProviderError } = await supabase.from('reservations').delete().in('provider_user_id', profileIds);
      throwUnlessIgnorable(reservationsProviderError);
      const { error: reservationsCreatorError } = await supabase.from('reservations').delete().in('created_by_user_id', profileIds);
      throwUnlessIgnorable(reservationsCreatorError);
    }

    if (shopIds.length > 0) {
      const { error: shopMediaError } = await supabase.from('shop_media').delete().in('shop_id', shopIds);
      throwUnlessIgnorable(shopMediaError);
      const { error: shopBranchesError } = await supabase.from('shop_branches').delete().in('shop_id', shopIds);
      throwUnlessIgnorable(shopBranchesError);
      const { error: shopsError } = await supabase.from('shops').delete().in('id', shopIds);
      throwUnlessIgnorable(shopsError);
    }

    if (listingIds.length > 0) {
      const listingTables = [
        'listing_refuge_details',
        'listing_activity_details',
        'listing_expedition_details',
        'listing_media',
        'listing_amenities',
        'listing_personal_equipment',
        'listing_reservation_requirements',
      ];

      for (const table of listingTables) {
        const { error } = await supabase.from(table).delete().in('listing_id', listingIds);
        throwUnlessIgnorable(error);
      }

      const { error: listingsError } = await supabase.from('listings').delete().in('id', listingIds);
      throwUnlessIgnorable(listingsError);
    }

    if (profileIds.length > 0) {
      const { error: providerProfilesError } = await supabase.from('provider_profiles').delete().in('user_id', profileIds);
      throwUnlessIgnorable(providerProfilesError);
      const { error: explorerProfilesError } = await supabase.from('explorer_profiles').delete().in('user_id', profileIds);
      throwUnlessIgnorable(explorerProfilesError);
      const { error: profilesDeleteError } = await supabase.from('profiles').delete().in('id', profileIds);
      throwUnlessIgnorable(profilesDeleteError);
    }

    const { error: applicationsDeleteError } = await supabase
      .from('provider_applications')
      .delete()
      .ilike('email', normalizedEmail);
    throwUnlessIgnorable(applicationsDeleteError);
  },

  async getProviderApplicationDetail(id: string, email?: string, seed?: ProviderApplicationDetailSeed): Promise<ProviderApplicationDetail | null> {
    await ensureSessionReady();
    const { data: appRowById, error: appError } = await supabase
      .from('provider_applications')
      .select('id, name, email, province, status, submitted_at, created_at, reviewed_at, details_json')
      .eq('id', id)
      .maybeSingle();
    if (appError) throw appError;

    let appRow = appRowById;
    if (!appRow && email?.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const { data: appRowsByEmail, error: emailError } = await supabase
        .from('provider_applications')
        .select('id, name, email, province, status, submitted_at, created_at, reviewed_at, details_json')
        .ilike('email', normalizedEmail)
        .order('submitted_at', { ascending: false })
        .limit(1);
      if (emailError) throw emailError;
      appRow = ensureArray<any>(appRowsByEmail)[0] || null;
    }

    const base: ProviderApplicationDetail = {
      id: appRow?.id || seed?.id || id,
      name: appRow?.name || seed?.name || '',
      email: appRow?.email || seed?.email || email || '',
      province: appRow?.province || seed?.province || '',
      status: ((appRow?.status || seed?.status || 'pending') as ProviderApplicationStatus),
      submittedAt: appRow?.submitted_at || appRow?.created_at || seed?.submittedAt || new Date().toISOString(),
      reviewedAt: appRow?.reviewed_at || seed?.reviewedAt || undefined,
      rejectionMessage: seed?.rejectionMessage,
      snapshot: {
        instagram: appRow?.details_json?.instagram || undefined,
        birthDate: appRow?.details_json?.birthDate || undefined,
        preferredSports: Array.isArray(appRow?.details_json?.preferredSports) ? appRow.details_json.preferredSports : [],
        providerServices: Array.isArray(appRow?.details_json?.providerServices) ? appRow.details_json.providerServices : [],
        providerUsesBookingModule: typeof appRow?.details_json?.providerUsesBookingModule === 'boolean'
          ? appRow.details_json.providerUsesBookingModule
          : undefined,
      },
    };

    const normalizedEmail = (base.email || '').trim().toLowerCase();
    if (!normalizedEmail) return base;

    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, birth_date, instagram_handle, province, role, created_at')
      .ilike('email', normalizedEmail)
      .limit(1);
    if (profileError) return base;
    const profile = ensureArray<any>(profileRows)[0] || null;

    if (!profile?.id) return base;

    const [explorerRes, providerRes] = await Promise.all([
      supabase.from('explorer_profiles').select('*').eq('user_id', profile.id).maybeSingle(),
      supabase.from('provider_profiles').select('*').eq('user_id', profile.id).maybeSingle(),
    ]);

    return {
      ...base,
      profile: {
        id: profile.id,
        fullName: profile.full_name || undefined,
        email: profile.email || undefined,
        phone: profile.phone || undefined,
        birthDate: profile.birth_date || undefined,
        instagram: profile.instagram_handle || undefined,
        province: profile.province || undefined,
        role: profile.role || undefined,
        createdAt: profile.created_at || undefined,
      },
      explorer: explorerRes.error || !explorerRes.data
        ? undefined
        : {
            level: explorerRes.data.explorer_level || undefined,
            preferredSports: Array.isArray(explorerRes.data.preferred_sports) ? explorerRes.data.preferred_sports : [],
          },
      provider: providerRes.error || !providerRes.data
        ? undefined
        : {
            kind: providerRes.data.provider_kind || undefined,
            acceptsBookings: providerRes.data.accepts_bookings ?? undefined,
            displayName: providerRes.data.display_name || undefined,
      },
    };
  },

  async getCommunicationPreferences(profileId: string): Promise<CommunicationPreferences> {
    await ensureSessionReady();
    const fallback: CommunicationPreferences = {
      profileId,
      bookingEmails: true,
      socialEmails: true,
      systemEmails: true,
      marketingEmails: false,
      weeklyDigestEmails: false,
    };
    if (!profileId) return fallback;

    const { data, error } = await supabase
      .from('communication_preferences')
      .select('profile_id, booking_emails, social_emails, system_emails, marketing_emails, weekly_digest_emails, created_at, updated_at')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fallback;
    return {
      profileId: data.profile_id || profileId,
      bookingEmails: data.booking_emails ?? true,
      socialEmails: data.social_emails ?? true,
      systemEmails: data.system_emails ?? true,
      marketingEmails: data.marketing_emails ?? false,
      weeklyDigestEmails: data.weekly_digest_emails ?? false,
      createdAt: data.created_at || undefined,
      updatedAt: data.updated_at || undefined,
    };
  },

  async updateCommunicationPreferences(profileId: string, preferences: Partial<CommunicationPreferences>): Promise<CommunicationPreferences> {
    await ensureSessionReady();
    if (!profileId) {
      throw new Error('Falta el perfil para guardar preferencias.');
    }

    const payload = {
      profile_id: profileId,
      booking_emails: preferences.bookingEmails ?? true,
      social_emails: preferences.socialEmails ?? true,
      system_emails: preferences.systemEmails ?? true,
      marketing_emails: preferences.marketingEmails ?? false,
      weekly_digest_emails: preferences.weeklyDigestEmails ?? false,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('communication_preferences')
      .upsert(payload, { onConflict: 'profile_id' });
    if (error) throw error;

    return cumbreApi.getCommunicationPreferences(profileId);
  },

  async listCommunicationTemplates(): Promise<CommunicationTemplate[]> {
    const { data, error } = await adminSupabase
      .from('communication_templates')
      .select('id, event_key, name, subject_template, html_template, text_template, locale, enabled, created_at, updated_at')
      .order('event_key', { ascending: true })
      .order('updated_at', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return ensureArray<any>(data).map((row) => ({
      id: row.id,
      eventKey: row.event_key,
      name: row.name,
      subjectTemplate: row.subject_template,
      htmlTemplate: row.html_template,
      textTemplate: row.text_template,
      locale: row.locale || 'both',
      enabled: Boolean(row.enabled),
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined,
    }));
  },

  async upsertCommunicationTemplate(template: {
    id?: string;
    eventKey: string;
    name: string;
    subjectTemplate: string;
    htmlTemplate: string;
    textTemplate: string;
    locale: CommunicationTemplate['locale'];
    enabled: boolean;
  }): Promise<CommunicationTemplate> {
    const payload = {
      id: template.id || undefined,
      event_key: template.eventKey.trim(),
      name: template.name.trim(),
      subject_template: template.subjectTemplate,
      html_template: template.htmlTemplate,
      text_template: template.textTemplate,
      locale: template.locale,
      enabled: template.enabled,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await adminSupabase
      .from('communication_templates')
      .upsert(payload, { onConflict: 'event_key' })
      .select('id, event_key, name, subject_template, html_template, text_template, locale, enabled, created_at, updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('No se pudo guardar la plantilla.');
    return {
      id: data.id,
      eventKey: data.event_key,
      name: data.name,
      subjectTemplate: data.subject_template,
      htmlTemplate: data.html_template,
      textTemplate: data.text_template,
      locale: data.locale || 'both',
      enabled: Boolean(data.enabled),
      createdAt: data.created_at || undefined,
      updatedAt: data.updated_at || undefined,
    };
  },

  async deleteCommunicationTemplate(templateId: string): Promise<void> {
    const { error } = await adminSupabase
      .from('communication_templates')
      .delete()
      .eq('id', templateId);
    if (error) throw error;
  },

  async listCommunicationLogs(limit = 60): Promise<Array<{
    id: string;
    eventKey: string;
    channel: 'push' | 'in_app' | 'email';
    recipientEmail?: string;
    recipientUserId?: string;
    status: 'queued' | 'sent' | 'failed' | 'skipped';
    subject?: string;
    errorMessage?: string;
    createdAt?: string;
  }>> {
    const { data, error } = await adminSupabase
      .from('communication_logs')
      .select('id, event_key, channel, recipient_email, recipient_user_id, status, subject, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ensureArray<any>(data).map((row) => ({
      id: row.id,
      eventKey: row.event_key,
      channel: row.channel,
      recipientEmail: row.recipient_email || undefined,
      recipientUserId: row.recipient_user_id || undefined,
      status: row.status,
      subject: row.subject || undefined,
      errorMessage: row.error_message || undefined,
      createdAt: row.created_at || undefined,
    }));
  },

  async sendCommunicationEmail(input: {
    eventKey: string;
    recipientEmail: string;
    recipientName?: string;
    recipientUserId?: string;
    locale?: 'es' | 'en';
    payload?: Record<string, any>;
    dryRun?: boolean;
  }) {
    const [{ data: adminSessionData }, { data: appSessionData }] = await Promise.all([
      adminSupabase.auth.getSession(),
      supabase.auth.getSession(),
    ]);

    const hasAdminSession = Boolean(adminSessionData.session?.access_token);
    const hasAppSession = Boolean(appSessionData.session?.access_token);

    if (!hasAdminSession && !hasAppSession) {
      await ensureSessionReady();
    }

    const primaryClient = hasAdminSession ? adminSupabase : supabase;
    const fallbackClient = hasAdminSession ? supabase : adminSupabase;

    const { data, error } = await primaryClient.functions.invoke('send-communication-email', {
      body: input,
    });
    if (!error) return data;

    const extractFunctionErrorMessage = async (candidate: any) => {
      try {
        const response = candidate?.context;
        if (!response || typeof response.clone !== 'function') return '';
        const payload = await response.clone().json().catch(() => null);
        return String(payload?.error || payload?.message || '').trim();
      } catch {
        return '';
      }
    };

    const isNetworkLikeEdgeError = /failed to send a request to the edge function|failed to fetch|network/i
      .test(String((error as any)?.message || ''));
    if (!isNetworkLikeEdgeError) {
      const functionMessage = await extractFunctionErrorMessage(error);
      if (functionMessage) {
        throw new Error(functionMessage);
      }
      throw error;
    }

    const { data: fallbackData, error: fallbackError } = await fallbackClient.functions.invoke('send-communication-email', {
      body: input,
    });
    if (fallbackError) {
      const functionMessage = await extractFunctionErrorMessage(fallbackError);
      if (functionMessage) {
        throw new Error(functionMessage);
      }
      throw fallbackError;
    }
    return fallbackData;
  },
};
