import { useState, useEffect, useMemo } from 'react';
import { OutdoorSpot, PlaceType, ActivityType, Difficulty } from '../types';
import { getSafetyAlerts } from '../services/recommendationsService';
import { sortSponsoredFirst } from '../services/sponsorship';

export const useSpotsViewModel = (
  isAuthenticated: boolean, 
  regLang: 'es' | 'en',
  favorites: Set<string>,
  activeProvince: string,
  spots: OutdoorSpot[],
  activePlaceTypes: Array<PlaceType | 'Expediciones' | 'Eventos' | 'Cursos'>
) => {
  const expeditionActivityTypes = [ActivityType.TREKKING, ActivityType.MONTANISMO];
  const [selectedSpot, setSelectedSpot] = useState<OutdoorSpot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePlaceType, setActivePlaceType] = useState<PlaceType | 'Expediciones'>(PlaceType.REFUGIO);
  const [activeActivity, setActiveActivity] = useState<ActivityType[]>([]);
  const [isMapMode, setIsMapMode] = useState(false);
  const [alerts, setAlerts] = useState<{title: string, description: string, severity: string}[]>([]);
  const [isAlertsDismissed, setIsAlertsDismissed] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchAlerts = async () => {
        const data = await getSafetyAlerts("Argentina mountain areas", regLang);
        setAlerts(data);
      };
      fetchAlerts();
    }
  }, [isAuthenticated, regLang]);

  const filteredSpots = useMemo(() => {
    return sortSponsoredFirst(spots.filter(spot => {
      const matchesSearch = spot.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           spot.location.toLowerCase().includes(searchQuery.toLowerCase());
      const isExpeditionContent = spot.placeType === PlaceType.ACTIVIDAD && !!spot.activityType && expeditionActivityTypes.includes(spot.activityType);
      const isStandardActivity = spot.placeType === PlaceType.ACTIVIDAD && !isExpeditionContent;
      const matchesType = activePlaceTypes.length === 0
        ? spot.placeType !== PlaceType.REFUGIO
        : activePlaceTypes.some((type) =>
            type === 'Expediciones'
              ? isExpeditionContent
              : type === PlaceType.ACTIVIDAD
              ? isStandardActivity
              : type === 'Eventos' || type === 'Cursos'
              ? false
              : spot.placeType === type
          );
      const matchesActivity = !isStandardActivity || activeActivity.length === 0 || (!!spot.activityType && activeActivity.includes(spot.activityType));
      const matchesProvince = activeProvince === 'Todas' || spot.province === activeProvince;
      return matchesSearch && matchesType && matchesActivity && matchesProvince;
    }));
  }, [searchQuery, activePlaceTypes, activeActivity, activeProvince, spots]);

  return {
    selectedSpot, setSelectedSpot,
    searchQuery, setSearchQuery,
    activePlaceType, setActivePlaceType,
    activeActivity, setActiveActivity,
    isMapMode, setIsMapMode,
    alerts, setAlerts,
    isAlertsDismissed, setIsAlertsDismissed,
    filteredSpots
  };
};
