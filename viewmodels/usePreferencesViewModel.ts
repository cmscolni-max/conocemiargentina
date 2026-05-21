import { useState, useEffect } from 'react';
import { CommunicationPreferences } from '../types';
import { cumbreApi } from '../services/cumbreApi';

export const usePreferencesViewModel = (profileId: string | null = null) => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeProvince, setActiveProvince] = useState<string>('Todas');
  const [activeShopProvince, setActiveShopProvince] = useState<string>('Todas');
  const [communicationPreferences, setCommunicationPreferences] = useState<CommunicationPreferences>({
    profileId: profileId || '',
    bookingEmails: true,
    socialEmails: true,
    systemEmails: true,
    marketingEmails: false,
    weeklyDigestEmails: false,
  });
  const [isSavingCommunicationPreferences, setIsSavingCommunicationPreferences] = useState(false);
  const [communicationPreferencesMessage, setCommunicationPreferencesMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadFavorites = async () => {
      if (!profileId) {
        const saved = localStorage.getItem('cumbre_favorites');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && !cancelled) {
              setFavorites(new Set(parsed));
            }
          } catch (e) {
            console.error('Error loading favorites:', e);
          }
        }
        return;
      }
      try {
        const fromDb = await cumbreApi.getFavorites(profileId);
        if (!cancelled) setFavorites(fromDb);
      } catch (e) {
        console.error('Error loading favorites from DB:', e);
      }
    };
    loadFavorites();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  useEffect(() => {
    let cancelled = false;
    const loadPreferences = async () => {
      if (!profileId) {
        setCommunicationPreferences({
          profileId: '',
          bookingEmails: true,
          socialEmails: true,
          systemEmails: true,
          marketingEmails: false,
          weeklyDigestEmails: false,
        });
        return;
      }
      try {
        const nextPreferences = await cumbreApi.getCommunicationPreferences(profileId);
        if (!cancelled) {
          setCommunicationPreferences(nextPreferences);
        }
      } catch (error) {
        console.error('Error loading communication preferences:', error);
      }
    };
    loadPreferences();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  useEffect(() => {
    localStorage.setItem('cumbre_favorites', JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      const currentlyFavorite = next.has(id);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (profileId) {
        cumbreApi.toggleFavorite(profileId, id, currentlyFavorite).catch((error) => {
          console.error('Error syncing favorite:', error);
        });
      }
      return next;
    });
  };

  const updateCommunicationPreference = async (key: Exclude<keyof CommunicationPreferences, 'profileId' | 'createdAt' | 'updatedAt'>, value: boolean) => {
    const nextPreferences = {
      ...communicationPreferences,
      [key]: value,
    } as CommunicationPreferences;
    setCommunicationPreferences(nextPreferences);
    setCommunicationPreferencesMessage('');
    if (!profileId) return nextPreferences;

    setIsSavingCommunicationPreferences(true);
    try {
      const savedPreferences = await cumbreApi.updateCommunicationPreferences(profileId, nextPreferences);
      setCommunicationPreferences(savedPreferences);
      return savedPreferences;
    } catch (error) {
      console.error('Error saving communication preferences:', error);
      setCommunicationPreferencesMessage('No se pudieron guardar tus preferencias de email.');
      return communicationPreferences;
    } finally {
      setIsSavingCommunicationPreferences(false);
    }
  };

  return {
    favorites,
    toggleFavorite,
    activeProvince,
    setActiveProvince,
    activeShopProvince,
    setActiveShopProvince,
    communicationPreferences,
    updateCommunicationPreference,
    isSavingCommunicationPreferences,
    communicationPreferencesMessage,
  };
};
