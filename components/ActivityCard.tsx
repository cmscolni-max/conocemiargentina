
import React from 'react';
import { OutdoorSpot, PlaceType } from '../types';
import { Icons } from '../constants';
import { isSponsoredActive } from '../services/sponsorship';

interface ActivityCardProps {
  spot: OutdoorSpot;
  onClick: (spot: OutdoorSpot) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  language?: string;
  translations?: any;
  isForeigner?: boolean;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ 
  spot, 
  onClick, 
  isFavorite, 
  onToggleFavorite,
  language = 'es',
  translations,
  isForeigner
}) => {
  const toDayKey = (value?: string) => {
    if (!value) return null;
    const normalized = String(value).trim();
    if (!normalized) return null;

    const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const y = Number(isoMatch[1]);
      const m = Number(isoMatch[2]) - 1;
      const d = Number(isoMatch[3]);
      return new Date(y, m, d).getTime();
    }

    const latamMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (latamMatch) {
      const d = Number(latamMatch[1]);
      const m = Number(latamMatch[2]) - 1;
      const y = Number(latamMatch[3]);
      return new Date(y, m, d).getTime();
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  };
  const today = new Date();
  const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const activityDateKey = toDayKey(spot.date || spot.expeditionEndDate || spot.expeditionStartDate);
  const isPastActivity =
    (spot.placeType === PlaceType.ACTIVIDAD || spot.placeType === PlaceType.ENTRENA) &&
    activityDateKey !== null &&
    activityDateKey < todayKey;

  const isSpotSponsoredActive = isSponsoredActive(spot.sponsoredStartDate, spot.sponsoredEndDate, spot.isSponsored);
  const fallbackCardImage = 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?auto=format&fit=crop&q=80&w=800';
  const cardImage = Array.isArray(spot.images) && spot.images[0] ? spot.images[0] : fallbackCardImage;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        .then(() => alert('¡Enlace copiado al portapapeles!'))
        .catch(() => alert('No se pudo copiar el enlace.'));
    } else {
      alert(`Compartir: ${shareData.title} - ${shareData.url}`);
    }
  };

  const getSportLabel = () => {
    const rawSport = spot.activityType || '';
    if (!rawSport) return language === 'en' ? 'Activity' : 'Actividad';
    if (translations && translations[rawSport]) return translations[rawSport];
    return rawSport;
  };

  const getTranslatedBadge = () => {
    const sportLabel = getSportLabel();
    const shouldForceCourseLabel = spot.activityType === 'Boulder' && spot.placeType === PlaceType.ENTRENA;
    if (spot.kind === 'course') {
      return language === 'en' ? `Course of ${sportLabel}` : `Curso de ${sportLabel}`;
    }
    if (shouldForceCourseLabel) {
      return language === 'en' ? `Course of ${sportLabel}` : `Curso de ${sportLabel}`;
    }
    if (spot.kind === 'event') {
      return language === 'en' ? `Event of ${sportLabel}` : `Evento de ${sportLabel}`;
    }
    if (spot.placeType === PlaceType.ENTRENA) {
      return language === 'en' ? `Training of ${sportLabel}` : `Entrenamiento de ${sportLabel}`;
    }
    if (spot.placeType === PlaceType.ACTIVIDAD) {
      return sportLabel;
    }
    const rawValue = spot.placeType;
    if (translations && rawValue && translations[rawValue]) return translations[rawValue];
    return rawValue;
  };

  const getActivityCategory = () => {
    if (spot.placeType !== PlaceType.ACTIVIDAD && spot.placeType !== PlaceType.ENTRENA) return null;
    if (spot.kind === 'course') return language === 'en' ? 'Course' : 'Curso';
    if (spot.kind === 'event') return language === 'en' ? 'Event' : 'Evento';
    if (spot.placeType === PlaceType.ENTRENA) return language === 'en' ? 'Training' : 'Entrenamiento';
    return language === 'en' ? 'Sport' : 'Deporte';
  };

  const getDateLabel = () => {
    if (!spot.date) return null;
    const d = new Date(`${spot.date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    const locale = language === 'en' ? 'en-US' : 'es-AR';
    return d.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' });
  };

  return (
    <div
      className={`group rounded-[1.7rem] overflow-hidden transition-all cursor-pointer ${
        isSpotSponsoredActive
          ? 'bg-[linear-gradient(145deg,#fff8df_0%,#f6fbff_48%,#eef8ff_100%)] dark:from-amber-950/20 dark:via-stone-900 dark:to-sky-950/20 shadow-[0_18px_45px_rgba(20,55,90,0.2)] border border-amber-300 dark:border-amber-700 ring-2 ring-amber-200/80 dark:ring-amber-800/50'
          : 'bg-white/95 dark:bg-stone-900 shadow-[0_14px_32px_rgba(17,34,54,0.12)] border border-sky-100 dark:border-stone-800'
      } ${isPastActivity ? 'opacity-60 grayscale cursor-not-allowed' : 'active:scale-[0.985] hover:-translate-y-0.5'}`}
      onClick={() => {
        if (isPastActivity) return;
        onClick(spot);
      }}
    >
      <div className="relative h-52 w-full">
        <img 
          src={cardImage} 
          alt={spot.name} 
          className="w-full h-full object-cover"
        />
        {spot.date && (
          <div className="absolute top-3 left-3 bg-white/88 text-sky-900 text-[9px] font-black uppercase px-2.5 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm border border-sky-100">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5m8 2V5M4 9h16m-1 10H5a1 1 0 0 1-1-1V9h16v9a1 1 0 0 1-1 1Z" />
            </svg>
            <span>{getDateLabel()}</span>
          </div>
        )}
        {isSpotSponsoredActive && (
          <div className="absolute left-3 top-3 bg-gradient-to-r from-amber-300 to-yellow-400 text-stone-950 text-[9px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg tracking-[0.18em]">
            Destacado
          </div>
        )}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (isPastActivity) return;
              onToggleFavorite?.(spot.id);
            }}
            disabled={isPastActivity}
            className={`p-2 rounded-full shadow-sm backdrop-blur-sm transition-colors ${
              isFavorite ? 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400' : 'bg-white/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300'
            }`}
          >
            <Icons.Heart filled={isFavorite} />
          </button>
          <button 
            onClick={handleShare}
            disabled={isPastActivity}
            className="p-2 rounded-full shadow-sm bg-white/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 backdrop-blur-sm transition-colors active:bg-sky-50 active:text-sky-700"
          >
            <Icons.Share />
          </button>
        </div>
        {isPastActivity && (
          <div className="absolute inset-0 bg-stone-900/35 flex items-center justify-center">
            <span className="px-3 py-1.5 rounded-full bg-stone-900/80 text-white text-[10px] font-black uppercase tracking-widest">
              {language === 'en' ? 'Already happened' : 'Ya sucedio'}
            </span>
          </div>
        )}
        <div className={`absolute bottom-3 left-3 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm ${
          isSponsoredActive ? 'bg-stone-950/80 text-amber-300 backdrop-blur-sm' : 'bg-emerald-600 text-white'
        }`}>
          {getTranslatedBadge()}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d2035]/45 via-transparent to-transparent pointer-events-none" />
      </div>
      <div className="p-4 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(240,248,255,0.92)_100%)]">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-extrabold text-[#102132] dark:text-stone-100 text-lg leading-tight">{spot.name}</h3>
          <div className="flex items-center gap-1">
            <Icons.Star />
            <span className="text-sm font-medium dark:text-stone-300">{spot.rating}</span>
          </div>
        </div>
        <p className="text-slate-600 dark:text-stone-400 text-sm mb-3">{spot.location}, {spot.province}</p>
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <div>
              <span className="font-extrabold text-sky-800 dark:text-sky-300 text-lg">
                {spot.price > 0 ? `$${spot.price}${isForeigner ? ' ARS' : ''}` : (language === 'en' ? 'Free' : 'Gratis')}
              </span>
              {spot.price > 0 && <span className="text-xs text-stone-400 dark:text-stone-500 font-medium"> / {language === 'en' ? 'night' : 'noche'}</span>}
            </div>
            {isForeigner && spot.price > 0 && (
              <p className="text-[7px] text-stone-400 dark:text-stone-500 font-black uppercase tracking-tight leading-none mt-0.5 italic">Consultar conversión a tu moneda local</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-stone-400 dark:text-stone-600">
            <span className="text-[10px] uppercase font-bold tracking-wider">{spot.difficulty}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
