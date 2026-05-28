import { useState, useEffect } from 'react';
import { ViewState, ThemeMode } from '../types';

export const useUIViewModel = () => {
  const [currentView, setCurrentView] = useState<ViewState>('explore');
  const [regLang, setRegLang] = useState<any>('es');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('cumbre_theme');
    return (saved as ThemeMode) || 'system';
  });
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [activeNotifications, setActiveNotifications] = useState<string[]>(['weather', 'booking_confirm']);

  const toggleNotification = (key: string) => {
    if (key === 'disabled') {
      setActiveNotifications(['disabled']);
    } else {
      setActiveNotifications(prev => {
        const withoutDisabled = prev.filter(k => k !== 'disabled');
        if (withoutDisabled.includes(key)) {
          return withoutDisabled.filter(k => k !== key);
        } else {
          return [...withoutDisabled, key];
        }
      });
    }
  };

  useEffect(() => {
    localStorage.setItem('cumbre_theme', themeMode);
    const applyTheme = () => {
      const root = window.document.documentElement;
      const isDark = themeMode === 'dark' || (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    applyTheme();
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  return {
    currentView, setCurrentView,
    regLang, setRegLang,
    themeMode, setThemeMode,
    showThemeModal, setShowThemeModal,
    showNotifModal, setShowNotifModal,
    showLangModal, setShowLangModal,
    activeNotifications, toggleNotification
  };
};
