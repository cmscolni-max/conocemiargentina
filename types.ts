
export enum PlaceType {
  REFUGIO = 'Refugio',
  ACTIVIDAD = 'Actividades',
  ENTRENA = 'Entrená'
}

export enum ActivityType {
  TREKKING = 'Trekking',
  GASTRONOMIA = 'Gastronómica',
  SKI = 'Ski',
  MONTANISMO = 'Montañismo',
  RAFTING = 'Rafting',
  KAYAK = 'Kayak',
  BUCEO = 'Buceo',
  MOUNTAIN_BIKE = 'Mountain Bike',
  ESCALADA = 'Escalada Deportiva',
  ESCALADA_HIELO = 'Escalada en Hielo',
  PARAPENTE = 'Parapente',
  PARACAIDISMO = 'Paracaidismo',
  BOULDER = 'Boulder'
}

export enum Difficulty {
  EASY = 'Principiante',
  MODERATE = 'Medio',
  HARD = 'Avanzado',
  EXPERT = 'Experto'
}

export type ShelterTransport = 'Auto' | 'Moto' | 'Avion' | 'Micro' | 'Transfer';
export type GuestDocumentType = 'DNI' | 'Pasaporte' | 'ID nacional' | 'Otro';
export type GuestGender = 'Masculino' | 'Femenino' | 'Otro' | 'Prefiero no decir';
export type GuestContactRelation = 'Madre' | 'Padre' | 'Pareja' | 'Amigo/a' | 'Hermano/a' | 'Otro';
export type TrekkingDifficultyLevel = 'Bajo' | 'Medio' | 'Alto';
export type TrekkingCommunicationMedium = 'Teléfono' | 'Radio' | 'Satelital' | 'Ninguno' | 'Otro';

export interface Amenity {
  id: string;
  name: string;
  icon: string;
}

export interface Review {
  id: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
}

export interface NearbyActivity {
  name: string;
  difficulty: Difficulty;
}

export interface ListingFaqItem {
  question: string;
  answer: string;
}

export interface OutdoorSpot {
  id: string;
  isSponsored?: boolean;
  sponsoredStartDate?: string;
  sponsoredEndDate?: string;
  name: string;
  location: string;
  province: string;
  country: 'Argentina';
  description: string;
  price: number;
  rating: number;
  reviewsCount: number;
  placeType: PlaceType;
  activityType?: ActivityType;
  difficulty?: Difficulty;
  images: string[];
  amenities: string[];
  coordinates: { lat: number; lng: number };
  weather: {
    temp: number;
    condition: string;
    forecast: string;
  };
  rules: string[];
  season: string;
  date?: string;
  expeditionStartDate?: string;
  expeditionEndDate?: string;
  expeditionDays?: number;
  expeditionNights?: number;
  expeditionCapacity?: number;
  currency?: string;
  enrollmentStartDate?: string;
  enrollmentEndDate?: string;
  allowEnrollment?: boolean;
  isAcceptingEnrollments?: boolean;
  meetingPoint?: string;
  maxAltitudeReached?: string;
  immersionDepth?: string;
  minorsAllowed?: boolean;
  personalGear?: string[];
  transferIncludedFrom?: string;
  requiresMedicalCertificate?: boolean;
  bookingRequireMedicalInsurance?: boolean;
  bookingRequireHealthDeclaration?: boolean;
  bookingRequireLiabilityWaiver?: boolean;
  bookingLiabilityWaiverText?: string;
  bookingRequireEmergencyContact?: boolean;
  faqs?: ListingFaqItem[];
  expeditionVideoUrl?: string;
  isPetFriendly?: boolean;
  camasCount?: number; 
  carpasCount?: number; 
  camasDisponibles?: number;
  carpasDisponibles?: number;
  isTemporarilyClosed?: boolean;
  reopeningDate?: string;
  closureReason?: string;
  organizerName?: string;
  organizerUserId?: string;
  guidedByName?: string;
  guidedByUserId?: string;
  kind?: 'event' | 'course';
  reviews?: Review[];
  nearbyActivities?: NearbyActivity[];
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  favorites: string[];
  bookings: Booking[];
  level: number;
  badges: string[];
}

