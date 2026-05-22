
import React, { useEffect, useRef, useState } from 'react';
import {
  OutdoorSpot,
  PlaceType,
  Review,
  Difficulty,
  NearbyActivity,
  ActivityType,
  AvailabilityCheck,
  Booking,
  BookingGuest,
  GuestContactRelation,
  GuestDocumentType,
  GuestGender,
  ShelterTransport,
  TrekkingCommunicationMedium,
  TrekkingDifficultyLevel,
} from '../types';
import { Icons, getAmenityIcon } from '../constants';
import { COUNTRY_CALLING_CODES } from '../data/countryCallingCodes';
import { getGearRecommendation } from '../services/recommendationsService';

interface LocationDetailsProps {
  spot: OutdoorSpot;
  onBack: () => void;
  onOpenProfile?: (userId?: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  isForeigner?: boolean;
  language?: 'es' | 'en';
  bookingUser?: {
    name: string;
    email: string;
  };
  bookingUsersDirectory?: Array<{
    id: string;
    handle: string;
    name: string;
    email?: string;
  }>;
  providerReviews?: Review[];
  onAddProviderReview?: (review: Review) => Promise<boolean | void> | boolean | void;
  onCreateBooking?: (booking: Booking) => Promise<boolean | void> | boolean | void;
  onCreateAvailabilityCheck?: (input: { spotId: string; dateFrom: string; dateTo: string; peopleCount: number }) => Promise<boolean | void> | boolean | void;
  availabilityChecks?: AvailabilityCheck[];
  editingBooking?: Booking | null;
  onUpdateBooking?: (bookingId: string, updates: Partial<Booking>) => void;
  onShowToast?: (message: string) => void;
  existingBookings?: Booking[];
}

const HEALTH_DECLARATION_QUESTIONS = [
  { id: 'cardio_disease', es: '¿Tiene enfermedad cardiovascular?', en: 'Do you have cardiovascular disease?' },
  { id: 'hypertension', es: '¿Tiene hipertensión arterial?', en: 'Do you have high blood pressure?' },
  { id: 'arrhythmia', es: '¿Tiene arritmias diagnosticadas?', en: 'Do you have diagnosed arrhythmias?' },
  { id: 'heart_surgery', es: '¿Tuvo cirugía cardíaca previa?', en: 'Have you had heart surgery before?' },
  { id: 'respiratory_disease', es: '¿Tiene enfermedad respiratoria crónica?', en: 'Do you have chronic respiratory disease?' },
  { id: 'asthma', es: '¿Tiene asma activa?', en: 'Do you have active asthma?' },
  { id: 'copd', es: '¿Tiene EPOC?', en: 'Do you have COPD?' },
  { id: 'diabetes', es: '¿Tiene diabetes?', en: 'Do you have diabetes?' },
  { id: 'insulin_use', es: '¿Usa insulina?', en: 'Do you use insulin?' },
  { id: 'thyroid_disorder', es: '¿Tiene trastornos tiroideos?', en: 'Do you have thyroid disorders?' },
  { id: 'neurological_condition', es: '¿Tiene condición neurológica?', en: 'Do you have a neurological condition?' },
  { id: 'epilepsy', es: '¿Tiene epilepsia o convulsiones?', en: 'Do you have epilepsy or seizures?' },
  { id: 'recent_fainting', es: '¿Tuvo desmayos recientes?', en: 'Have you had recent fainting episodes?' },
  { id: 'head_injury', es: '¿Tuvo traumatismo de cráneo reciente?', en: 'Have you had recent head injury?' },
  { id: 'orthopedic_injury', es: '¿Tiene lesión traumatológica activa?', en: 'Do you have an active orthopedic injury?' },
  { id: 'spine_problem', es: '¿Tiene problemas de columna?', en: 'Do you have spine problems?' },
  { id: 'joint_problem', es: '¿Tiene lesión articular importante?', en: 'Do you have significant joint injury?' },
  { id: 'recent_surgery', es: '¿Fue operado en los últimos 6 meses?', en: 'Have you had surgery in the last 6 months?' },
  { id: 'pregnancy', es: '¿Está embarazada o en posparto reciente?', en: 'Are you pregnant or recently postpartum?' },
  { id: 'blood_disorder', es: '¿Tiene trastornos de coagulación?', en: 'Do you have blood clotting disorders?' },
  { id: 'anticoagulants', es: '¿Toma anticoagulantes?', en: 'Do you take anticoagulants?' },
  { id: 'allergies_severe', es: '¿Tiene alergias severas?', en: 'Do you have severe allergies?' },
  { id: 'anaphylaxis_history', es: '¿Tuvo anafilaxia previa?', en: 'Have you had prior anaphylaxis?' },
  { id: 'medication_regular', es: '¿Toma medicación diaria?', en: 'Do you take daily medication?' },
  { id: 'psychiatric_condition', es: '¿Tiene diagnóstico psiquiátrico activo?', en: 'Do you have an active psychiatric diagnosis?' },
  { id: 'panic_attacks', es: '¿Sufre ataques de pánico?', en: 'Do you suffer panic attacks?' },
  { id: 'substance_use', es: '¿Consumió alcohol/drogas en las últimas 24h?', en: 'Did you use alcohol/drugs in last 24h?' },
  { id: 'infectious_symptoms', es: '¿Tiene síntomas infecciosos actuales?', en: 'Do you currently have infectious symptoms?' },
  { id: 'fever_recent', es: '¿Tuvo fiebre en las últimas 48h?', en: 'Have you had fever in the last 48h?' },
  { id: 'medical_clearance', es: '¿Cuenta con apto médico vigente?', en: 'Do you have a valid medical clearance?' },
] as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const getLocalDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñ'’ -]{2,50}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY_CALLING_CODE_PATTERN = /^\+[1-9]\d{0,3}$/;
const PHONE_PATTERN = /^[0-9\s-()]{6,15}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DOCUMENT_PATTERN = /^[A-Za-z0-9- ]{5,20}$/;
const LICENSE_PLATE_PATTERN = /^[A-Za-z0-9]{6,8}$/;
const NAME_WITH_NUMBERS_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñ'’0-9 -]{2,100}$/;
const DEFAULT_COUNTRY_CALLING_CODE = '+54';

const SHELTER_TRANSPORTS: ShelterTransport[] = ['Auto', 'Moto', 'Avion', 'Micro', 'Transfer'];
const DOCUMENT_TYPES: GuestDocumentType[] = ['DNI', 'Pasaporte', 'ID nacional', 'Otro'];
const GENDERS: GuestGender[] = ['Masculino', 'Femenino', 'Otro', 'Prefiero no decir'];
const CONTACT_RELATIONS: GuestContactRelation[] = ['Madre', 'Padre', 'Pareja', 'Amigo/a', 'Hermano/a', 'Otro'];
const TREKKING_DIFFICULTIES: TrekkingDifficultyLevel[] = ['Bajo', 'Medio', 'Alto'];
const COMMUNICATION_MEDIA: TrekkingCommunicationMedium[] = ['Teléfono', 'Radio', 'Satelital', 'Ninguno', 'Otro'];
const COUNTRY_OPTIONS = Array.from(
  new Set(COUNTRY_CALLING_CODES.map(({ label }) => label.replace(/\s*\(.*\)$/, '').trim()).filter(Boolean))
);

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();
const normalizeLineInput = (value: string) => normalizeWhitespace(value);
const normalizeEmailInput = (value: string) => normalizeWhitespace(value).toLowerCase();
const normalizePhoneDigits = (value: string) => normalizeWhitespace(value).replace(/\s+/g, ' ');
const normalizeCountryCallingCode = (value: string) => normalizeWhitespace(value).replace(/\s+/g, '');
const normalizeTimeInput = (value: string) => normalizeWhitespace(value).slice(0, 5);
const normalizeDocumentInput = (value: string) => normalizeWhitespace(value);
const digitsCount = (value: string) => (value.match(/\d/g) || []).length;
const compactName = (value: string) => normalizeWhitespace(value);
const sanitizeNameInput = (value: string) =>
  normalizeWhitespace(value).replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ'’ -]/g, '');
const sanitizeNameLiveInput = (value: string) =>
  value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ'’ -]/g, '');
const sanitizePhoneInput = (value: string) =>
  normalizeWhitespace(value).replace(/[^+\d\s-()]/g, '');
const sanitizeTextWithNumbersInput = (value: string) =>
  normalizeWhitespace(value).replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ'’0-9 -]/g, '');

export const LocationDetails: React.FC<LocationDetailsProps> = ({ 
  spot, 
  onBack, 
  onOpenProfile,
  isFavorite, 
  onToggleFavorite, 
  isForeigner,
  language = 'es',
  bookingUser,
  bookingUsersDirectory = [],
  providerReviews = [],
  onAddProviderReview,
  onCreateBooking,
  onCreateAvailabilityCheck,
  availabilityChecks = [],
  editingBooking,
  onUpdateBooking,
  onShowToast,
  existingBookings = [],
}) => {
  const fallbackGalleryImage = 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?auto=format&fit=crop&q=80&w=800';
  const [gear, setGear] = useState<{item: string, reason: string}[]>([]);
  const [loadingGear, setLoadingGear] = useState(false);
  const [bookingStep, setBookingStep] = useState(false);
  const [availableBeds, setAvailableBeds] = useState<number>(spot.camasDisponibles ?? spot.camasCount ?? 0);
  const [bedsToBook, setBedsToBook] = useState(1);
  const [availableTents, setAvailableTents] = useState<number>(spot.carpasDisponibles ?? spot.carpasCount ?? 0);
  const [tentsToBook, setTentsToBook] = useState(1);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isGearCollapsed, setIsGearCollapsed] = useState(true);
  const [reservationFirstName, setReservationFirstName] = useState('');
  const [reservationLastName, setReservationLastName] = useState('');
  const [reservationHolderIsGuest, setReservationHolderIsGuest] = useState(false);
  const [reservationEmail, setReservationEmail] = useState('');
  const [reservationPhone, setReservationPhone] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [needsCarStorage, setNeedsCarStorage] = useState(false);
  const [shelterTransport, setShelterTransport] = useState<ShelterTransport | ''>('');
  const [needsParking, setNeedsParking] = useState(false);
  const [licensePlate, setLicensePlate] = useState('');
  const [countryCallingCode, setCountryCallingCode] = useState(DEFAULT_COUNTRY_CALLING_CODE);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [observations, setObservations] = useState('');
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [acceptsCancellation, setAcceptsCancellation] = useState(false);
  const [consentContact, setConsentContact] = useState(false);
  const [shelterRoute, setShelterRoute] = useState('');
  const [trekkingDifficultyLevel, setTrekkingDifficultyLevel] = useState<TrekkingDifficultyLevel | ''>('');
  const [trekkingWithGuide, setTrekkingWithGuide] = useState(true);
  const [trekkingGuideName, setTrekkingGuideName] = useState('');
  const [trekkingGuideLastName, setTrekkingGuideLastName] = useState('');
  const [trekkingGuidePhone, setTrekkingGuidePhone] = useState('');
  const [trekkingResponsibleGroup, setTrekkingResponsibleGroup] = useState('');
  const [trekkingPointOfDeparture, setTrekkingPointOfDeparture] = useState('');
  const [trekkingDepartureTime, setTrekkingDepartureTime] = useState('');
  const [trekkingReturnTime, setTrekkingReturnTime] = useState('');
  const [trekkingGroupCount, setTrekkingGroupCount] = useState(1);
  const [trekkingCommunicationMedium, setTrekkingCommunicationMedium] = useState<TrekkingCommunicationMedium | ''>('');
  const [trekkingDeclarationAptitude, setTrekkingDeclarationAptitude] = useState(false);
  const [trekkingAcceptRecommendations, setTrekkingAcceptRecommendations] = useState(false);
  const [trekkingAcceptEquipment, setTrekkingAcceptEquipment] = useState(false);
  const [trekkingWeatherRead, setTrekkingWeatherRead] = useState(false);
  const [reservationObjective, setReservationObjective] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [isSubmittingAvailabilityCheck, setIsSubmittingAvailabilityCheck] = useState(false);
  const [showAvailabilityCheckSheet, setShowAvailabilityCheckSheet] = useState(false);
  const [availabilityDateFrom, setAvailabilityDateFrom] = useState('');
  const [availabilityDateTo, setAvailabilityDateTo] = useState('');
  const [availabilityPeopleCountInput, setAvailabilityPeopleCountInput] = useState('1');
  const [pendingIncompleteBooking, setPendingIncompleteBooking] = useState<Booking | null>(null);
  const [pendingRequirementLabels, setPendingRequirementLabels] = useState<string[]>([]);
  const [peopleCountInput, setPeopleCountInput] = useState('1');
  const [guests, setGuests] = useState<BookingGuest[]>([]);
  const [showGuestBirthDatePicker, setShowGuestBirthDatePicker] = useState(false);
  const [activeGuestBirthDateIndex, setActiveGuestBirthDateIndex] = useState<number | null>(null);
  const [guestBirthPickerMonth, setGuestBirthPickerMonth] = useState<number>(1);
  const [guestBirthPickerYear, setGuestBirthPickerYear] = useState<number>(2000);
  const [collapsedHealthForms, setCollapsedHealthForms] = useState<Record<number, boolean>>({});
  const initializedEditingBookingIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isSubmittingBooking) return;
    const timeoutId = window.setTimeout(() => {
      setIsSubmittingBooking(false);
      onShowToast?.(
        language === 'es'
          ? 'La reserva tardó demasiado. Volvé a intentarlo.'
          : 'The booking took too long. Please try again.'
      );
    }, 120000);
    return () => window.clearTimeout(timeoutId);
  }, [isSubmittingBooking, language, onShowToast]);
  // Reviews state
  const [userAddedReviews, setUserAddedReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const peopleCount = Math.max(1, Number.parseInt(peopleCountInput, 10) || 1);
  const availabilityPeopleCount = Math.max(1, Number.parseInt(availabilityPeopleCountInput, 10) || 1);
  const isExpedition = spot.placeType === PlaceType.ACTIVIDAD;
  const isActivity = spot.placeType === PlaceType.ACTIVIDAD;
  const isCourseOrEvent = spot.kind === 'course' || spot.kind === 'event';
  const isShelter = spot.placeType === PlaceType.REFUGIO;
  const requireMedicalCertificate = isActivity && (spot.requiresMedicalCertificate ?? true);
  const requireMedicalInsurance = isActivity && (spot.bookingRequireMedicalInsurance ?? true);
  const requireHealthDeclaration = isActivity && (spot.bookingRequireHealthDeclaration ?? true);
  const requireLiabilityWaiver = isActivity && (spot.bookingRequireLiabilityWaiver ?? true);
  const liabilityWaiverText = spot.bookingLiabilityWaiverText?.trim() || '';
  const requireEmergencyContact = isActivity && (spot.bookingRequireEmergencyContact ?? true);
  const isMontanismo = spot.activityType === ActivityType.MONTANISMO;
  const isBuceo = spot.activityType === ActivityType.BUCEO;
  const activityTypeLabel = (() => {
    const sportLabel = spot.activityType || (language === 'es' ? 'Actividad' : 'Activity');
    const shouldForceCourseLabel = spot.activityType === ActivityType.BOULDER && spot.placeType === PlaceType.ENTRENA;
    if (spot.kind === 'course' || shouldForceCourseLabel) {
      return language === 'es' ? `Curso de ${sportLabel}` : `Course of ${sportLabel}`;
    }
    if (spot.kind === 'event') {
      return language === 'es' ? `Evento de ${sportLabel}` : `Event of ${sportLabel}`;
    }
    if (spot.placeType === PlaceType.ENTRENA) {
      return language === 'es' ? `Entrenamiento de ${sportLabel}` : `Training of ${sportLabel}`;
    }
    if (!isActivity) return spot.placeType;
    if (spot.activityType) return spot.activityType;
    return language === 'es' ? 'Actividad' : 'Activity';
  })();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = getLocalDateKey(today);
  const activityBookingStartDate = spot.date || spot.expeditionStartDate || todayKey;
  const activityBookingEndDate = spot.expeditionEndDate || activityBookingStartDate;
  const consumedSpots = existingBookings
    .filter((booking) => booking.status !== 'cancelled' && booking.status !== 'rejected')
    .reduce((sum, booking) => sum + Math.max(booking.peopleCount || 1, 1), 0);
  const remainingActivitySpots = typeof spot.expeditionCapacity === 'number'
    ? Math.max(spot.expeditionCapacity - consumedSpots, 0)
    : null;
  const enrollmentHasWindow = Boolean(spot.enrollmentStartDate && spot.enrollmentEndDate);
  const enrollmentStartsLater = Boolean(spot.enrollmentStartDate && todayKey < spot.enrollmentStartDate);
  const enrollmentClosedByDate = Boolean(spot.enrollmentEndDate && todayKey > spot.enrollmentEndDate);
  const enrollmentClosedByCapacity = remainingActivitySpots !== null && remainingActivitySpots <= 0;
  const enrollmentIsOpenNow = Boolean(
    spot.allowEnrollment === true &&
    enrollmentHasWindow &&
    !enrollmentStartsLater &&
    !enrollmentClosedByDate
  );
  const canEnrollInActivity = !isActivity || (
    enrollmentIsOpenNow &&
    !enrollmentClosedByCapacity
  );
  const enrollmentStatusMessage = isActivity
    ? (
        spot.allowEnrollment !== true
          ? (language === 'es' ? 'Ya no se aceptan reservas para esta actividad.\nPóngase en contacto con el prestador.' : 'Reservations are no longer accepted for this activity.\nPlease contact the provider.')
          : enrollmentStartsLater
            ? `${language === 'es' ? 'Las inscripciones inician:' : 'Registrations start:'} ${spot.enrollmentStartDate}`
            : enrollmentClosedByDate
              ? (language === 'es' ? 'Ya no se aceptan reservas para esta actividad.\nPóngase en contacto con el prestador.' : 'Reservations are no longer accepted for this activity.\nPlease contact the provider.')
              : enrollmentClosedByCapacity
                ? (language === 'es' ? 'No hay cupos disponibles para esta actividad.' : 'There are no spots available for this activity.')
                : null
      )
    : null;
  const displayedReviews = providerReviews.length > 0
    ? providerReviews
    : [...userAddedReviews, ...(spot.reviews || [])];
  const reservationUser = bookingUser?.name
    ? `@${bookingUser.name.trim().toLowerCase().replace(/\s+/g, '_')}`
    : '@explorador';
  const normalizedAvailabilityChecks = availabilityChecks
    .filter((check) => check.spotId === spot.id)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const approvedAvailabilityChecks = normalizedAvailabilityChecks.filter((check) => check.status === 'approved' && !check.linkedBookingId);
  const latestApprovedAvailabilityCheck = approvedAvailabilityChecks[0] || null;
  const [selectedApprovedAvailabilityCheckId, setSelectedApprovedAvailabilityCheckId] = useState<string | null>(null);
  const selectedApprovedAvailabilityCheck = approvedAvailabilityChecks.find((check) => check.id === selectedApprovedAvailabilityCheckId)
    || latestApprovedAvailabilityCheck;
  const hasApprovedAvailabilityToContinue = isShelter && !editingBooking && !!selectedApprovedAvailabilityCheck;
  const findApprovedAvailabilityCheck = (fromDate: string, toDate: string, totalPeople: number) =>
    approvedAvailabilityChecks.find((check) =>
      check.dateFrom === fromDate
      && check.dateTo === toDate
      && check.peopleCount === totalPeople
    );
  const createEmptyHealthAnswers = () =>
    Object.fromEntries(HEALTH_DECLARATION_QUESTIONS.map((q) => [q.id, null])) as Record<string, boolean | null>;
  const buildInformationDeadlineAt = (startDateValue: string) => {
    if (!startDateValue) return undefined;
    const startDate = new Date(`${startDateValue}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) return undefined;
    startDate.setHours(startDate.getHours() - 24);
    return startDate.toISOString();
  };
  const getBookingValidationErrors = () => {
    const errors: string[] = [];

    const sanitizedFirstName = compactName(reservationFirstName);
    const sanitizedLastName = compactName(reservationLastName);
    const sanitizedEmail = normalizeEmailInput(reservationEmail);
    const sanitizedCountryCallingCode = normalizeCountryCallingCode(countryCallingCode);
    const sanitizedPhoneNumber = normalizePhoneDigits(phoneNumber);
    const sanitizedObjective = normalizeLineInput(reservationObjective);
    const sanitizedRoute = normalizeLineInput(shelterRoute);
    const sanitizedGuideName = compactName(trekkingGuideName);
    const sanitizedGuideLastName = compactName(trekkingGuideLastName);
    const sanitizedGuidePhone = normalizePhoneDigits(trekkingGuidePhone);
    const sanitizedResponsibleGroup = normalizeLineInput(trekkingResponsibleGroup);
    const sanitizedPointOfDeparture = normalizeLineInput(trekkingPointOfDeparture);
    const sanitizedTrekkingDepartureTime = normalizeWhitespace(trekkingDepartureTime);
    const sanitizedTrekkingReturnTime = normalizeWhitespace(trekkingReturnTime);
    const sanitizedObservations = normalizeLineInput(observations);

    if (!sanitizedFirstName) errors.push(labels.firstName);
    if (!isValidNameString(sanitizedFirstName)) errors.push(`${labels.firstName}: formato inválido`);
    if (!sanitizedLastName) errors.push(labels.lastName);
    if (!isValidNameString(sanitizedLastName)) errors.push(`${labels.lastName}: formato inválido`);
    if (!isValidEmailString(sanitizedEmail)) errors.push(`${labels.emailField}: formato inválido`);
    if (isShelter || isActivity) {
      if (!isValidCountryCallingCode(sanitizedCountryCallingCode)) errors.push(`${labels.countryCallingCode}: formato inválido`);
      if (!isValidPhoneNumber(sanitizedPhoneNumber)) errors.push(`${labels.phoneNumber}: formato inválido`);
      if (digitsCount(`${sanitizedCountryCallingCode}${sanitizedPhoneNumber}`) > 15) errors.push(`${labels.phoneNumber}: máximo 15 dígitos reales`);
    } else if (!reservationPhone.trim()) {
      errors.push(`${labels.phoneField}: requerido`);
    }
    if (isShelter || isActivity) {
      if (!shelterTransport) errors.push(labels.transport);
      if (shelterTransport === 'Auto') {
        if (typeof needsParking !== 'boolean') errors.push(labels.needsParking);
        if (needsParking && !isValidLicensePlate(normalizeDocumentInput(licensePlate))) {
          errors.push(`${labels.licensePlate}: formato inválido`);
        }
      }
      if (sanitizedObservations.length > 500) errors.push(`${labels.observations}: máximo 500 caracteres`);
    }
    if (isShelter) {
      if (!sanitizedPointOfDeparture) errors.push(labels.pointOfDeparture);
      if (sanitizedPointOfDeparture && (sanitizedPointOfDeparture.length < 3 || sanitizedPointOfDeparture.length > 100)) errors.push(`${labels.pointOfDeparture}: debe tener entre 3 y 100 caracteres`);
      if (!trekkingCommunicationMedium) errors.push(labels.communicationMedium);
      if (!trekkingWeatherRead) errors.push(labels.weatherRead);
      if (!isValidDateString(dateFrom)) errors.push(labels.fromDate);
      if (!isValidDateString(dateTo)) errors.push(labels.toDate);
      if (!dateFrom || dateFrom < todayKey) errors.push(`${labels.fromDate}: debe ser hoy o posterior`);
      if (!dateTo || (dateFrom && dateTo < dateFrom)) errors.push(`${labels.toDate}: debe ser igual o posterior a la fecha desde`);
      if (!sanitizedObjective) errors.push(labels.objective);
      if (sanitizedObjective && !NAME_WITH_NUMBERS_PATTERN.test(sanitizedObjective)) errors.push(`${labels.objective}: formato inválido`);
      if (sanitizedObjective && (sanitizedObjective.length < 2 || sanitizedObjective.length > 50)) errors.push(`${labels.objective}: debe tener entre 2 y 50 caracteres`);
      if (!isValidTimeString(arrivalTime)) errors.push(`${labels.arrivalTime}: formato HH:mm inválido`);
      if (!acceptsTerms) errors.push(labels.acceptsTerms);
      if (!acceptsCancellation) errors.push(labels.acceptsCancellation);
      if (!consentContact) errors.push(labels.consentContact);
      if (!sanitizedRoute) errors.push(labels.route);
      if (sanitizedRoute && !NAME_WITH_NUMBERS_PATTERN.test(sanitizedRoute)) errors.push(`${labels.route}: formato inválido`);
      if (sanitizedRoute && (sanitizedRoute.length < 3 || sanitizedRoute.length > 100)) errors.push(`${labels.route}: debe tener entre 3 y 100 caracteres`);
      if (!isValidDateString(sanitizedTrekkingDepartureTime)) errors.push(`${labels.trekkingDepartureTime}: formato de fecha inválido`);
      if (!isValidDateString(sanitizedTrekkingReturnTime)) errors.push(`${labels.trekkingReturnTime}: formato de fecha inválido`);
      if (isValidDateString(sanitizedTrekkingDepartureTime) && sanitizedTrekkingDepartureTime < dateFrom) {
        errors.push(`${labels.trekkingDepartureTime}: no puede ser anterior a la reserva`);
      }
      if (isValidDateString(sanitizedTrekkingDepartureTime) && isValidDateString(sanitizedTrekkingReturnTime) && sanitizedTrekkingReturnTime < sanitizedTrekkingDepartureTime) {
        errors.push(`${labels.trekkingReturnTime}: debe ser posterior a la fecha de subida`);
      }
      if (!trekkingDifficultyLevel) errors.push(labels.trekkingDifficulty);
      if (!TREKKING_DIFFICULTIES.includes(trekkingDifficultyLevel as TrekkingDifficultyLevel)) errors.push(`${labels.trekkingDifficulty}: valor inválido`);
      if (trekkingGroupCount < 1 || !Number.isInteger(trekkingGroupCount)) errors.push(`${labels.groupCount}: debe ser un entero mayor o igual a 1`);
      if (!trekkingWithGuide) {
        if (!sanitizedResponsibleGroup) errors.push(labels.responsibleGroup);
      } else {
        if (!sanitizedGuideName || !isValidNameString(sanitizedGuideName)) errors.push(`${labels.guideName}: formato inválido`);
        if (!sanitizedGuideLastName || !isValidNameString(sanitizedGuideLastName)) errors.push(`${labels.guideLastName}: formato inválido`);
        if (!isValidPhoneNumber(sanitizedGuidePhone)) errors.push(`${labels.guidePhone}: formato inválido`);
      }
    }

    guests.forEach((guest, idx) => {
      const prefix = `${labels.guest} ${idx + 1}`;
      const guestFirstName = compactName(guest.firstName);
      const guestLastName = compactName(guest.lastName);
      const guestDocument = normalizeDocumentInput(guest.document);
      const guestDocumentIssuerCountry = normalizeLineInput(guest.documentIssuerCountry || '');
      const guestResidenceCountry = normalizeLineInput(guest.residenceCountry || guest.nationality || '');
      const guestCountryCallingCode = normalizeCountryCallingCode(guest.countryCallingCode || '');
      const guestPhoneNumber = normalizePhoneDigits(guest.phoneNumber || guest.phone || '');
      const guestAllergies = normalizeLineInput(guest.allergies || '');
      const guestHasAllergies = guest.hasAllergies ?? Boolean(guestAllergies);
      const guestInsuranceCoverage = normalizeLineInput(guest.insuranceCoverage || '');
      const guestEmgPhone = normalizePhoneDigits(guest.emergencyContactPhone || '');
      const guestEmgName = compactName(guest.emergencyContactName || '');

      if (!guest.documentType || !DOCUMENT_TYPES.includes(guest.documentType as GuestDocumentType)) errors.push(`${prefix}: ${labels.documentType}`);
      if (!guestFirstName || !isValidNameString(guestFirstName)) errors.push(`${prefix}: ${labels.firstName}`);
      if (!guestLastName || !isValidNameString(guestLastName)) errors.push(`${prefix}: ${labels.lastName}`);
      if (!guestDocument || !isValidDocumentString(guestDocument)) errors.push(`${prefix}: ${labels.document}`);
      if (!guestDocumentIssuerCountry || guestDocumentIssuerCountry.length < 2 || guestDocumentIssuerCountry.length > 50) errors.push(`${prefix}: ${labels.documentIssuerCountry}`);
      if (!guestResidenceCountry || guestResidenceCountry.length < 2 || guestResidenceCountry.length > 50) errors.push(`${prefix}: ${labels.residenceCountry}`);
      if (guest.gender && !GENDERS.includes(guest.gender as GuestGender)) errors.push(`${prefix}: ${labels.gender}`);
      if (!guest.birthDate) errors.push(`${prefix}: ${labels.birthDateGuest}`);
      if (guest.birthDate && (!isValidDateString(guest.birthDate) || guest.birthDate >= todayKey)) errors.push(`${prefix}: ${labels.birthDateGuest}: debe ser una fecha pasada`);
      const guestAge = calculateAge(guest.birthDate);
      if (guestAge === null || guestAge < 0 || guestAge > 120) errors.push(`${prefix}: ${labels.ageGuest}: fuera de rango`);
      if (!guest.email.trim() || !isValidEmailString(normalizeEmailInput(guest.email))) errors.push(`${prefix}: ${labels.emailField}`);
      if (guest.countryCallingCode && !isValidCountryCallingCode(guestCountryCallingCode)) errors.push(`${prefix}: ${labels.countryCallingCodeGuest}`);
      if (guest.phoneNumber && !isValidPhoneNumber(guestPhoneNumber)) errors.push(`${prefix}: ${labels.phoneNumberGuest}`);
      if (digitsCount(`${guestCountryCallingCode}${guestPhoneNumber}`) > 15) errors.push(`${prefix}: ${labels.phoneNumberGuest}: máximo 15 dígitos reales`);
      if (guest.contactRelation && !CONTACT_RELATIONS.includes(guest.contactRelation as GuestContactRelation)) errors.push(`${prefix}: ${labels.contactRelation}`);
      if (guestHasAllergies && !guestAllergies) errors.push(`${prefix}: ${labels.allergies}`);
      if (guestAllergies.length > 300) errors.push(`${prefix}: ${labels.allergies}`);
      if (requireLiabilityWaiver && !guest.liabilityWaiverAccepted) errors.push(`${prefix}: ${labels.liabilityWaiver}`);
      // insuranceCoverage field is no longer part of the active form; keep optional length validation only.
      if (guest.insuranceCoverage && guestInsuranceCoverage.length > 100) errors.push(`${prefix}: ${labels.insuranceCoverage}`);
      if (!guest.responsibilityDeclaration) errors.push(`${prefix}: ${labels.responsibilityDeclaration}`);
      if (guest.hasExperience && !guest.experienceLevel?.trim()) {
        errors.push(`${prefix}: ${labels.experienceLevel}`);
      }
      if (requireMedicalInsurance && guest.insurance.hasInsurance) {
        if (!guest.insurance.provider.trim()) errors.push(`${prefix}: ${labels.insuranceProvider}`);
        if (!guest.insurance.memberNumber.trim()) errors.push(`${prefix}: ${labels.insuranceMember}`);
      }
      if (requireEmergencyContact) {
        if (!guestEmgName) errors.push(`${prefix}: ${labels.emergencyContact}`);
        if (!isValidPhoneNumber(guestEmgPhone)) errors.push(`${prefix}: ${labels.emergencyPhone}`);
      }
    });

    if (isShelter) {
      if (shelterTransport === 'Auto' && needsParking && !isValidLicensePlate(normalizeDocumentInput(licensePlate))) {
        errors.push(`${labels.licensePlate}: formato inválido`);
      }
      if (trekkingWithGuide) {
        if (!sanitizedGuideName || !sanitizedGuideLastName || !isValidPhoneNumber(sanitizedGuidePhone)) {
          errors.push(labels.guidedBy);
        }
      } else {
        const guestLookup = guests.some((guest) => {
          const candidateNames = [
            `${compactName(guest.firstName)} ${compactName(guest.lastName)}`.trim(),
            normalizeDocumentInput(guest.document),
            normalizeEmailInput(guest.email),
          ].filter(Boolean);
          return candidateNames.includes(normalizeLineInput(trekkingResponsibleGroup))
            || candidateNames.includes(normalizeDocumentInput(trekkingResponsibleGroup))
            || candidateNames.includes(normalizeEmailInput(trekkingResponsibleGroup));
        });
        if (!guestLookup) {
          errors.push(`${labels.responsibleGroup}: debe coincidir con un huésped`);
        }
      }
      const duplicateDocuments = new Map<string, number[]>();
      guests.forEach((guest, idx) => {
        const key = normalizeDocumentKey(guest.document);
        if (!key) return;
        const list = duplicateDocuments.get(key) || [];
        list.push(idx + 1);
        duplicateDocuments.set(key, list);
      });
      duplicateDocuments.forEach((indexes) => {
        if (indexes.length > 1) {
          errors.push(`${labels.document}: duplicado en huéspedes ${indexes.join(', ')}`);
        }
      });
      const rangesOverlap = (aFrom?: string, aTo?: string, bFrom?: string, bTo?: string) => {
        if (!aFrom || !aTo || !bFrom || !bTo) return false;
        return aFrom <= bTo && bFrom <= aTo;
      };
      const overlappingBookings = existingBookings.filter((booking) => {
        if (booking.id === editingBooking?.id) return false;
        return rangesOverlap(dateFrom, dateTo, booking.dateFrom, booking.dateTo);
      });
      const existingDocumentMatches = overlappingBookings
        .flatMap((booking) => booking.guests.map((guest) => normalizeDocumentKey(guest.document)))
        .filter(Boolean);
      guests.forEach((guest) => {
        const normalizedDocument = normalizeDocumentKey(guest.document);
        if (normalizedDocument && existingDocumentMatches.includes(normalizedDocument)) {
          errors.push(`${labels.document}: ya existe en otra reserva en fechas superpuestas`);
        }
      });
    }

    return Array.from(new Set(errors));
  };
  const finalizeBookingSubmission = async (booking: Booking) => {
    try {
      if (editingBooking) {
        onUpdateBooking?.(editingBooking.id, {
          reservationName: booking.reservationName,
          reservationLastName: booking.reservationLastName,
          email: booking.email,
          phone: booking.phone,
          countryCallingCode: booking.countryCallingCode,
          phoneNumber: booking.phoneNumber,
          dateFrom: booking.dateFrom,
          dateTo: booking.dateTo,
          needsCarStorage: booking.needsCarStorage,
          shelterTransport: booking.shelterTransport,
          needsParking: booking.needsParking,
          licensePlate: booking.licensePlate,
          arrivalTime: booking.arrivalTime,
          departureTime: booking.departureTime,
          observations: booking.observations,
          acceptsTerms: booking.acceptsTerms,
          acceptsCancellation: booking.acceptsCancellation,
          consentContact: booking.consentContact,
          shelterRoute: booking.shelterRoute,
          trekkingDifficultyLevel: booking.trekkingDifficultyLevel,
          trekkingWithGuide: booking.trekkingWithGuide,
          trekkingGuideName: booking.trekkingGuideName,
          trekkingGuideLastName: booking.trekkingGuideLastName,
          trekkingGuidePhone: booking.trekkingGuidePhone,
          trekkingResponsibleGroup: booking.trekkingResponsibleGroup,
          trekkingPointOfDeparture: booking.trekkingPointOfDeparture,
          trekkingDepartureTime: booking.trekkingDepartureTime,
          trekkingReturnTime: booking.trekkingReturnTime,
          trekkingGroupCount: booking.trekkingGroupCount,
          trekkingCommunicationMedium: booking.trekkingCommunicationMedium,
          trekkingDeclarationAptitude: booking.trekkingDeclarationAptitude,
          trekkingAcceptRecommendations: booking.trekkingAcceptRecommendations,
          trekkingAcceptEquipment: booking.trekkingAcceptEquipment,
          trekkingWeatherRead: booking.trekkingWeatherRead,
          objective: booking.objective,
          requiresRevalidation: booking.requiresRevalidation,
          revalidationReason: booking.revalidationReason,
          revalidationRequestedAt: booking.revalidationRequestedAt,
          missingMedicalCertificate: booking.missingMedicalCertificate,
          missingHealthDeclaration: booking.missingHealthDeclaration,
          missingLiabilityWaiver: booking.missingLiabilityWaiver,
          missingEmergencyContact: booking.missingEmergencyContact,
          informationDeadlineAt: booking.informationDeadlineAt,
          trekkingNoticeAscentDate: booking.trekkingNoticeAscentDate,
          trekkingNoticeReturnDate: booking.trekkingNoticeReturnDate,
          trekkingNoticeHasAdequateEquipment: booking.trekkingNoticeHasAdequateEquipment,
          trekkingNoticeEmergencyContactName: booking.trekkingNoticeEmergencyContactName,
          trekkingNoticeEmergencyContactPhone: booking.trekkingNoticeEmergencyContactPhone,
          peopleCount: booking.peopleCount,
          guests: booking.guests,
          status: booking.status,
        });
      } else {
        const created = await onCreateBooking?.(booking);
        if (created === false) {
          return false;
        }
      }
      onShowToast?.(`${labels.bookingSuccessTitle} ${labels.bookingSuccessBody}`);
      setPendingIncompleteBooking(null);
      setPendingRequirementLabels([]);
      setBookingStep(false);
      onBack();
      return true;
    } catch (error) {
      console.error('Error finalizing booking submission:', error);
      const details = typeof error === 'object' && error !== null
        ? [
            'message' in error ? String((error as { message?: unknown }).message || '') : '',
            'details' in error ? String((error as { details?: unknown }).details || '') : '',
            'hint' in error ? String((error as { hint?: unknown }).hint || '') : '',
            'code' in error ? String((error as { code?: unknown }).code || '') : '',
          ].filter(Boolean).join(' | ')
        : error instanceof Error
          ? error.message
          : '';
      onShowToast?.(
        language === 'es'
          ? `No se pudo enviar la reserva.${details ? ` ${details}` : ''}`
          : `Could not submit the booking.${details ? ` ${details}` : ''}`
      );
      return false;
    }
  };

  const submitBooking = async (booking: Booking) => {
    if (isSubmittingBooking) return false;
    setIsSubmittingBooking(true);
    try {
      return await finalizeBookingSubmission(booking);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const createEmptyGuest = (): BookingGuest => ({
    documentType: undefined,
    firstName: '',
    lastName: '',
    document: '',
    documentIssuerCountry: '',
    nationality: '',
    residenceCountry: '',
    gender: undefined,
    birthDate: '',
    age: null,
    appUserId: '',
    appUserHandle: '',
    email: '',
    phone: '',
    countryCallingCode: '',
    phoneNumber: '',
    contactRelation: undefined,
    allergies: '',
    hasAllergies: false,
    insuranceCoverage: '',
    responsibilityDeclaration: false,
    hasExperience: false,
    experienceLevel: '',
    insurance: {
      hasInsurance: false,
      provider: '',
      memberNumber: '',
    },
    healthDeclarationAnswers: createEmptyHealthAnswers(),
    healthDeclarationConfirmed: false,
    medicalCertificateFileName: '',
    liabilityWaiverAccepted: false,
    trekkingNoticeAscentDate: '',
    trekkingNoticeReturnDate: '',
    trekkingNoticeHasAdequateEquipment: undefined,
    trekkingNoticeEmergencyContactName: '',
    trekkingNoticeEmergencyContactPhone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  const calculateAge = (birthDateValue: string) => {
    if (!birthDateValue) return null;
    const parts = birthDateValue.split('-').map(Number);
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - year;
    const monthDiff = today.getMonth() - (month - 1);
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) age--;
    return age;
  };

  const isValidDateString = (value: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
  const isValidTimeString = (value: string) => TIME_PATTERN.test(value);
  const isValidCountryCallingCode = (value: string) => COUNTRY_CALLING_CODE_PATTERN.test(value);
  const isValidPhoneNumber = (value: string) => PHONE_PATTERN.test(value);
  const isValidNameString = (value: string) => NAME_PATTERN.test(value);
  const isValidEmailString = (value: string) => EMAIL_PATTERN.test(value);
  const isValidDocumentString = (value: string) => DOCUMENT_PATTERN.test(value);
  const isValidLicensePlate = (value: string) => LICENSE_PLATE_PATTERN.test(value);
  const normalizeDocumentKey = (value: string) => normalizeWhitespace(value).toUpperCase().replace(/[\s-]+/g, '');
  const timeToMinutes = (value: string) => {
    if (!isValidTimeString(value)) return null;
    const [hours, minutes] = value.split(':').map(Number);
    return (hours * 60) + minutes;
  };
  const getGuestCombinedPhoneDigits = (guest: BookingGuest) =>
    digitsCount(`${guest.countryCallingCode || ''}${guest.phoneNumber || ''}${guest.phone || ''}`);

  const difficultyBadgeStyles: Record<Difficulty, string> = {
    [Difficulty.EASY]: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
    [Difficulty.MODERATE]: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50',
    [Difficulty.HARD]: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/50',
    [Difficulty.EXPERT]: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50',
  };

  useEffect(() => {
    const fetchGear = async () => {
      if (isExpedition) {
        setGear([]);
        setLoadingGear(false);
        return;
      }
      setLoadingGear(true);
      const recs = await getGearRecommendation(spot.location, spot.weather.condition, spot.activityType || spot.placeType, language);
      setGear(recs);
      setLoadingGear(false);
    };
    fetchGear();
  }, [spot.id, spot.location, spot.weather.condition, spot.activityType, spot.placeType, language, isExpedition]);

  useEffect(() => {
    setAvailableBeds(spot.camasDisponibles ?? spot.camasCount ?? 0);
    setBedsToBook(1);
    setAvailableTents(spot.carpasDisponibles ?? spot.carpasCount ?? 0);
    setTentsToBook(1);
  }, [spot.id]);

  useEffect(() => {
    initializedEditingBookingIdRef.current = null;
    setUserAddedReviews([]);
    setReservationFirstName('');
    setReservationLastName('');
    setReservationHolderIsGuest(false);
    setReservationEmail(bookingUser?.email || '');
    setReservationPhone('');
    setDateFrom('');
    setDateTo('');
    setNeedsCarStorage(false);
    setShelterTransport('');
    setNeedsParking(false);
    setLicensePlate('');
    setCountryCallingCode(DEFAULT_COUNTRY_CALLING_CODE);
    setPhoneNumber('');
    setArrivalTime('');
    setObservations('');
    setAcceptsTerms(false);
    setAcceptsCancellation(false);
    setConsentContact(false);
    setShelterRoute('');
    setTrekkingDifficultyLevel('');
    setTrekkingWithGuide(true);
    setTrekkingGuideName('');
    setTrekkingGuideLastName('');
    setTrekkingGuidePhone('');
    setTrekkingResponsibleGroup('');
    setTrekkingPointOfDeparture('');
    setTrekkingDepartureTime('');
    setTrekkingReturnTime('');
    setTrekkingGroupCount(1);
    setTrekkingCommunicationMedium('');
    setTrekkingDeclarationAptitude(false);
    setTrekkingAcceptRecommendations(false);
    setTrekkingAcceptEquipment(false);
    setTrekkingWeatherRead(false);
    setReservationObjective('');
    setAvailabilityDateFrom('');
    setAvailabilityDateTo('');
    setAvailabilityPeopleCountInput('1');
    setShowAvailabilityCheckSheet(false);
    setPeopleCountInput('1');
    setGuests([createEmptyGuest()]);
    setCollapsedHealthForms({});
    setSelectedApprovedAvailabilityCheckId(null);
  }, [spot.id, bookingUser?.email]);

  useEffect(() => {
    if (!approvedAvailabilityChecks.length) {
      setSelectedApprovedAvailabilityCheckId(null);
      return;
    }
    if (selectedApprovedAvailabilityCheckId && approvedAvailabilityChecks.some((check) => check.id === selectedApprovedAvailabilityCheckId)) {
      return;
    }
    setSelectedApprovedAvailabilityCheckId(approvedAvailabilityChecks[0].id);
  }, [approvedAvailabilityChecks, selectedApprovedAvailabilityCheckId]);

  const startBookingFromApprovedAvailability = (check: AvailabilityCheck) => {
    setDateFrom(check.dateFrom);
    setDateTo(check.dateTo);
    setPeopleCountInput(String(Math.max(1, check.peopleCount || 1)));
    setBookingStep(true);
  };

  useEffect(() => {
    if (!editingBooking || editingBooking.spotId !== spot.id) return;
    if (initializedEditingBookingIdRef.current === editingBooking.id) return;
    initializedEditingBookingIdRef.current = editingBooking.id;
    setReservationFirstName(editingBooking.reservationName || '');
    setReservationLastName(editingBooking.reservationLastName || '');
    setReservationEmail(editingBooking.email || bookingUser?.email || '');
    setReservationPhone(editingBooking.phone || '');
    setDateFrom(editingBooking.dateFrom || '');
    setDateTo(editingBooking.dateTo || '');
    setNeedsCarStorage(!!editingBooking.needsCarStorage);
    setShelterTransport((editingBooking.shelterTransport || '') as ShelterTransport | '');
    setNeedsParking(Boolean(editingBooking.needsParking ?? editingBooking.needsCarStorage));
    setLicensePlate(editingBooking.licensePlate || '');
    setCountryCallingCode(editingBooking.countryCallingCode || DEFAULT_COUNTRY_CALLING_CODE);
    setPhoneNumber(editingBooking.phoneNumber || '');
    setArrivalTime(editingBooking.arrivalTime || '');
    setObservations(editingBooking.observations || '');
    setAcceptsTerms(Boolean(editingBooking.acceptsTerms));
    setAcceptsCancellation(Boolean(editingBooking.acceptsCancellation));
    setConsentContact(Boolean(editingBooking.consentContact));
    setShelterRoute(editingBooking.shelterRoute || '');
    setTrekkingDifficultyLevel((editingBooking.trekkingDifficultyLevel || '') as TrekkingDifficultyLevel | '');
    setTrekkingWithGuide(editingBooking.trekkingWithGuide !== false);
    setTrekkingGuideName(editingBooking.trekkingGuideName || '');
    setTrekkingGuideLastName(editingBooking.trekkingGuideLastName || '');
    setTrekkingGuidePhone(editingBooking.trekkingGuidePhone || '');
    setTrekkingResponsibleGroup(editingBooking.trekkingResponsibleGroup || '');
    setTrekkingPointOfDeparture(editingBooking.trekkingPointOfDeparture || '');
    setTrekkingDepartureTime(editingBooking.trekkingDepartureTime || '');
    setTrekkingReturnTime(editingBooking.trekkingReturnTime || '');
    setTrekkingGroupCount(editingBooking.trekkingGroupCount && editingBooking.trekkingGroupCount > 0 ? editingBooking.trekkingGroupCount : 1);
    setTrekkingCommunicationMedium((editingBooking.trekkingCommunicationMedium || '') as TrekkingCommunicationMedium | '');
    setTrekkingDeclarationAptitude(Boolean(editingBooking.trekkingDeclarationAptitude));
    setTrekkingAcceptRecommendations(Boolean(editingBooking.trekkingAcceptRecommendations));
    setTrekkingAcceptEquipment(Boolean(editingBooking.trekkingAcceptEquipment));
    setTrekkingWeatherRead(Boolean(editingBooking.trekkingWeatherRead));
    setReservationObjective(editingBooking.objective || '');
    setPeopleCountInput(String(editingBooking.peopleCount > 0 ? editingBooking.peopleCount : 1));
    const nextGuests = editingBooking.guests?.length > 0 ? editingBooking.guests : [createEmptyGuest()];
    setGuests(nextGuests);
    const firstGuest = nextGuests[0];
    const bookingCode = normalizeCountryCallingCode(editingBooking.countryCallingCode || DEFAULT_COUNTRY_CALLING_CODE);
    const bookingPhone = normalizePhoneDigits(editingBooking.phoneNumber || '');
    const guestCode = normalizeCountryCallingCode(firstGuest?.countryCallingCode || '');
    const guestPhone = normalizePhoneDigits(firstGuest?.phoneNumber || firstGuest?.phone || '');
    const firstGuestMatchesHolder = Boolean(
      firstGuest
      && compactName(firstGuest.firstName) === compactName(editingBooking.reservationName || '')
      && compactName(firstGuest.lastName) === compactName(editingBooking.reservationLastName || '')
      && normalizeEmailInput(firstGuest.email || '') === normalizeEmailInput(editingBooking.email || '')
      && guestCode === bookingCode
      && guestPhone === bookingPhone
    );
    setReservationHolderIsGuest(firstGuestMatchesHolder);
    setBookingStep(true);
  }, [editingBooking, spot.id, bookingUser?.email]);

  useEffect(() => {
    setGuests((prev) => {
      if (prev.length === peopleCount) return prev;
      if (prev.length > peopleCount) return prev.slice(0, peopleCount);
      return [...prev, ...Array.from({ length: peopleCount - prev.length }, createEmptyGuest)];
    });
  }, [peopleCount]);

  useEffect(() => {
    if (!reservationHolderIsGuest) return;
    setGuests((prev) => {
      if (prev.length === 0) return prev;
      const normalizedCode = normalizeCountryCallingCode(countryCallingCode || DEFAULT_COUNTRY_CALLING_CODE);
      const normalizedPhone = normalizePhoneDigits(phoneNumber || reservationPhone || '');
      const nextFirstGuest = {
        ...prev[0],
        firstName: sanitizeNameLiveInput(reservationFirstName),
        lastName: sanitizeNameLiveInput(reservationLastName),
        email: normalizeEmailInput(reservationEmail),
        countryCallingCode: normalizedCode,
        phoneNumber: normalizedPhone,
        phone: `${normalizedCode} ${normalizedPhone}`.trim(),
      };
      const unchanged = (
        prev[0].firstName === nextFirstGuest.firstName
        && prev[0].lastName === nextFirstGuest.lastName
        && prev[0].email === nextFirstGuest.email
        && (prev[0].countryCallingCode || '') === (nextFirstGuest.countryCallingCode || '')
        && (prev[0].phoneNumber || '') === (nextFirstGuest.phoneNumber || '')
        && (prev[0].phone || '') === (nextFirstGuest.phone || '')
      );
      if (unchanged) return prev;
      return [nextFirstGuest, ...prev.slice(1)];
    });
  }, [
    reservationHolderIsGuest,
    reservationFirstName,
    reservationLastName,
    reservationEmail,
    countryCallingCode,
    phoneNumber,
    reservationPhone,
  ]);

  const handleShare = () => {
    const descText = spot.description ? spot.description.substring(0, 100) + '...' : '';
    const shareData = {
      title: `Recorre Argentina - ${spot.name}`,
      text: `¡Mirá este lugar en Recorre Argentina: ${spot.name}! ${descText}`,
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData).catch((err) => {
        if (err.name !== 'AbortError') console.error('Error sharing:', err);
      });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
        .then(() => alert(language === 'es' ? '¡Enlace copiado al portapapeles!' : 'Link copied to clipboard!'))
        .catch(() => alert(language === 'es' ? 'No se pudo copiar el enlace.' : 'Could not copy link.'));
    }
  };

  const handleOpenMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.coordinates.lat},${spot.coordinates.lng}`;
    window.open(url, '_blank');
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const review: Review = {
      id: Date.now().toString(),
      userName: bookingUser?.name?.trim() || (language === 'es' ? 'Explorador' : 'Recorre Argentina'),
      userAvatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(bookingUser?.name?.trim() || 'explorer')}`,
      rating: newRating,
      comment: newComment,
      date: new Date().toLocaleDateString()
    };

    if (onAddProviderReview) {
      const result = await onAddProviderReview(review);
      if (result === false) return;
    } else {
      setUserAddedReviews((prev) => [review, ...prev]);
    }
    setNewComment('');
    setNewRating(5);
    setShowReviewForm(false);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= Math.round(rating) ? 'text-yellow-500' : 'text-stone-300 dark:text-stone-700'}>
            <Icons.Star />
          </span>
        ))}
      </div>
    );
  };

  const labels = {
    booking: language === 'es' ? 'Confirmar Reserva' : 'Confirm Booking',
    stay: language === 'es' ? 'Estadía' : 'Stay',
    selectDates: language === 'es' ? 'Seleccionar Fechas' : 'Select Dates',
    total: language === 'es' ? 'Total' : 'Total',
    currencyNote: language === 'es' ? 'Consultar conversión a tu moneda local' : 'Check conversion to your local currency',
    pay: language === 'es' ? 'Confirmar' : 'Confirm',
    description: language === 'es' ? 'Descripción' : 'Description',
    amenities: language === 'es' ? 'Comodidades' : 'Amenities',
    gearAi: language === 'es' ? 'Equipo Recomendado' : 'Recommended Gear',
    viewAll: language === 'es' ? 'Ver Todo' : 'View All',
    collapse: language === 'es' ? 'Colapsar' : 'Collapse',
    gallery: language === 'es' ? 'Galería' : 'Gallery',
    rules: language === 'es' ? 'Normas del Lugar' : 'Site Rules',
    reviews: language === 'es'
      ? (isActivity ? 'Algunas reseñas y opiniones del organizador' : 'Reseñas')
      : (isActivity ? 'Some organizer reviews and opinions' : 'Reviews'),
    rate: language === 'es' ? 'Calificar' : 'Rate',
    cancel: language === 'es' ? 'Cancelar' : 'Cancel',
    yourRating: language === 'es' ? 'Tu Puntuación' : 'Your Rating',
    yourComment: language === 'es' ? 'Tu Comentario' : 'Your Comment',
    placeholderComment: language === 'es' ? 'Contanos tu experiencia en el lugar...' : 'Tell us about your experience...',
    send: language === 'es' ? 'Enviar Reseña' : 'Send Review',
    noReviews: language === 'es' ? 'Aún no hay reseñas.' : 'No reviews yet.',
    book: language === 'es'
      ? (isCourseOrEvent ? 'Registrarme' : 'Reservar')
      : (isCourseOrEvent ? 'Register me' : 'Book'),
    checkAvailability: language === 'es' ? 'Chequear disponibilidad' : 'Check availability',
    completeBooking: language === 'es' ? 'Completar reserva' : 'Complete booking',
    capacity: language === 'es' ? 'Capacidad' : 'Capacity',
    beds: language === 'es' ? 'Camas' : 'Beds',
    tents: language === 'es' ? 'Parcela para carpas' : 'Tent pitch',
    location: language === 'es' ? 'Ubicación' : 'Location',
    openMaps: language === 'es' ? 'Abrir en Google Maps' : 'Open in Google Maps',
    level: language === 'es' ? 'Nivel requerido' : 'Required level',
    organizedBy: language === 'es' ? 'Organizado por' : 'Organized by',
    guidedBy: language === 'es' ? 'Guiado por' : 'Guided by',
    expeditionDates: language === 'es' ? 'Fechas de expedición' : 'Expedition dates',
    meetingPoint: language === 'es' ? 'Lugar de encuentro' : 'Meeting point',
    maxAltitudeReached: language === 'es' ? 'Altitud Máxima Alcanzada' : 'Max altitude reached',
    immersionDepth: language === 'es' ? 'Metros de Inmersión' : 'Immersion depth',
    spotsAvailable: language === 'es' ? 'Cupo disponible' : 'Available spots',
    minorsAllowed: language === 'es' ? 'Apto menores de edad' : 'Minors allowed',
    personalGear: language === 'es' ? 'Equipo personal necesario' : 'Required personal gear',
    transferIncluded: language === 'es' ? 'Incluye traslado desde' : 'Includes transfer from',
    yes: language === 'es' ? 'Sí' : 'Yes',
    no: language === 'es' ? 'No' : 'No',
    notSpecified: language === 'es' ? 'No especificado' : 'Not specified',
    reservationData: language === 'es' ? 'Datos de la reserva' : 'Reservation details',
    firstName: language === 'es' ? 'Nombre' : 'First name',
    lastName: language === 'es' ? 'Apellido' : 'Last name',
    user: language === 'es' ? 'Usuario' : 'User',
    emailField: language === 'es' ? 'Email' : 'Email',
    phoneField: language === 'es' ? 'Teléfono' : 'Phone',
    fromDate: language === 'es' ? 'Fecha desde' : 'Date from',
    toDate: language === 'es' ? 'Fecha hasta' : 'Date to',
    carStorage: language === 'es' ? '¿Necesita espacio para guardar auto?' : 'Need car storage space?',
    transport: language === 'es' ? 'Medio de transporte' : 'Transport method',
    needsParking: language === 'es' ? '¿Necesita estacionamiento?' : 'Needs parking?',
    licensePlate: language === 'es' ? 'Patente' : 'License plate',
    countryCallingCode: language === 'es' ? 'Código país' : 'Country code',
    phoneNumber: language === 'es' ? 'Teléfono' : 'Phone number',
    arrivalTime: language === 'es' ? 'Hora de llegada' : 'Arrival time',
    departureTime: language === 'es' ? 'Hora de salida' : 'Departure time',
    observations: language === 'es' ? 'Observaciones' : 'Observations',
    acceptsTerms: language === 'es' ? 'Acepto los términos' : 'I accept the terms',
    acceptsCancellation: language === 'es' ? 'Acepto la política de cancelación' : 'I accept the cancellation policy',
    consentContact: language === 'es' ? 'Autorizo el contacto' : 'I authorize contact',
    objective: language === 'es' ? 'Objetivo a hacer' : 'Objective',
    route: language === 'es' ? 'Ruta' : 'Route',
    trekkingDifficulty: language === 'es' ? 'Nivel de dificultad' : 'Difficulty level',
    withGuide: language === 'es' ? '¿Con guía?' : 'With guide?',
    guideName: language === 'es' ? 'Nombre del guía' : 'Guide first name',
    guideLastName: language === 'es' ? 'Apellido del guía' : 'Guide last name',
    guidePhone: language === 'es' ? 'Teléfono del guía' : 'Guide phone',
    responsibleGroup: language === 'es' ? 'Responsable del grupo' : 'Group responsible',
    pointOfDeparture: language === 'es' ? 'Punto de salida' : 'Departure point',
    trekkingDepartureTime: language === 'es' ? 'Fecha de subida' : 'Ascent date',
    trekkingReturnTime: language === 'es' ? 'Fecha de bajada' : 'Descent date',
    groupCount: language === 'es' ? 'Cantidad del grupo' : 'Group size',
    communicationMedium: language === 'es' ? 'Medio de comunicación' : 'Communication medium',
    declarationAptitude: language === 'es' ? 'Declaro aptitud física' : 'I declare physical fitness',
    weatherRead: language === 'es' ? 'Analizaré el clima antes de emprender la expedición' : 'I will check the weather before the expedition',
    trekkingNotice: language === 'es' ? 'Aviso de Trekking a Guardaparque' : 'Ranger trekking notice',
    ascentDate: language === 'es' ? 'Fecha de subida' : 'Ascent date',
    returnDate: language === 'es' ? 'Fecha de bajada' : 'Descent date',
    adequateEquipment: language === 'es' ? '¿Tiene equipo adecuado?' : 'Has adequate equipment?',
    emergencyNoticeName: language === 'es' ? 'Contacto de emergencia (nombre)' : 'Emergency contact (name)',
    emergencyNoticePhone: language === 'es' ? 'Contacto de emergencia (teléfono)' : 'Emergency contact (phone)',
    guestsCount: language === 'es' ? 'Cantidad de personas' : 'People count',
    guestData: language === 'es' ? 'Datos de huéspedes' : 'Guest details',
    guest: language === 'es' ? (isActivity ? 'Participante' : 'Huésped') : (isActivity ? 'Participant' : 'Guest'),
    documentType: language === 'es' ? 'Tipo de documento' : 'Document type',
    document: language === 'es' ? 'Número de documento' : 'Document number',
    documentIssuerCountry: language === 'es' ? 'País emisor' : 'Document issuer country',
    nationality: language === 'es' ? 'País de residencia' : 'Country of residence',
    gender: language === 'es' ? 'Género' : 'Gender',
    residenceCountry: language === 'es' ? 'País de residencia' : 'Country of residence',
    countryCallingCodeGuest: language === 'es' ? 'Código país' : 'Country code',
    phoneNumberGuest: language === 'es' ? 'Teléfono' : 'Phone number',
    contactRelation: language === 'es' ? 'Relación' : 'Relation',
    allergies: language === 'es' ? 'Alergias' : 'Allergies',
    insuranceCoverage: language === 'es' ? 'Cobertura del seguro' : 'Insurance coverage',
    responsibilityDeclaration: language === 'es' ? 'Declaro aptitud física' : 'I declare physical fitness',
    experience: language === 'es' ? '¿Tienes experiencia?' : 'Do you have experience?',
    experienceLevel: language === 'es' ? 'Nivel de experiencia' : 'Experience level',
    medicalInsurance: language === 'es' ? '¿Cuentas con seguro médico?' : 'Do you have medical insurance?',
    insuranceProvider: language === 'es' ? '¿Cuál?' : 'Provider',
    insuranceMember: language === 'es' ? 'Número de afiliado' : 'Membership number',
    emergencyContact: language === 'es' ? 'Contacto de emergencia (nombre)' : 'Emergency contact (name)',
    emergencyPhone: language === 'es' ? 'Contacto de emergencia (teléfono)' : 'Emergency contact (phone)',
    holderAlsoGuest: language === 'es' ? 'El encargado de la reserva también participa' : 'Reservation holder also joins',
    birthDateGuest: language === 'es' ? 'Fecha de nacimiento' : 'Birth date',
    ageGuest: language === 'es' ? 'Edad' : 'Age',
    appUserGuest: language === 'es' ? 'Usuario app (opcional)' : 'App user (optional)',
    selectUser: language === 'es' ? 'Buscar usuario...' : 'Search user...',
    healthDeclaration: language === 'es' ? 'Declaración jurada de salud' : 'Health affidavit',
    liabilityWaiver: language === 'es' ? 'Deslinde de responsabilidades civiles' : 'Civil liability waiver',
    healthProgress: language === 'es' ? 'Completadas' : 'Completed',
    acceptWaiver: language === 'es' ? 'Lei y acepto las condiciones establecidas' : 'I have read and accept the stated conditions',
    waiverText: language === 'es'
      ? 'Declaro participar por mi cuenta y riesgo, eximiendo de responsabilidad civil al organizador y prestador, salvo dolo o culpa grave.'
      : 'I declare that I participate at my own risk, releasing organizer/provider from civil liability, except willful misconduct or gross negligence.',
    waiverProviderText: language === 'es' ? 'Texto establecido por el prestador' : 'Provider waiver text',
    waiverAcceptedAt: language === 'es' ? 'Aceptado el' : 'Accepted on',
    bookingNeedsRevalidation: language === 'es' ? 'Esta reserva necesita actualizar requisitos antes de quedar validada.' : 'This booking needs requirements revalidation before it can be validated.',
    healthTruthDeclaration: language === 'es'
      ? 'Declaro que la información arriba declarada es verídica frente al estado de salud.'
      : 'I declare that the health information provided above is truthful.',
    medicalCertificate: language === 'es' ? 'Apto físico (PDF o imagen)' : 'Medical certificate (PDF or image)',
    medicalCertificateHint: language === 'es'
      ? 'Podés adjuntar un PDF o una imagen desde archivos, cámara o galería.'
      : 'You can attach a PDF or an image from files, camera, or gallery.',
    frequentlyAskedQuestions: language === 'es' ? 'Preguntas frecuentes' : 'Frequently asked questions',
    bookingSuccessTitle: language === 'es' ? 'Listo! tu reserva esta completa!' : 'Done! Your booking is complete!',
    bookingSuccessBody: language === 'es'
      ? 'Te avisaremos cuando el prestador la confirme.'
      : 'We will notify you when the provider confirms it.',
    ok: 'OK',
  };

  const formatDate = () => {
    if (!spot.date) return null;
    const d = new Date(`${spot.date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const toInstagramUrl = (name?: string) => {
    if (!name) return null;
    const handle = name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9._\s]/g, '')
      .replace(/\s+/g, '_');
    if (!handle) return null;
    return `https://instagram.com/${handle}`;
  };
  const organizerInstagramUrl = toInstagramUrl(spot.organizerName);
  const guideInstagramUrl = toInstagramUrl(spot.guidedByName);
  const showGuideInstagram = !!guideInstagramUrl && guideInstagramUrl !== organizerInstagramUrl;

  const formatShortDate = (value?: string) => {
    if (!value) return null;
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatBirthDateDisplay = (value?: string) => {
    if (!value) return '';
    const normalized = value.trim();
    const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
    return normalized.replace(/\//g, '-');
  };

  const getDaysInMonth = (year: number, month: number) => {
    if (!year || !month) return 31;
    return new Date(year, month, 0).getDate();
  };

  const updateGuest = (index: number, patch: Partial<BookingGuest>) => {
    setGuests((prev) => prev.map((guest, i) => (i === index ? { ...guest, ...patch } : guest)));
  };

  const updateGuestInsurance = (index: number, patch: Partial<BookingGuest['insurance']>) => {
    setGuests((prev) =>
      prev.map((guest, i) => (i === index ? { ...guest, insurance: { ...guest.insurance, ...patch } } : guest))
    );
  };

  useEffect(() => {
    if (shelterTransport !== 'Auto') {
      setNeedsParking(false);
      setLicensePlate('');
    }
  }, [shelterTransport]);

  useEffect(() => {
    if (trekkingWithGuide) {
      setTrekkingResponsibleGroup('');
    } else {
      setTrekkingGuideName('');
      setTrekkingGuideLastName('');
      setTrekkingGuidePhone('');
    }
  }, [trekkingWithGuide]);

  if (bookingStep && (isShelter || isActivity)) {
    return (
      <div className="absolute inset-0 bg-white dark:bg-stone-950 z-[100] flex flex-col max-w-md mx-auto transition-colors">
        <div className="p-6 border-b dark:border-stone-800 flex items-center justify-between bg-white dark:bg-stone-900 sticky top-0 z-10">
          <button onClick={() => setBookingStep(false)} className="p-2 -ml-2 text-stone-800 dark:text-stone-100"><Icons.ChevronLeft /></button>
          <h2 className="font-black text-stone-900 dark:text-stone-50 tracking-tight text-lg italic">{labels.booking}</h2>
          <div className="w-10"></div>
        </div>
        <form
          className="p-6 flex-1 overflow-y-auto no-scrollbar space-y-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (isSubmittingBooking) return;
            if (isShelter && !editingBooking) {
              const approvedCheck = findApprovedAvailabilityCheck(dateFrom, dateTo, peopleCount);
              if (!approvedCheck) {
                onShowToast?.(
                  language === 'es'
                    ? 'Primero necesitás una disponibilidad aprobada para estas fechas y cantidad de personas.'
                    : 'You need an approved availability check for these dates and people count first.'
                );
                return;
              }
            }
            const validationErrors = getBookingValidationErrors();
            if (validationErrors.length > 0) {
              onShowToast?.(
                language === 'es'
                  ? `Faltan campos obligatorios: ${validationErrors.slice(0, 4).join(', ')}${validationErrors.length > 4 ? '...' : ''}`
                  : `Required booking fields are missing: ${validationErrors.slice(0, 4).join(', ')}${validationErrors.length > 4 ? '...' : ''}`
              );
              return;
            }
            const missingGuestMedicalCertificate = requireMedicalCertificate
              ? guests.some((guest) => !(guest.medicalCertificateFileName || '').trim())
              : false;
            let missingHealthDeclaration = false;
            let missingEmergencyContact = false;
            if (isActivity) {
              for (let i = 0; i < guests.length; i++) {
                const guest = guests[i];
                if (requireHealthDeclaration) {
                  const answers = guest.healthDeclarationAnswers || {};
                  const allAnswered = HEALTH_DECLARATION_QUESTIONS.every((q) => answers[q.id] !== null && answers[q.id] !== undefined);
                  if (!allAnswered || !guest.healthDeclarationConfirmed) {
                    missingHealthDeclaration = true;
                  }
                }
                if (requireEmergencyContact) {
                  if (!guest.emergencyContactName.trim() || !guest.emergencyContactPhone.trim()) {
                    missingEmergencyContact = true;
                  }
                }
              }
            }
            const booking: Booking = {
              id: editingBooking?.id || crypto.randomUUID(),
              spotId: spot.id,
              availabilityCheckId: isShelter && !editingBooking
                ? findApprovedAvailabilityCheck(dateFrom, dateTo, peopleCount)?.id
                : undefined,
              providerUserId: UUID_PATTERN.test(String(spot.organizerUserId || '')) ? spot.organizerUserId : undefined,
              createdAt: editingBooking?.createdAt || new Date().toISOString(),
              reservationName: reservationFirstName.trim(),
              reservationLastName: reservationLastName.trim(),
              reservationUser,
              email: normalizeEmailInput(reservationEmail),
              phone: isShelter || isActivity
                ? `${normalizeCountryCallingCode(countryCallingCode)} ${normalizePhoneDigits(phoneNumber)}`.trim()
                : reservationPhone.trim(),
              countryCallingCode: isShelter || isActivity ? normalizeCountryCallingCode(countryCallingCode) : undefined,
              phoneNumber: isShelter || isActivity ? normalizePhoneDigits(phoneNumber) : undefined,
              dateFrom: isActivity ? activityBookingStartDate : dateFrom,
              dateTo: isActivity ? activityBookingEndDate : dateTo,
              needsCarStorage: shelterTransport === 'Auto' ? needsParking : needsCarStorage,
              shelterTransport: isShelter ? shelterTransport || undefined : undefined,
              needsParking: isShelter && shelterTransport === 'Auto' ? needsParking : undefined,
              licensePlate: isShelter && shelterTransport === 'Auto' && needsParking ? normalizeDocumentInput(licensePlate) : undefined,
              arrivalTime: isShelter ? normalizeTimeInput(arrivalTime) : undefined,
              departureTime: undefined,
              observations: isShelter ? normalizeLineInput(observations) : undefined,
              acceptsTerms: isShelter ? acceptsTerms : undefined,
              acceptsCancellation: isShelter ? acceptsCancellation : undefined,
              consentContact: isShelter ? consentContact : undefined,
              shelterRoute: isShelter ? normalizeLineInput(shelterRoute) : undefined,
              trekkingDifficultyLevel: isShelter ? trekkingDifficultyLevel || undefined : undefined,
              trekkingWithGuide: isShelter ? trekkingWithGuide : undefined,
              trekkingGuideName: isShelter && trekkingWithGuide ? compactName(trekkingGuideName) : undefined,
              trekkingGuideLastName: isShelter && trekkingWithGuide ? compactName(trekkingGuideLastName) : undefined,
              trekkingGuidePhone: isShelter && trekkingWithGuide ? normalizePhoneDigits(trekkingGuidePhone) : undefined,
              trekkingResponsibleGroup: isShelter && !trekkingWithGuide ? normalizeLineInput(trekkingResponsibleGroup) : undefined,
              trekkingPointOfDeparture: isShelter ? normalizeLineInput(trekkingPointOfDeparture) : undefined,
              trekkingDepartureTime: isShelter ? normalizeWhitespace(trekkingDepartureTime) : undefined,
              trekkingReturnTime: isShelter ? normalizeWhitespace(trekkingReturnTime) : undefined,
              trekkingGroupCount: isShelter ? trekkingGroupCount : undefined,
              trekkingCommunicationMedium: isShelter ? trekkingCommunicationMedium || undefined : undefined,
              trekkingDeclarationAptitude: undefined,
              trekkingAcceptRecommendations: undefined,
              trekkingAcceptEquipment: undefined,
              trekkingWeatherRead: isShelter ? trekkingWeatherRead : undefined,
              objective: isActivity ? (spot.name || reservationObjective.trim()) : reservationObjective.trim(),
              requiresRevalidation: false,
              revalidationReason: '',
              revalidationRequestedAt: undefined,
              missingMedicalCertificate: missingGuestMedicalCertificate,
              missingHealthDeclaration: isActivity && requireHealthDeclaration && missingHealthDeclaration,
              missingLiabilityWaiver: isActivity && requireLiabilityWaiver && guests.some((guest) => !guest.liabilityWaiverAccepted),
              missingEmergencyContact: isActivity && requireEmergencyContact && missingEmergencyContact,
              informationDeadlineAt: isActivity ? buildInformationDeadlineAt(activityBookingStartDate) : undefined,
              peopleCount,
              guests: guests.map((guest) => ({
                ...guest,
                documentType: guest.documentType || undefined,
                firstName: guest.firstName.trim(),
                lastName: guest.lastName.trim(),
                document: normalizeDocumentInput(guest.document),
                documentIssuerCountry: normalizeLineInput(guest.documentIssuerCountry || ''),
                nationality: normalizeLineInput(guest.residenceCountry || guest.nationality || ''),
                residenceCountry: normalizeLineInput(guest.residenceCountry || guest.nationality || ''),
                gender: guest.gender || undefined,
                birthDate: guest.birthDate,
                age: guest.age,
                appUserId: (() => {
                  const rawAppUserId = guest.appUserId?.trim() || '';
                  return UUID_PATTERN.test(rawAppUserId) ? rawAppUserId : '';
                })(),
                appUserHandle: guest.appUserHandle
                  ? (guest.appUserHandle.trim().startsWith('@') ? guest.appUserHandle.trim() : `@${guest.appUserHandle.trim()}`)
                  : '',
                email: normalizeEmailInput(guest.email),
                countryCallingCode: normalizeCountryCallingCode(guest.countryCallingCode || ''),
                phoneNumber: normalizePhoneDigits(guest.phoneNumber || guest.phone || ''),
                phone: `${normalizeCountryCallingCode(guest.countryCallingCode || '')} ${normalizePhoneDigits(guest.phoneNumber || guest.phone || '')}`.trim(),
                contactRelation: guest.contactRelation || undefined,
                allergies: normalizeLineInput(guest.allergies || ''),
                hasAllergies: guest.hasAllergies ?? Boolean(normalizeLineInput(guest.allergies || '')),
                insuranceCoverage: normalizeLineInput(guest.insuranceCoverage || ''),
                responsibilityDeclaration: !!guest.responsibilityDeclaration,
                experienceLevel: guest.hasExperience ? guest.experienceLevel?.trim() || '' : '',
                insurance: {
                  hasInsurance: guest.insurance.hasInsurance,
                  provider: guest.insurance.provider.trim(),
                  memberNumber: guest.insurance.memberNumber.trim(),
                },
                healthDeclarationAnswers: HEALTH_DECLARATION_QUESTIONS.reduce((acc, question) => {
                  acc[question.id] = guest.healthDeclarationAnswers?.[question.id] ?? null;
                  return acc;
                }, {} as Record<string, boolean | null>),
                healthDeclarationConfirmed: !!guest.healthDeclarationConfirmed,
                medicalCertificateFileName: normalizeLineInput(guest.medicalCertificateFileName || ''),
                liabilityWaiverAccepted: !!guest.liabilityWaiverAccepted,
                liabilityWaiverAcceptedAt: guest.liabilityWaiverAccepted
                  ? (guest.liabilityWaiverAcceptedAt || new Date().toISOString())
                  : undefined,
                liabilityWaiverTextSnapshot: guest.liabilityWaiverAccepted
                  ? (guest.liabilityWaiverTextSnapshot || liabilityWaiverText || labels.waiverText)
                  : undefined,
                trekkingNoticeAscentDate: undefined,
                trekkingNoticeReturnDate: undefined,
                trekkingNoticeHasAdequateEquipment: undefined,
                trekkingNoticeEmergencyContactName: undefined,
                trekkingNoticeEmergencyContactPhone: undefined,
                emergencyContactName: compactName(guest.emergencyContactName),
                emergencyContactPhone: normalizePhoneDigits(guest.emergencyContactPhone),
              })),
              status: 'pending',
              total: spot.price,
            };
            const missingRequirementLabels = [
              booking.missingMedicalCertificate ? labels.medicalCertificate : null,
              booking.missingHealthDeclaration ? labels.healthDeclaration : null,
              booking.missingLiabilityWaiver ? labels.liabilityWaiver : null,
              booking.missingEmergencyContact ? labels.emergencyContact : null,
            ].filter(Boolean) as string[];
            if (missingRequirementLabels.length > 0) {
              booking.status = 'pending_information';
              booking.providerMessage = language === 'es'
                ? 'Reserva creada con información pendiente.'
                : 'Booking created with pending information.';
              setPendingIncompleteBooking(booking);
              setPendingRequirementLabels(missingRequirementLabels);
              return;
            }
            await submitBooking(booking);
          }}
        >
          <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 mb-3">{labels.reservationData}</h3>
            {editingBooking?.requiresRevalidation && (
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                {labels.bookingNeedsRevalidation}
                {editingBooking.revalidationReason ? ` ${editingBooking.revalidationReason}` : ''}
              </p>
            )}
          </div>
          <div className="form-two-col">
            <input required value={reservationFirstName} onChange={(e) => setReservationFirstName(e.target.value)} placeholder={labels.firstName} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none" />
            <input required value={reservationLastName} onChange={(e) => setReservationLastName(e.target.value)} placeholder={labels.lastName} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none" />
          </div>
          <input value={reservationUser} readOnly className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-700 dark:text-stone-200 outline-none" />
          {(isShelter || isActivity) ? (
            <div className="space-y-3">
              <div className="form-two-col items-start">
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-[0.28em] text-stone-400 dark:text-stone-500">{labels.countryCallingCode}</p>
                  <select
                    required
                    value={countryCallingCode}
                    onChange={(e) => setCountryCallingCode(e.target.value)}
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                  >
                    <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                    {COUNTRY_CALLING_CODES.map((item) => (
                      <option key={`${item.code}-${item.label}`} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-[0.28em] text-stone-400 dark:text-stone-500">{labels.phoneNumber}</p>
                  <input
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(sanitizePhoneInput(e.target.value))}
                    placeholder={labels.phoneNumber}
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">{labels.emailField}</p>
                <input type="email" required value={reservationEmail} onChange={(e) => setReservationEmail(e.target.value)} placeholder={labels.emailField} className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none" />
              </div>
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-3 bg-white dark:bg-stone-900">
                {labels.holderAlsoGuest}
                <input
                  type="checkbox"
                  checked={reservationHolderIsGuest}
                  onChange={(e) => setReservationHolderIsGuest(e.target.checked)}
                  className="w-4 h-4"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">{labels.emailField}</p>
              <input type="email" required value={reservationEmail} onChange={(e) => setReservationEmail(e.target.value)} placeholder={labels.emailField} className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none" />
            </div>
          )}
          {isShelter && (
            <div className="form-two-col">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">{labels.fromDate}</p>
                <input type="date" min={todayKey} required value={dateFrom} disabled={hasApprovedAvailabilityToContinue} onChange={(e) => setDateFrom(e.target.value)} className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none disabled:bg-stone-100 disabled:text-stone-500 dark:disabled:bg-stone-800 dark:disabled:text-stone-400" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">{labels.toDate}</p>
                <input type="date" min={dateFrom || todayKey} required value={dateTo} disabled={hasApprovedAvailabilityToContinue} onChange={(e) => setDateTo(e.target.value)} className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none disabled:bg-stone-100 disabled:text-stone-500 dark:disabled:bg-stone-800 dark:disabled:text-stone-400" />
              </div>
            </div>
          )}
          {hasApprovedAvailabilityToContinue && (
            <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 -mt-2">
              {language === 'es'
                ? 'Reserva habilitada por chequeo aprobado. Fechas y cantidad de personas bloqueadas según aprobación.'
                : 'Booking enabled by approved availability check. Dates and people count are locked to the approved values.'}
            </p>
          )}
          {isShelter && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">{labels.arrivalTime}</p>
              <input
                type="time"
                required
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
              />
            </div>
          )}
          {isShelter && (
            <div className="space-y-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">Sobre el equipo</p>
                <p className="text-[8px] font-black uppercase tracking-[0.28em] text-stone-400 dark:text-stone-500 mb-1">{labels.transport}</p>
                <select
                  required
                  value={shelterTransport}
                  onChange={(e) => setShelterTransport(e.target.value as ShelterTransport | '')}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                >
                  <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                  {SHELTER_TRANSPORTS.map((transport) => (
                    <option key={transport} value={transport}>{transport}</option>
                  ))}
                </select>
              </div>
              {shelterTransport === 'Auto' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-3 bg-white dark:bg-stone-900">
                    {labels.needsParking}
                    <input type="checkbox" checked={needsParking} onChange={(e) => setNeedsParking(e.target.checked)} className="w-4 h-4" />
                  </label>
                  {needsParking && (
                    <input
                      required
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      placeholder={labels.licensePlate}
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                    />
                  )}
                </div>
              )}
              <div className="space-y-2">
                <input
                  required
                  value={reservationObjective}
                  onChange={(e) => setReservationObjective(e.target.value)}
                  placeholder={labels.objective}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                />
                <div className="form-two-col">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">{labels.route}</p>
                    <input
                      required
                      value={shelterRoute}
                      onChange={(e) => setShelterRoute(sanitizeTextWithNumbersInput(e.target.value))}
                      placeholder={labels.route}
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">{labels.trekkingDifficulty}</p>
                    <select
                      required
                      value={trekkingDifficultyLevel}
                      onChange={(e) => setTrekkingDifficultyLevel(e.target.value as TrekkingDifficultyLevel | '')}
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                    >
                      <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                      {TREKKING_DIFFICULTIES.map((difficulty) => (
                        <option key={difficulty} value={difficulty}>{difficulty}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <input
                  required
                  value={trekkingPointOfDeparture}
                  onChange={(e) => setTrekkingPointOfDeparture(e.target.value)}
                  placeholder={labels.pointOfDeparture}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                />
                <div className="form-two-col">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">{labels.trekkingDepartureTime}</p>
                    <input
                      type="date"
                      required
                      min={dateFrom || todayKey}
                      value={trekkingDepartureTime}
                      onChange={(e) => setTrekkingDepartureTime(e.target.value)}
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">{labels.trekkingReturnTime}</p>
                    <input
                      type="date"
                      required
                      min={trekkingDepartureTime || dateFrom || todayKey}
                      value={trekkingReturnTime}
                      onChange={(e) => setTrekkingReturnTime(e.target.value)}
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">{labels.communicationMedium}</p>
                <select
                  required
                  value={trekkingCommunicationMedium}
                  onChange={(e) => setTrekkingCommunicationMedium(e.target.value as TrekkingCommunicationMedium | '')}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                >
                  <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                  {COMMUNICATION_MEDIA.map((medium) => (
                    <option key={medium} value={medium}>{medium}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                  {language === 'es' ? '¿Contrataron guía?' : 'Did you hire a guide?'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTrekkingWithGuide(true)}
                    className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${trekkingWithGuide ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200'}`}
                  >
                  {labels.yes}
                </button>
                <button
                  type="button"
                  onClick={() => setTrekkingWithGuide(false)}
                  className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${!trekkingWithGuide ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200'}`}
                  >
                    {labels.no}
                  </button>
                </div>
              </div>
              {trekkingWithGuide ? (
                <div className="form-two-col">
                  <input
                    required
                    value={trekkingGuideName}
                    onChange={(e) => setTrekkingGuideName(sanitizeNameLiveInput(e.target.value))}
                    placeholder={labels.guideName}
                    className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                  />
                  <input
                    required
                    value={trekkingGuideLastName}
                    onChange={(e) => setTrekkingGuideLastName(sanitizeNameLiveInput(e.target.value))}
                    placeholder={labels.guideLastName}
                    className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                  />
                </div>
              ) : (
                <input
                  required
                  value={trekkingResponsibleGroup}
                  onChange={(e) => setTrekkingResponsibleGroup(e.target.value)}
                  placeholder={labels.responsibleGroup}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                />
              )}
              {trekkingWithGuide && (
                <input
                  required
                  value={trekkingGuidePhone}
                  onChange={(e) => setTrekkingGuidePhone(sanitizePhoneInput(e.target.value))}
                  placeholder={labels.guidePhone}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                />
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-3 bg-white dark:bg-stone-900">
                  {labels.weatherRead}
                  <input type="checkbox" checked={trekkingWeatherRead} onChange={(e) => setTrekkingWeatherRead(e.target.checked)} className="w-4 h-4" />
                </label>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">{labels.observations}</p>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder={labels.observations}
                  maxLength={500}
                  rows={3}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none resize-none"
                />
              </div>
            </div>
          )}
          {isActivity && (
            <div className="space-y-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">Sobre el equipo</p>
                <p className="text-[8px] font-black uppercase tracking-[0.28em] text-stone-400 dark:text-stone-500 mb-1">{labels.transport}</p>
                <select
                  required
                  value={shelterTransport}
                  onChange={(e) => setShelterTransport(e.target.value as ShelterTransport | '')}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                >
                  <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                  {SHELTER_TRANSPORTS.map((transport) => (
                    <option key={transport} value={transport}>{transport}</option>
                  ))}
                </select>
              </div>
              {shelterTransport === 'Auto' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-3 bg-white dark:bg-stone-900">
                    {labels.needsParking}
                    <input type="checkbox" checked={needsParking} onChange={(e) => setNeedsParking(e.target.checked)} className="w-4 h-4" />
                  </label>
                  {needsParking && (
                    <input
                      required
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      placeholder={labels.licensePlate}
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                    />
                  )}
                </div>
              )}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">{labels.observations}</p>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder={labels.observations}
                  maxLength={500}
                  rows={3}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none resize-none"
                />
              </div>
            </div>
          )}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">{labels.guestsCount}</p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              minLength={1}
              required
              value={peopleCountInput}
              disabled={hasApprovedAvailabilityToContinue}
              onChange={(e) => {
                const nextValue = e.target.value.replace(/[^\d]/g, '');
                setPeopleCountInput(nextValue);
              }}
              onBlur={() => {
                if (!peopleCountInput.trim()) setPeopleCountInput('1');
              }}
              className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none disabled:bg-stone-100 disabled:text-stone-500 dark:disabled:bg-stone-800 dark:disabled:text-stone-400"
            />
          </div>
          <div className="pt-2">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 mb-3">{labels.guestData}</h3>
            <div className="space-y-4">
              {guests.map((guest, idx) => (
                <div key={idx} className="bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                  {(() => {
                    const guestHasAllergies = guest.hasAllergies ?? Boolean((guest.allergies || '').trim());
                    return (
                      <>
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">{labels.guest} {idx + 1}</p>
                  <div className="form-two-col">
                    <input required value={guest.firstName} onChange={(e) => updateGuest(idx, { firstName: sanitizeNameLiveInput(e.target.value) })} placeholder={labels.firstName} className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none" />
                    <input required value={guest.lastName} onChange={(e) => updateGuest(idx, { lastName: sanitizeNameLiveInput(e.target.value) })} placeholder={labels.lastName} className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                      {labels.appUserGuest}
                    </p>
                    <input
                      list={`guest-users-${idx}`}
                      value={guest.appUserHandle || ''}
                      onChange={(e) => {
                        const selected = bookingUsersDirectory.find((user) => user.handle === e.target.value || `@${user.handle}` === e.target.value);
                        if (selected) {
                          const [namePart, ...lastNameParts] = selected.name.split(' ');
                          updateGuest(idx, {
                            appUserId: selected.id,
                            appUserHandle: selected.handle.startsWith('@') ? selected.handle : `@${selected.handle}`,
                            email: guest.email || selected.email || '',
                            firstName: guest.firstName || (namePart || ''),
                            lastName: guest.lastName || (lastNameParts.join(' ') || ''),
                          });
                        } else {
                          updateGuest(idx, {
                            appUserId: '',
                            appUserHandle: e.target.value,
                          });
                        }
                      }}
                      placeholder={labels.selectUser}
                      className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                    />
                    <datalist id={`guest-users-${idx}`}>
                      {bookingUsersDirectory.map((user) => (
                        <option key={user.id} value={user.handle.startsWith('@') ? user.handle : `@${user.handle}`}>
                          {user.name}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">{labels.gender}</p>
                    <select
                      value={guest.gender || ''}
                      onChange={(e) => updateGuest(idx, { gender: e.target.value ? (e.target.value as GuestGender) : undefined })}
                      className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                    >
                      <option value="">{language === 'es' ? 'Opcional' : 'Optional'}</option>
                      {GENDERS.map((gender) => (
                        <option key={gender} value={gender}>{gender}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-two-col">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">{labels.documentType}</p>
                      <select
                        required
                        value={guest.documentType || ''}
                        onChange={(e) => updateGuest(idx, { documentType: e.target.value as GuestDocumentType })}
                        className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                      >
                        <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                        {DOCUMENT_TYPES.map((documentType) => (
                          <option key={documentType} value={documentType}>{documentType}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">{labels.document}</p>
                      <input
                        required
                        value={guest.document}
                        onChange={(e) => updateGuest(idx, { document: normalizeDocumentInput(e.target.value) })}
                        placeholder={labels.document}
                        className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                      />
                    </div>
                  </div>
                  <div className="form-two-col">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase tracking-[0.28em] text-stone-400 dark:text-stone-500">{labels.documentIssuerCountry}</p>
                      <select
                        required
                        value={guest.documentIssuerCountry || ''}
                        onChange={(e) => updateGuest(idx, { documentIssuerCountry: normalizeLineInput(e.target.value) })}
                        className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                      >
                        <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                        {COUNTRY_OPTIONS.map((country) => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase tracking-[0.28em] text-stone-400 dark:text-stone-500">{labels.residenceCountry}</p>
                      <select
                        required
                        value={guest.residenceCountry || guest.nationality || ''}
                        onChange={(e) => updateGuest(idx, { residenceCountry: e.target.value, nationality: e.target.value })}
                        className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                      >
                        <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                        {COUNTRY_OPTIONS.map((country) => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-two-col">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                        {labels.birthDateGuest}
                      </p>
                      <input
                        type="text"
                        required
                        readOnly
                        value={formatBirthDateDisplay(guest.birthDate)}
                        onClick={() => {
                          const parts = (guest.birthDate || '').split('-');
                          const year = Number(parts[0]) || 2000;
                          const month = Number(parts[1]) || 1;
                          setGuestBirthPickerYear(Math.max(1900, year));
                          setGuestBirthPickerMonth(Math.min(12, Math.max(1, month)));
                          setActiveGuestBirthDateIndex(idx);
                          setShowGuestBirthDatePicker(true);
                        }}
                        placeholder="YYYY-MM-DD"
                        className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                        {labels.ageGuest}
                      </p>
                      <input
                        value={guest.age ?? ''}
                        readOnly
                        placeholder="-"
                        className="w-full bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-700 dark:text-stone-100 outline-none"
                      />
                    </div>
                  </div>
                  <div className="form-two-col">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                        {labels.countryCallingCodeGuest}
                      </p>
                      <select
                        value={guest.countryCallingCode || ''}
                        onChange={(e) => updateGuest(idx, { countryCallingCode: e.target.value })}
                        className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                      >
                        <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                        {COUNTRY_CALLING_CODES.map((item) => (
                          <option key={`${item.code}-${item.label}`} value={item.code}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                        {labels.phoneNumberGuest}
                      </p>
                      <input
                        value={guest.phoneNumber || guest.phone || ''}
                        onChange={(e) => {
                          const nextPhone = sanitizePhoneInput(e.target.value);
                          updateGuest(idx, { phoneNumber: nextPhone, phone: nextPhone });
                        }}
                        placeholder={labels.phoneNumberGuest}
                        className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                      {labels.emailField}
                    </p>
                    <input
                      type="email"
                      required
                      value={guest.email}
                      onChange={(e) => updateGuest(idx, { email: normalizeEmailInput(e.target.value) })}
                      placeholder={labels.emailField}
                      className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                    />
                  </div>
                  {requireMedicalCertificate && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                        {labels.medicalCertificate}
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,application/pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file) {
                            const lowerName = file.name.toLowerCase();
                            const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
                            const isImageByMime = file.type.startsWith('image/');
                            const isImageByExt = /\.(png|jpe?g|webp|heic|heif)$/i.test(lowerName);
                            if (!isPdf && !isImageByMime && !isImageByExt) {
                              alert(language === 'es' ? 'El archivo debe ser PDF o imagen.' : 'File must be PDF or image.');
                              e.currentTarget.value = '';
                              updateGuest(idx, { medicalCertificateFileName: '' });
                              return;
                            }
                          }
                          updateGuest(idx, { medicalCertificateFileName: file?.name || '' });
                        }}
                        className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-700 dark:text-stone-200 outline-none"
                      />
                      {guest.medicalCertificateFileName && (
                        <p className="text-[10px] font-bold text-stone-500 dark:text-stone-400">
                          Archivo: {guest.medicalCertificateFileName}
                        </p>
                      )}
                      <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500">{labels.medicalCertificateHint}</p>
                    </div>
                  )}
                  {requireLiabilityWaiver && (
                    <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 p-3 space-y-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
                          {labels.liabilityWaiver}
                        </p>
                        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                          {labels.waiverProviderText}
                        </p>
                        <div className="mt-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3">
                          <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-200 whitespace-pre-wrap">
                            {liabilityWaiverText || labels.waiverText}
                          </p>
                        </div>
                      </div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-3 bg-white dark:bg-stone-900">
                        {labels.acceptWaiver}
                        <input
                          type="checkbox"
                          checked={!!guest.liabilityWaiverAccepted}
                          onChange={(e) => updateGuest(idx, {
                            liabilityWaiverAccepted: e.target.checked,
                            liabilityWaiverAcceptedAt: e.target.checked ? new Date().toISOString() : undefined,
                            liabilityWaiverTextSnapshot: e.target.checked ? (liabilityWaiverText || labels.waiverText) : undefined,
                          })}
                          className="w-4 h-4"
                        />
                      </label>
                      {guest.liabilityWaiverAcceptedAt && (
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          {labels.waiverAcceptedAt}: {new Date(guest.liabilityWaiverAcceptedAt).toLocaleString(language === 'es' ? 'es-AR' : 'en-US')}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">Condicion medica / Alergias</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateGuest(idx, { hasAllergies: true })}
                        className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${guestHasAllergies ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200'}`}
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        onClick={() => updateGuest(idx, { hasAllergies: false, allergies: '' })}
                        className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${!guestHasAllergies ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200'}`}
                      >
                        No
                      </button>
                    </div>
                    {guestHasAllergies && (
                      <textarea
                        value={guest.allergies || ''}
                        onChange={(e) => updateGuest(idx, { allergies: e.target.value })}
                        placeholder={labels.allergies}
                        rows={2}
                        maxLength={300}
                        className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none resize-none"
                      />
                    )}
                  </div>
                  <div className="form-two-col">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                        {labels.experience}
                      </p>
                      <select
                        value={guest.hasExperience ? 'yes' : 'no'}
                        onChange={(e) => {
                          const hasExperience = e.target.value === 'yes';
                          updateGuest(idx, { hasExperience, experienceLevel: hasExperience ? guest.experienceLevel || '' : '' });
                        }}
                        className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                      >
                        <option value="no">{labels.no}</option>
                        <option value="yes">{labels.yes}</option>
                      </select>
                    </div>
                    {guest.hasExperience && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                          {labels.experienceLevel}
                        </p>
                        <select
                          required
                          value={guest.experienceLevel || ''}
                          onChange={(e) => updateGuest(idx, { experienceLevel: e.target.value })}
                          className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                        >
                          <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                          {Object.values(Difficulty).map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-2.5">
                      {labels.medicalInsurance}
                      <input type="checkbox" checked={guest.insurance.hasInsurance} onChange={(e) => updateGuestInsurance(idx, { hasInsurance: e.target.checked, provider: e.target.checked ? guest.insurance.provider : '', memberNumber: e.target.checked ? guest.insurance.memberNumber : '' })} className="w-4 h-4" />
                    </label>
                    {guest.insurance.hasInsurance && (
                      <div className="form-two-col">
                        <input required={requireMedicalInsurance} value={guest.insurance.provider} onChange={(e) => updateGuestInsurance(idx, { provider: e.target.value })} placeholder={labels.insuranceProvider} className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none" />
                        <input required={requireMedicalInsurance} value={guest.insurance.memberNumber} onChange={(e) => updateGuestInsurance(idx, { memberNumber: e.target.value })} placeholder={labels.insuranceMember} className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none" />
                      </div>
                    )}
                  </div>
                  <div className="form-two-col">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                        {labels.emergencyContact}
                      </p>
                      <input required value={guest.emergencyContactName} onChange={(e) => updateGuest(idx, { emergencyContactName: sanitizeNameLiveInput(e.target.value) })} placeholder={labels.firstName} className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                        {labels.emergencyPhone}
                      </p>
                      <input required value={guest.emergencyContactPhone} onChange={(e) => updateGuest(idx, { emergencyContactPhone: sanitizePhoneInput(e.target.value) })} placeholder={labels.phoneField} className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">{labels.contactRelation}</p>
                    <select
                      required
                      value={guest.contactRelation || ''}
                      onChange={(e) => updateGuest(idx, { contactRelation: e.target.value as GuestContactRelation })}
                      className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                    >
                      <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                      {CONTACT_RELATIONS.map((relation) => (
                        <option key={relation} value={relation}>{relation}</option>
                      ))}
                    </select>
                  </div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-3">
                    {labels.responsibilityDeclaration}
                    <input
                      type="checkbox"
                      checked={!!guest.responsibilityDeclaration}
                      onChange={(e) => updateGuest(idx, { responsibilityDeclaration: e.target.checked })}
                      className="w-4 h-4"
                    />
                  </label>
                  {requireHealthDeclaration && (
                    <div className="grid grid-cols-1 gap-2">
                      {(() => {
                        const answers = guest.healthDeclarationAnswers || {};
                        const answeredCount = HEALTH_DECLARATION_QUESTIONS.filter((q) => answers[q.id] !== null && answers[q.id] !== undefined).length;
                        const isHealthCollapsed = collapsedHealthForms[idx] ?? true;
                        return (
                          <>
                            <div className="rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setCollapsedHealthForms((prev) => ({ ...prev, [idx]: !isHealthCollapsed }))}
                                className="w-full px-3 py-2.5 bg-white dark:bg-stone-800 text-left flex items-center justify-between"
                              >
                                <span className="text-[10px] font-black uppercase tracking-widest text-stone-600 dark:text-stone-300">
                                  {labels.healthDeclaration}
                                </span>
                                <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400">
                                  {labels.healthProgress}: {answeredCount}/{HEALTH_DECLARATION_QUESTIONS.length}
                                </span>
                              </button>
                              {!isHealthCollapsed && (
                                <div className="p-3 bg-stone-50 dark:bg-stone-900 space-y-2">
                                  {HEALTH_DECLARATION_QUESTIONS.map((question) => {
                                    const value = answers[question.id];
                                    return (
                                      <div key={question.id} className="rounded-lg border border-stone-200 dark:border-stone-700 p-2.5 bg-white dark:bg-stone-800">
                                        <p className="text-[10px] font-bold text-stone-700 dark:text-stone-200 leading-snug">
                                          {language === 'es' ? question.es : question.en}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateGuest(idx, {
                                                healthDeclarationAnswers: {
                                                  ...(guest.healthDeclarationAnswers || createEmptyHealthAnswers()),
                                                  [question.id]: true,
                                                },
                                              })
                                            }
                                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                              value === true ? 'bg-emerald-700 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200'
                                            }`}
                                          >
                                            {labels.yes}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateGuest(idx, {
                                                healthDeclarationAnswers: {
                                                  ...(guest.healthDeclarationAnswers || createEmptyHealthAnswers()),
                                                  [question.id]: false,
                                                },
                                              })
                                            }
                                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                              value === false ? 'bg-red-700 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200'
                                            }`}
                                          >
                                            {labels.no}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-2.5 bg-white dark:bg-stone-800 mt-1">
                                    {labels.healthTruthDeclaration}
                                    <input
                                      type="checkbox"
                                      checked={!!guest.healthDeclarationConfirmed}
                                      onChange={(e) => updateGuest(idx, { healthDeclarationConfirmed: e.target.checked })}
                                      className="w-4 h-4"
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
          {isShelter && (
            <div className="space-y-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 p-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-3 bg-white dark:bg-stone-900">
                {labels.acceptsTerms}
                <input type="checkbox" checked={acceptsTerms} onChange={(e) => setAcceptsTerms(e.target.checked)} className="w-4 h-4" />
              </label>
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-3 bg-white dark:bg-stone-900">
                {labels.acceptsCancellation}
                <input type="checkbox" checked={acceptsCancellation} onChange={(e) => setAcceptsCancellation(e.target.checked)} className="w-4 h-4" />
              </label>
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-3 bg-white dark:bg-stone-900">
                {labels.consentContact}
                <input type="checkbox" checked={consentContact} onChange={(e) => setConsentContact(e.target.checked)} className="w-4 h-4" />
              </label>
            </div>
          )}
          <div
            className="pt-4 sticky bottom-0 bg-white dark:bg-stone-950"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
          >
            <button
              type="submit"
              disabled={isSubmittingBooking}
              className="w-full bg-emerald-800 disabled:bg-emerald-900/60 disabled:opacity-80 text-white font-black py-4 rounded-[2rem] shadow-xl active:scale-95 transition-all uppercase tracking-widest text-sm"
            >
              {isSubmittingBooking ? (language === 'es' ? 'Enviando...' : 'Submitting...') : labels.pay}
            </button>
          </div>
        </form>
        {showGuestBirthDatePicker && activeGuestBirthDateIndex !== null && (
          <div className="fixed inset-0 z-[120] bg-black/60 flex items-end justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-[2rem] p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-stone-900 dark:text-stone-50 uppercase tracking-widest">
                  {language === 'es' ? 'Seleccionar fecha' : 'Select date'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowGuestBirthDatePicker(false);
                    setActiveGuestBirthDateIndex(null);
                  }}
                  className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                >
                  <Icons.ChevronLeft />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <select
                  value={guestBirthPickerMonth}
                  onChange={(e) => setGuestBirthPickerMonth(Number(e.target.value))}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl py-2.5 px-3 font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
                <select
                  value={guestBirthPickerYear}
                  onChange={(e) => setGuestBirthPickerYear(Number(e.target.value))}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl py-2.5 px-3 font-bold text-stone-800 dark:text-stone-100 outline-none appearance-none"
                >
                  {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => 1900 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center">
                {Array.from({ length: getDaysInMonth(guestBirthPickerYear, guestBirthPickerMonth) }, (_, i) => i + 1).map((d) => {
                  const day = String(d).padStart(2, '0');
                  const month = String(guestBirthPickerMonth).padStart(2, '0');
                  const year = String(guestBirthPickerYear);
                  const value = `${year}-${month}-${day}`;
                  const isActive = guests[activeGuestBirthDateIndex]?.birthDate === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        updateGuest(activeGuestBirthDateIndex, { birthDate: value, age: calculateAge(value) });
                        setShowGuestBirthDatePicker(false);
                        setActiveGuestBirthDateIndex(null);
                      }}
                      className={`py-2 rounded-lg text-[10px] font-black ${isActive ? 'bg-emerald-800 text-white' : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200'}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateGuest(activeGuestBirthDateIndex, { birthDate: '', age: null });
                    setShowGuestBirthDatePicker(false);
                    setActiveGuestBirthDateIndex(null);
                  }}
                  className="flex-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  {language === 'es' ? 'Limpiar' : 'Clear'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentDay = (guests[activeGuestBirthDateIndex]?.birthDate || '').split('-')[2] || '01';
                    const maxDay = getDaysInMonth(guestBirthPickerYear, guestBirthPickerMonth);
                    const safeDay = String(Math.min(Number(currentDay), maxDay)).padStart(2, '0');
                    const month = String(guestBirthPickerMonth).padStart(2, '0');
                    const year = String(guestBirthPickerYear);
                    const value = `${year}-${month}-${safeDay}`;
                    updateGuest(activeGuestBirthDateIndex, { birthDate: value, age: calculateAge(value) });
                    setShowGuestBirthDatePicker(false);
                    setActiveGuestBirthDateIndex(null);
                  }}
                  className="flex-1 bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  {language === 'es' ? 'Listo' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (bookingStep) {
    return (
      <div className="absolute inset-0 bg-white dark:bg-stone-950 z-[100] flex flex-col max-w-md mx-auto transition-colors">
        <div className="p-6 border-b dark:border-stone-800 flex items-center justify-between bg-white dark:bg-stone-900 sticky top-0 z-10">
          <button onClick={() => setBookingStep(false)} className="p-2 -ml-2 text-stone-800 dark:text-stone-100"><Icons.ChevronLeft /></button>
          <h2 className="font-black text-stone-900 dark:text-stone-50 tracking-tight text-lg italic">{labels.booking}</h2>
          <div className="w-10"></div>
        </div>
        <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
          <div className="bg-stone-50 dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 mb-6 shadow-sm">
            <h3 className="font-black text-stone-800 dark:text-stone-100 text-xl mb-1">{spot.name}</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 font-medium mb-4">{spot.location}</p>
            <div className="mt-4 flex justify-between border-t border-stone-200 dark:border-stone-800 pt-4">
              <span className="text-stone-400 dark:text-stone-500 font-bold uppercase text-[10px] tracking-widest">
                {isActivity ? (language === 'es' ? 'Tarifa' : 'Fee') : labels.stay}
              </span>
              <span className="font-black text-emerald-800 dark:text-emerald-400 underline decoration-emerald-800/30">
                {isActivity ? (language === 'es' ? 'Por persona' : 'Per person') : labels.selectDates}
              </span>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-stone-400 dark:text-stone-500 font-bold uppercase text-[10px] tracking-widest">{labels.total}</span>
              <div className="text-right">
                <span className="font-black text-2xl text-stone-900 dark:text-stone-50">${spot.price}{isForeigner ? ' ARS' : ''}</span>
                {isForeigner && spot.price > 0 && (
                  <p className="text-[8px] text-stone-400 dark:text-stone-500 font-bold uppercase mt-0.5">{labels.currencyNote}</p>
                )}
              </div>
            </div>
          </div>
          {(spot.camasCount !== undefined || spot.carpasCount !== undefined) && (
            <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4">
              {spot.camasCount !== undefined && (
                <div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">
                    {language === 'es' ? 'Camas disponibles' : 'Available beds'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-stone-800 dark:text-stone-100">{availableBeds}</span>
                    <input
                      type="number"
                      min="1"
                      max={Math.max(availableBeds, 1)}
                      value={bedsToBook}
                      onChange={(e) => setBedsToBook(Math.max(1, Number(e.target.value) || 1))}
                      className="w-24 bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl py-2 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none text-right"
                    />
                  </div>
                </div>
              )}
              {spot.carpasCount !== undefined && (
                <div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">
                    {language === 'es' ? 'Parcelas para carpas disponibles' : 'Available tent pitches'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-stone-800 dark:text-stone-100">{availableTents}</span>
                    <input
                      type="number"
                      min="1"
                      max={Math.max(availableTents, 1)}
                      value={tentsToBook}
                      onChange={(e) => setTentsToBook(Math.max(1, Number(e.target.value) || 1))}
                      className="w-24 bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl py-2 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none text-right"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-6 border-t dark:border-stone-800 bg-white dark:bg-stone-900">
          <button 
            className="w-full bg-emerald-800 text-white font-black py-5 rounded-[2rem] shadow-xl active:scale-95 transition-all uppercase tracking-widest text-sm"
            onClick={() => {
              if (spot.camasCount !== undefined) {
                if (availableBeds <= 0 || bedsToBook > availableBeds) {
                  alert(language === 'es' ? 'No hay camas disponibles para esa cantidad.' : 'Not enough beds available for that quantity.');
                  return;
                }
                setAvailableBeds((prev) => Math.max(0, prev - bedsToBook));
              }
              if (spot.carpasCount !== undefined) {
                if (availableTents <= 0 || tentsToBook > availableTents) {
                  alert(language === 'es' ? 'No hay parcelas para carpas disponibles para esa cantidad.' : 'Not enough tent pitches available for that quantity.');
                  return;
                }
                setAvailableTents((prev) => Math.max(0, prev - tentsToBook));
              }
              onShowToast?.(`${labels.bookingSuccessTitle} ${labels.bookingSuccessBody}`);
              setBookingStep(false);
              onBack();
            }}
          >
            {labels.pay}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-white dark:bg-stone-950 z-40 overflow-y-auto no-scrollbar max-w-md mx-auto flex flex-col transition-colors">
      {/* Hero Header */}
      <div className="relative h-[24rem] shrink-0">
        <img src={spot.images[0] || fallbackGalleryImage} className="w-full h-full object-cover" alt={spot.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
          <button onClick={onBack} className="bg-white/20 backdrop-blur-xl p-3 rounded-2xl shadow-xl border border-white/20 text-white active:scale-90 transition-all">
            <Icons.ChevronLeft />
          </button>
          <div className="flex gap-2">
            <button 
              onClick={handleShare}
              className="bg-white/20 backdrop-blur-xl p-3 rounded-2xl shadow-xl border border-white/20 text-white active:scale-90 transition-all"
            >
              <Icons.Share />
            </button>
            <button 
              onClick={() => onToggleFavorite?.(spot.id)}
              className={`backdrop-blur-xl p-3 rounded-2xl shadow-xl border border-white/20 active:scale-90 transition-all ${isFavorite ? 'bg-red-500 text-white' : 'bg-white/20 text-white'}`}
            >
              <Icons.Heart filled={isFavorite} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-12 left-6 right-6">
          <div className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded inline-block mb-3 shadow-lg tracking-widest">
            {activityTypeLabel}
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic leading-none mb-2">{spot.name}</h1>
          <p className="text-white/80 font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
            <Icons.MapPin /> {spot.location}, {spot.province}
          </p>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-6 -mt-8 relative bg-white dark:bg-stone-950 rounded-t-[3rem] pt-10 pb-32 flex-1 transition-colors">
        {spot.placeType === PlaceType.ACTIVIDAD && (spot.date || spot.expeditionStartDate) && (
          <div className="mb-6">
            <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
              {isExpedition ? labels.expeditionDates : (language === 'es' ? 'Fecha de la actividad' : 'Activity date')}
            </p>
            {isExpedition ? (
              <>
                <p className="text-2xl font-black text-stone-900 dark:text-stone-100 leading-tight">
                  {formatShortDate(spot.expeditionStartDate || spot.date) || ''}
                  {formatShortDate(spot.expeditionEndDate) ? ` - ${formatShortDate(spot.expeditionEndDate)}` : ''}
                </p>
                {(spot.expeditionDays || spot.expeditionNights !== undefined) && (
                  <p className="text-[11px] font-black text-stone-600 dark:text-stone-300 uppercase tracking-widest mt-2">
                    {(spot.expeditionDays || 0)} {language === 'es' ? 'días' : 'days'} / {(spot.expeditionNights || 0)} {language === 'es' ? 'noches' : 'nights'}
                  </p>
                )}
              </>
            ) : (
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100 leading-tight">
                {formatDate()}
              </p>
            )}
          </div>
        )}
        {/* Stats Grid */}
        <div className={`grid gap-3 mb-10 ${isExpedition ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <div className={`p-4 rounded-[1.5rem] text-center border shadow-sm flex flex-col justify-center min-h-[5rem] ${isExpedition ? difficultyBadgeStyles[spot.difficulty || Difficulty.MODERATE] : 'bg-stone-50 dark:bg-stone-900 border-stone-100 dark:border-stone-800'}`}>
            <p className={`text-[8px] font-black uppercase tracking-widest mb-1.5 leading-none ${isExpedition ? 'text-current/70' : 'text-stone-400 dark:text-stone-500'}`}>{isExpedition ? labels.level : language === 'es' ? 'Clima' : 'Weather'}</p>
            {isExpedition ? (
              <p className="text-xs font-black uppercase tracking-wide">
                {spot.difficulty || labels.notSpecified}
              </p>
            ) : (
              <div className="flex items-center justify-center gap-1">
                <span className="text-sm font-black text-stone-800 dark:text-stone-100">{spot.weather.temp}°C</span>
                <Icons.Sun />
              </div>
            )}
          </div>
          <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-[1.5rem] text-center border border-stone-100 dark:border-stone-800 shadow-sm flex flex-col justify-center min-h-[5rem]">
            <p className="text-[8px] text-stone-400 dark:text-stone-500 font-black uppercase tracking-widest mb-1.5 leading-none">{language === 'es' ? 'Temporada' : 'Season'}</p>
            <p className="text-xs font-black text-stone-800 dark:text-stone-100">{spot.season}</p>
          </div>
          {!isExpedition && (
            <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-[1.5rem] text-center border border-stone-100 dark:border-stone-800 shadow-sm flex flex-col justify-center min-h-[5rem]">
              <p className="text-[8px] text-stone-400 dark:text-stone-500 font-black uppercase tracking-widest mb-1.5 leading-none">{language === 'es' ? 'Calificación' : 'Rating'}</p>
              <div className="flex items-center justify-center gap-1 text-xs font-black text-emerald-800 dark:text-emerald-400">
                 <Icons.Star /> {spot.rating}
              </div>
            </div>
          )}
        </div>

        {/* Capacity Section */}
        {(spot.camasCount || spot.carpasCount) && (
          <section className="mb-10">
            <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 mb-4 border-l-4 border-emerald-600 dark:border-emerald-400 pl-4 uppercase tracking-tighter italic">{labels.capacity}</h2>
            <div className="flex gap-4">
              {spot.camasCount && (
                <div className="flex-1 bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center gap-3">
                  <div className="text-emerald-600"><Icons.Bed /></div>
                  <div>
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{labels.beds}</p>
                    <p className="text-sm font-black text-stone-800 dark:text-stone-100">{spot.camasCount}</p>
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1">
                      {language === 'es' ? 'Disponibles:' : 'Available:'} {availableBeds}
                    </p>
                  </div>
                </div>
              )}
              {spot.carpasCount && (
                <div className="flex-1 bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center gap-3">
                  <div className="text-emerald-600"><Icons.Hiking /></div>
                  <div>
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{labels.tents}</p>
                    <p className="text-sm font-black text-stone-800 dark:text-stone-100">{spot.carpasCount}</p>
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1">
                      {language === 'es' ? 'Disponibles:' : 'Available:'} {availableTents}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Photo Gallery Grid - Optimized for Mobile */}
        <section className="mb-10">
          <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 mb-4 border-l-4 border-emerald-600 dark:border-emerald-400 pl-4 uppercase tracking-tighter italic">{labels.gallery}</h2>
          {isExpedition && spot.expeditionVideoUrl?.trim() && (
            <div className="mb-3 rounded-2xl overflow-hidden border border-stone-100 dark:border-stone-800">
              <video src={spot.expeditionVideoUrl} controls className="w-full h-48 object-cover" />
            </div>
          )}
          {(() => {
            const safeImages = spot.images.length > 0 ? spot.images : [fallbackGalleryImage];
            const galleryImages = safeImages.length >= 4
              ? safeImages
              : [
                  ...safeImages,
                  ...Array.from({ length: 4 - safeImages.length }, () => safeImages[safeImages.length - 1])
                ];
            return (
              <div className="grid grid-cols-4 gap-2">
                {galleryImages.map((img, i) => (
                  <div 
                    key={i} 
                    className={`rounded-xl overflow-hidden cursor-pointer active:scale-95 transition-all shadow-sm ${i === 0 ? 'col-span-4 h-32' : 'h-16'}`}
                    onClick={() => setZoomedImage(img)}
                  >
                    <img src={img} className="w-full h-full object-cover" alt={`Gallery ${i}`} />
                  </div>
                ))}
              </div>
            );
          })()}
        </section>

        {/* Description Section */}
        <section className="mb-10">
          <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 mb-4 border-l-4 border-emerald-600 dark:border-emerald-400 pl-4 uppercase tracking-tighter italic">{labels.description}</h2>
          <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed font-medium">
            {spot.description}
          </p>
          {spot.placeType === PlaceType.ACTIVIDAD && (
            <div className="mt-4 space-y-2">
              <button
                onClick={() => onOpenProfile?.(spot.organizerUserId || spot.organizerName)}
                className="block w-full text-left text-[10px] font-black text-stone-600 dark:text-stone-300 uppercase tracking-widest leading-relaxed break-words"
              >
                {labels.organizedBy}:{' '}
                <span className="text-stone-800 dark:text-stone-100 underline underline-offset-4">
                  {spot.organizerName || (language === 'es' ? 'Guía Recorre Argentina' : 'Recorre Argentina Guide')}
                </span>
              </button>
              {isExpedition && organizerInstagramUrl && (
                <a
                  href={organizerInstagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={language === 'es' ? 'Instagram organizador' : 'Organizer Instagram'}
                  className="inline-flex items-center text-emerald-700 dark:text-emerald-400"
                >
                  <Icons.Instagram />
                </a>
              )}
              {isExpedition && (
                <button
                  onClick={() => onOpenProfile?.(spot.guidedByUserId || spot.guidedByName)}
                  className="block w-full text-left mt-1 text-[10px] font-black text-stone-600 dark:text-stone-300 uppercase tracking-widest leading-relaxed break-words"
                >
                  {labels.guidedBy}:{' '}
                  <span className="text-stone-800 dark:text-stone-100 underline underline-offset-4">
                    {spot.guidedByName || (language === 'es' ? 'Guía Recorre Argentina' : 'Recorre Argentina Guide')}
                  </span>
                </button>
              )}
              {isExpedition && showGuideInstagram && (
                <a
                  href={guideInstagramUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={language === 'es' ? 'Instagram guía' : 'Guide Instagram'}
                  className="inline-flex items-center text-emerald-700 dark:text-emerald-400"
                >
                  <Icons.Instagram />
                </a>
              )}
              {!isExpedition && (
                <p className="text-[10px] font-black text-stone-600 dark:text-stone-300 uppercase tracking-widest">
                  {labels.level}:{' '}
                  <span className="text-stone-800 dark:text-stone-100">{spot.difficulty || labels.notSpecified}</span>
                </p>
              )}
            </div>
          )}
        </section>

        {isExpedition && (
          <section className="mb-10">
            <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 mb-4 border-l-4 border-emerald-600 dark:border-emerald-400 pl-4 uppercase tracking-tighter italic">
              {language === 'es' ? 'Datos de expedición' : 'Expedition info'}
            </h2>
            <div className="space-y-3">
              <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800">
                <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{labels.meetingPoint}</p>
                <p className="text-sm font-black text-stone-800 dark:text-stone-100 mt-1">{spot.meetingPoint || labels.notSpecified}</p>
              </div>
              {isMontanismo && spot.maxAltitudeReached && (
                <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{labels.maxAltitudeReached}</p>
                  <p className="text-sm font-black text-stone-800 dark:text-stone-100 mt-1">{spot.maxAltitudeReached || labels.notSpecified}</p>
                </div>
              )}
              {isBuceo && spot.immersionDepth && (
                <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{labels.immersionDepth}</p>
                  <p className="text-sm font-black text-stone-800 dark:text-stone-100 mt-1">{spot.immersionDepth}</p>
                </div>
              )}
              <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800">
                <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{labels.spotsAvailable}</p>
                <p className="text-sm font-black text-stone-800 dark:text-stone-100 mt-1">
                  {remainingActivitySpots ?? spot.expeditionCapacity ?? labels.notSpecified}
                </p>
              </div>
              {(spot.enrollmentStartDate || spot.enrollmentEndDate) && (
                <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">
                    {language === 'es' ? 'Inscripciones' : 'Enrollment'}
                  </p>
                  <p className="text-sm font-black text-stone-800 dark:text-stone-100 mt-1">
                    {(spot.enrollmentStartDate || labels.notSpecified)}
                    {spot.enrollmentEndDate ? ` - ${spot.enrollmentEndDate}` : ''}
                  </p>
                </div>
              )}
              <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800">
                <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{labels.minorsAllowed}</p>
                <p className="text-sm font-black text-stone-800 dark:text-stone-100 mt-1">
                  {spot.minorsAllowed ? labels.yes : labels.no}
                </p>
              </div>
              <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800">
                <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{labels.transferIncluded}</p>
                <p className="text-sm font-black text-stone-800 dark:text-stone-100 mt-1">{spot.transferIncludedFrom || labels.notSpecified}</p>
              </div>
            </div>
          </section>
        )}

        {isActivity && Array.isArray(spot.faqs) && spot.faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 mb-4 border-l-4 border-emerald-600 dark:border-emerald-400 pl-4 uppercase tracking-tighter italic">
              {labels.frequentlyAskedQuestions}
            </h2>
            <div className="space-y-3">
              {spot.faqs.map((faq, index) => (
                <details
                  key={`${spot.id}-faq-${index}`}
                  className="group rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 p-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black text-stone-800 dark:text-stone-100">
                    <span>{faq.question}</span>
                    <span className="text-stone-400 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300 whitespace-pre-wrap">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Location Section with Google Maps Link */}
        <section className="mb-10">
          <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 mb-4 border-l-4 border-emerald-600 dark:border-emerald-400 pl-4 uppercase tracking-tighter italic">{labels.location}</h2>
          <div 
            onClick={handleOpenMaps}
            className="w-full h-32 rounded-[2rem] overflow-hidden relative border border-stone-200 dark:border-stone-800 cursor-pointer active:scale-[0.98] transition-all group"
          >
            <div className="absolute inset-0 bg-stone-100 dark:bg-stone-900 flex items-center justify-center">
               <div className="text-emerald-600/10 scale-[4] group-hover:scale-[4.5] transition-transform duration-500">
                  <Icons.Map />
               </div>
               {/* Simplified map simulation with SVG */}
               <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 400 200" fill="none">
                 <path d="M0 40C50 60 100 20 150 50S250 120 300 90S400 60 400 60V200H0V40Z" fill="currentColor" className="text-stone-300 dark:text-stone-700" />
                 <circle cx="200" cy="80" r="40" stroke="currentColor" strokeWidth="1" className="text-stone-200 dark:text-stone-800" />
               </svg>
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-emerald-700 dark:text-emerald-400 drop-shadow-md">
                    <Icons.MapPin />
                  </div>
               </div>
            </div>
            <div className="absolute bottom-3 left-3 right-3 bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm p-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-white/20 dark:border-white/5">
               {labels.openMaps}
               <div className="rotate-180 scale-75"><Icons.ChevronLeft /></div>
            </div>
          </div>
        </section>

        {/* Gear Section */}
        <section className="mb-10 bg-emerald-50 dark:bg-emerald-950/30 p-6 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <h3 className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-[0.2em]">
                {isExpedition ? labels.personalGear : labels.gearAi}
              </h3>
            </div>
            <button 
              onClick={() => setIsGearCollapsed(!isGearCollapsed)}
              className="text-emerald-800 dark:text-emerald-400 text-[10px] font-black uppercase underline decoration-2 underline-offset-4"
            >
              {isGearCollapsed ? labels.viewAll : labels.collapse}
            </button>
          </div>
          {isExpedition ? (
            (spot.personalGear || []).length > 0 ? (
              <div className={`space-y-4 ${isGearCollapsed ? 'max-h-32 overflow-hidden relative' : ''}`}>
                {(spot.personalGear || []).map((item, i) => (
                  <div key={i} className="flex flex-col">
                    <span className="text-xs font-black text-stone-800 dark:text-stone-100 uppercase tracking-tight leading-none mb-1.5">{item}</span>
                  </div>
                ))}
                {isGearCollapsed && (spot.personalGear || []).length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-emerald-50 dark:from-stone-950/50 to-transparent pointer-events-none"></div>
                )}
              </div>
            ) : (
              <p className="text-sm font-bold text-stone-500 dark:text-stone-400">{labels.notSpecified}</p>
            )
          ) : loadingGear ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className={`space-y-4 ${isGearCollapsed ? 'max-h-32 overflow-hidden relative' : ''}`}>
              {gear.map((g, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-xs font-black text-stone-800 dark:text-stone-100 uppercase tracking-tight leading-none mb-1.5">{g.item}</span>
                  <span className="text-[10px] text-emerald-900/70 dark:text-emerald-400/60 font-medium leading-tight">{g.reason}</span>
                </div>
              ))}
              {isGearCollapsed && gear.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-emerald-50 dark:from-stone-950/50 to-transparent pointer-events-none"></div>
              )}
            </div>
          )}
        </section>

        {/* Amenities Section */}
        <section className="mb-10">
          <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 mb-4 border-l-4 border-emerald-600 dark:border-emerald-400 pl-4 uppercase tracking-tighter italic">{labels.amenities}</h2>
          <div className="form-two-col">
            {spot.amenities.map((amenity, i) => (
              <div key={i} className="flex items-center gap-3 bg-stone-50 dark:bg-stone-900 p-3 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm">
                <div className="text-emerald-700 dark:text-emerald-500">{getAmenityIcon(amenity)}</div>
                <span className="text-[10px] font-black text-stone-800 dark:text-stone-200 uppercase tracking-tight">{amenity}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Rules Section */}
        <section className="mb-10">
          <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 mb-4 border-l-4 border-emerald-600 dark:border-emerald-400 pl-4 uppercase tracking-tighter italic">{labels.rules}</h2>
          <div className="space-y-3">
            {spot.rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100/50 dark:border-red-900/30">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0"></div>
                <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-tight leading-tight">{rule}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews Section */}
        <section className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 border-l-4 border-emerald-600 dark:border-emerald-400 pl-4 uppercase tracking-tighter italic">{labels.reviews}</h2>
            <button 
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950 px-4 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900 active:scale-95 transition-all"
            >
              {showReviewForm ? labels.cancel : labels.rate}
            </button>
          </div>

          {showReviewForm && (
            <form onSubmit={handleAddReview} className="mb-8 bg-stone-50 dark:bg-stone-900 p-6 rounded-3xl border border-stone-100 dark:border-stone-800 animate-in slide-in-from-top-2 duration-300 shadow-sm">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase mb-2">{labels.yourRating}</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button 
                        key={s} 
                        type="button" 
                        onClick={() => setNewRating(s)}
                        className={`text-2xl transition-all ${s <= newRating ? 'text-yellow-500 scale-110' : 'text-stone-300 dark:text-stone-700'}`}
                      >
                        <Icons.Star />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase mb-2">{labels.yourComment}</p>
                  <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={labels.placeholderComment}
                    className="w-full bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 text-stone-800 dark:text-stone-100"
                    rows={3}
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-800 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all shadow-lg">
                  {labels.send}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-6">
            {displayedReviews.length > 0 ? (
              displayedReviews.map((review) => (
                <div key={review.id} className="border-b border-stone-50 dark:border-stone-900 pb-6 last:border-0">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={review.userAvatar} className="w-10 h-10 rounded-full border border-stone-100 dark:border-stone-800 shadow-sm" alt={review.userName} />
                    <div>
                      <p className="text-xs font-black text-stone-800 dark:text-stone-200">{review.userName}</p>
                      <p className="text-[9px] text-stone-400 font-bold uppercase tracking-tighter">{review.date}</p>
                    </div>
                    <div className="ml-auto">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  <p className="text-sm text-stone-500 dark:text-stone-400 font-medium leading-relaxed italic">"{review.comment}"</p>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-stone-400 font-bold uppercase tracking-widest py-8">{labels.noReviews}</p>
            )}
          </div>
        </section>
      </div>

      {/* Floating Action Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-white/90 dark:bg-stone-950/90 backdrop-blur-xl border-t border-stone-100 dark:border-stone-800 flex items-center justify-between z-50 rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.1)]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <div className="pr-4">
          <p className="text-[9px] text-stone-400 dark:text-stone-500 font-black uppercase tracking-[0.2em] mb-0.5">
            {labels.total} {isActivity ? (language === 'es' ? 'Por persona' : 'Per person') : (language === 'es' ? 'Noche' : 'Night')}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tighter">${spot.price}</span>
            {isForeigner && <span className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase">ARS</span>}
          </div>
        </div>
        <button 
          onClick={() => {
            if (!canEnrollInActivity) {
              if (enrollmentStatusMessage) onShowToast?.(enrollmentStatusMessage);
              return;
            }
            if (isShelter && !editingBooking) {
              if (selectedApprovedAvailabilityCheck) {
                startBookingFromApprovedAvailability(selectedApprovedAvailabilityCheck);
                return;
              }
              setShowAvailabilityCheckSheet(true);
              return;
            }
            setBookingStep(true);
          }}
          disabled={!canEnrollInActivity}
          className="bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-600 disabled:shadow-none text-white font-black py-4 px-10 rounded-2xl shadow-xl uppercase tracking-[0.2em] text-xs active:scale-95 transition-all"
        >
          {isShelter && !editingBooking
            ? (selectedApprovedAvailabilityCheck
              ? (language === 'es' ? 'Continuar con la reserva' : 'Continue with booking')
              : labels.checkAvailability)
            : labels.book}
        </button>
      </div>
      {isActivity && enrollmentStatusMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 max-w-[90%] z-40">
          <div className="bg-white/95 dark:bg-stone-900/95 text-stone-700 dark:text-stone-200 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 text-center whitespace-pre-line">
            {enrollmentStatusMessage}
          </div>
        </div>
      )}
      {showAvailabilityCheckSheet && isShelter && (
        <div className="fixed inset-0 z-[105] bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-[92%] max-w-sm rounded-[1.6rem] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-800">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">
                {language === 'es' ? 'Paso 1' : 'Step 1'}
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-stone-900 dark:text-stone-100">
                {labels.checkAvailability}
              </h3>
              <p className="mt-2 text-sm font-medium text-stone-600 dark:text-stone-300">
                {language === 'es'
                  ? 'Primero enviá fechas y cantidad de personas para que el prestador valide disponibilidad.'
                  : 'First send dates and people count so the provider can validate availability.'}
              </p>
            </div>
            <div className="px-6 py-5 space-y-3">
              {approvedAvailabilityChecks.length > 0 && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/80 dark:bg-emerald-900/20 p-3">
                  <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-200">
                    {language === 'es'
                      ? 'Ya tenés disponibilidad aprobada. Podés completar la reserva.'
                      : 'You already have approved availability. You can complete the booking.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedApprovedAvailabilityCheck) {
                        startBookingFromApprovedAvailability(selectedApprovedAvailabilityCheck);
                        setShowAvailabilityCheckSheet(false);
                        return;
                      }
                      setShowAvailabilityCheckSheet(false);
                      setBookingStep(true);
                    }}
                    className="mt-2 w-full py-2.5 rounded-xl bg-emerald-800 text-white text-[10px] font-black uppercase tracking-widest"
                  >
                    {labels.completeBooking}
                  </button>
                </div>
              )}
              <div className="form-two-col">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
                    {language === 'es' ? 'Desde' : 'From'}
                  </span>
                  <input
                    type="date"
                    value={availabilityDateFrom}
                    min={todayKey}
                    onChange={(e) => setAvailabilityDateFrom(e.target.value)}
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
                    {language === 'es' ? 'Hasta' : 'To'}
                  </span>
                  <input
                    type="date"
                    value={availabilityDateTo}
                    min={availabilityDateFrom || todayKey}
                    onChange={(e) => setAvailabilityDateTo(e.target.value)}
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
                  {language === 'es' ? 'Cantidad de personas' : 'People count'}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={availabilityPeopleCountInput}
                  onChange={(e) => setAvailabilityPeopleCountInput(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder={language === 'es' ? 'Ej: 3' : 'Eg: 3'}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-3 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 outline-none"
                />
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAvailabilityCheckSheet(false)}
                  className="flex-1 py-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-[10px] font-black uppercase tracking-widest"
                >
                  {labels.cancel}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAvailabilityCheck}
                  onClick={async () => {
                    if (isSubmittingAvailabilityCheck) return;
                    if (!availabilityDateFrom || !availabilityDateTo || availabilityDateFrom < todayKey || availabilityDateTo < availabilityDateFrom) {
                      onShowToast?.(language === 'es' ? 'Completá fechas válidas.' : 'Please complete valid dates.');
                      return;
                    }
                    if (availabilityPeopleCount < 1) {
                      onShowToast?.(language === 'es' ? 'Ingresá cantidad de personas válida.' : 'Please enter a valid people count.');
                      return;
                    }
                    try {
                      setIsSubmittingAvailabilityCheck(true);
                      const created = await onCreateAvailabilityCheck?.({
                        spotId: spot.id,
                        dateFrom: availabilityDateFrom,
                        dateTo: availabilityDateTo,
                        peopleCount: availabilityPeopleCount,
                      });
                      if (created === false) return;
                      setShowAvailabilityCheckSheet(false);
                      onShowToast?.(
                        language === 'es'
                          ? 'Pre-reserva enviada. Te avisaremos cuando el prestador responda.'
                          : 'Availability check sent. We will notify you when the provider responds.'
                      );
                    } finally {
                      setIsSubmittingAvailabilityCheck(false);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-emerald-800 disabled:bg-emerald-800/60 text-white text-[10px] font-black uppercase tracking-widest"
                >
                  {isSubmittingAvailabilityCheck
                    ? (language === 'es' ? 'Enviando...' : 'Sending...')
                    : labels.checkAvailability}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {pendingIncompleteBooking && (
        <div className="fixed inset-0 z-[105] bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-800">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">
                {language === 'es' ? 'Información pendiente' : 'Pending information'}
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-stone-900 dark:text-stone-100">
                {language === 'es' ? 'Podés reservar y completar después' : 'You can book and complete it later'}
              </h3>
              <p className="mt-2 text-sm font-medium text-stone-600 dark:text-stone-300">
                {language === 'es'
                  ? 'Te comprometés a completar los requisitos faltantes antes de las 24 hs previas al inicio de la actividad. Si no lo hacés, la reserva se rechazará automáticamente.'
                  : 'You commit to completing the missing requirements no later than 24 hours before the activity starts. Otherwise the booking will be automatically rejected.'}
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
                  {language === 'es' ? 'Te falta completar' : 'Still missing'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pendingRequirementLabels.map((item) => (
                    <span key={item} className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 text-[10px] font-black uppercase tracking-widest">
                      {item}
                    </span>
                  ))}
                </div>
                {pendingIncompleteBooking.informationDeadlineAt && (
                  <p className="mt-3 text-xs font-bold text-stone-600 dark:text-stone-300">
                    {language === 'es' ? 'Fecha límite' : 'Deadline'}: {new Date(pendingIncompleteBooking.informationDeadlineAt).toLocaleString(language === 'es' ? 'es-AR' : 'en-US')}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPendingIncompleteBooking(null);
                    setPendingRequirementLabels([]);
                  }}
                  className="flex-1 px-4 py-3 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-[10px] font-black uppercase tracking-widest"
                >
                  {language === 'es' ? 'Volver' : 'Go back'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void submitBooking(pendingIncompleteBooking);
                  }}
                  disabled={isSubmittingBooking}
                  className="flex-1 px-4 py-3 rounded-2xl bg-emerald-800 disabled:bg-emerald-900/60 disabled:opacity-80 text-white text-[10px] font-black uppercase tracking-widest"
                >
                  {isSubmittingBooking
                    ? (language === 'es' ? 'Enviando...' : 'Submitting...')
                    : (language === 'es' ? 'Reservar y completar después' : 'Book and complete later')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Image Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setZoomedImage(null)}
        >
          <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-lg" alt="Zoomed" />
          <button className="absolute top-10 right-10 text-white p-2 bg-white/10 rounded-full active:scale-90 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
    </div>
  );
};