export type CommunicationChannel = 'push' | 'in_app' | 'email';

export interface CommunicationPreferences {
  profileId: string;
  bookingEmails: boolean;
  socialEmails: boolean;
  systemEmails: boolean;
  marketingEmails: boolean;
  weeklyDigestEmails: boolean;
  updatedAt?: string;
  createdAt?: string;
}

export interface CommunicationTemplate {
  id: string;
  eventKey: string;
  name: string;
  subjectTemplate: string;
  htmlTemplate: string;
  textTemplate: string;
  locale: 'es' | 'en' | 'both';
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommunicationLog {
  id: string;
  eventKey: string;
  channel: CommunicationChannel;
  recipientEmail?: string;
  recipientUserId?: string;
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  subject?: string;
  errorMessage?: string;
  payload?: Record<string, any>;
  createdAt?: string;
}

export interface Booking {
  id: string;
  spotId: string;
  availabilityCheckId?: string;
  providerUserId?: string;
  createdByUserId?: string;
  createdAt: string;
  reservationName: string;
  reservationLastName: string;
  reservationUser: string;
  email: string;
  phone: string;
  countryCallingCode?: string;
  phoneNumber?: string;
  dateFrom: string;
  dateTo: string;
  needsCarStorage: boolean;
  shelterTransport?: ShelterTransport;
  needsParking?: boolean;
  licensePlate?: string;
  arrivalTime?: string;
  departureTime?: string;
  observations?: string;
  acceptsTerms?: boolean;
  acceptsCancellation?: boolean;
  consentContact?: boolean;
  shelterRoute?: string;
  trekkingDifficultyLevel?: TrekkingDifficultyLevel;
  trekkingWithGuide?: boolean;
  trekkingGuideName?: string;
  trekkingGuideLastName?: string;
  trekkingGuidePhone?: string;
  trekkingResponsibleGroup?: string;
  trekkingPointOfDeparture?: string;
  trekkingDepartureTime?: string;
  trekkingReturnTime?: string;
  trekkingGroupCount?: number;
  trekkingCommunicationMedium?: TrekkingCommunicationMedium;
  trekkingDeclarationAptitude?: boolean;
  trekkingAcceptRecommendations?: boolean;
  trekkingAcceptEquipment?: boolean;
  trekkingWeatherRead?: boolean;
  medicalCertificateFileName?: string;
  objective: string;
  liabilityWaiverAccepted?: boolean;
  liabilityWaiverAcceptedAt?: string;
  liabilityWaiverTextSnapshot?: string;
  requiresRevalidation?: boolean;
  revalidationReason?: string;
  revalidationRequestedAt?: string;
  trekkingNoticeAscentDate?: string;
  trekkingNoticeReturnDate?: string;
  trekkingNoticeHasAdequateEquipment?: boolean;
  trekkingNoticeEmergencyContactName?: string;
  trekkingNoticeEmergencyContactPhone?: string;
  peopleCount: number;
  guests: BookingGuest[];
  status: 'pending' | 'pending_information' | 'confirmed' | 'rejected' | 'cancelled';
  providerMessage?: string;
  updatedAt?: string;
  total: number;
  missingMedicalCertificate?: boolean;
  missingHealthDeclaration?: boolean;
  missingLiabilityWaiver?: boolean;
  missingEmergencyContact?: boolean;
  informationDeadlineAt?: string;
}

export interface AvailabilityCheck {
  id: string;
  spotId: string;
  providerUserId: string;
  createdByUserId: string;
  explorerHandle: string;
  dateFrom: string;
  dateTo: string;
  peopleCount: number;
  status: 'pending' | 'approved' | 'rejected';
  providerMessage?: string;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  linkedBookingId?: string;
}

export interface BookingGuest {
  documentType?: GuestDocumentType;
  firstName: string;
  lastName: string;
  document: string;
  documentIssuerCountry?: string;
  nationality: string;
  residenceCountry?: string;
  gender?: GuestGender;
  birthDate: string;
  age: number | null;
  appUserId?: string;
  appUserHandle?: string;
  email: string;
  phone: string;
  countryCallingCode?: string;
  phoneNumber?: string;
  contactRelation?: GuestContactRelation;
  allergies?: string;
  hasAllergies?: boolean;
  insuranceCoverage?: string;
  responsibilityDeclaration?: boolean;
  hasExperience: boolean;
  experienceLevel?: string;
  insurance: {
    hasInsurance: boolean;
    provider: string;
    memberNumber: string;
  };
  healthDeclarationAnswers?: Record<string, boolean | null>;
  healthDeclarationConfirmed?: boolean;
  medicalCertificateFileName?: string;
  liabilityWaiverAccepted?: boolean;
  liabilityWaiverAcceptedAt?: string;
  liabilityWaiverTextSnapshot?: string;
  trekkingNoticeAscentDate?: string;
  trekkingNoticeReturnDate?: string;
  trekkingNoticeHasAdequateEquipment?: boolean;
  trekkingNoticeEmergencyContactName?: string;
  trekkingNoticeEmergencyContactPhone?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface OutdoorShop {
  id: string;
  providerUserId?: string;
  sponsoredStartDate?: string;
  sponsoredEndDate?: string;
  name: string;
  address: string;
  province: string;
  specialty: string;
  image: string;
  rating: number;
  isSponsored?: boolean;
  website?: string;
  branches?: string[];
  phone?: string;
  instagram?: string;
  description?: string;
  productGallery?: string[];
  reviews?: Review[];
  coordinates?: { lat: number; lng: number };
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type ViewState = 'explore' | 'explore_public' | 'shelters' | 'plan' | 'community' | 'messages' | 'saved' | 'profile' | 'details' | 'shops' | 'menu' | 'noti_tips';

export interface NotiTipMediaItem {
  type: 'image' | 'video';
  url: string;
}

export interface NotiTip {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  media: NotiTipMediaItem[];
  bodyHtml: string;
  bodyText: string;
  authorName: string;
  publishedAt: string;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotiTipReadStat {
  notiTipId: string;
  readers: number;
  lastReadAt?: string;
}

export interface SocialPostMediaItem {
  type: 'image' | 'video';
  src: string;
}

export interface SocialPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  image?: string;
  media?: SocialPostMediaItem[];
  location?: string;
  timestamp: string;
  likes: number;
  comments: number;
  type: 'post' | 'snapshot';
}

export interface UserFriend {
  id: string;
  name: string;
  avatar: string;
  role?: 'explorer' | 'provider' | 'both' | 'admin' | string;
  isFriend: boolean;
  friendStatus?: 'none' | 'sent' | 'received' | 'friends';
  isProvider?: boolean;
  isFollowing?: boolean;
  mutualFriends?: number;
}

export interface ChatThreadParticipant {
  profileId: string;
  name: string;
  avatar: string;
  role?: 'explorer' | 'provider' | 'both' | 'admin';
  isProvider?: boolean;
}

export interface ChatThread {
  id: string;
  createdAt: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount: number;
  participants: ChatThreadParticipant[];
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderProfileId: string;
  body: string;
  createdAt: string;
  senderName: string;
  senderAvatar: string;
  isOwn: boolean;
}

export interface InAppNotification {
  id: string;
  title: string;
  description: string;
  type: 'friend_request' | 'friend_accepted' | 'system';
  friendId?: string;
  recipientRole?: 'provider' | 'explorer' | 'both';
  recipientHandles?: string[];
  bookingId?: string;
  read: boolean;
  createdAt: string;
}
