import { useState, useRef } from 'react';
import { Difficulty, ActivityType } from '../types';

export const useProfileViewModel = () => {
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    providerServices: [] as string[],
    provincia: '',
    countryOrigin: '',
    birthDate: '',
    experience: Difficulty.EASY,
    preferredSports: [] as ActivityType[],
    language: 'es',
    isForeigner: false,
    instagram: '',
    avatar: 'https://i.pravatar.cc/150?u=new_user'
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState(profileData);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [showQRView, setShowQRView] = useState(false);
  const [qrColorIndex, setQrColorIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseIsoDate = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateField = (field: string, value: any, target: 'reg' | 'edit' = 'reg', isProvider: boolean = false) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ'’ -]{2,50}$/;
    const phoneRegex = /^[+\d\s-()]+$/;
    const phoneDigits = String(value || '').replace(/\D/g, '');
    let isInvalid = false;
    const currentData = target === 'reg' ? profileData : editForm;

    switch (field) {
      case 'name':
        isInvalid = !value || !nameRegex.test(String(value).trim());
        break;
      case 'email':
        isInvalid = !value || !emailRegex.test(value);
        break;
      case 'phone':
        isInvalid = Boolean(value) && (!phoneRegex.test(String(value).trim()) || phoneDigits.length < 8);
        if (isProvider && !value) {
          isInvalid = true;
        }
        break;
      case 'birthDate':
        if (!value) {
          isInvalid = true;
        } else {
          const dateValue = parseIsoDate(String(value));
          if (!dateValue) {
            isInvalid = true;
            break;
          }
          if (isProvider) {
            isInvalid = false;
          } else {
            const today = new Date();
            let age = today.getFullYear() - dateValue.getFullYear();
            const monthDiff = today.getMonth() - dateValue.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateValue.getDate())) {
              age--;
            }
            isInvalid = age < 18;
          }
        }
        break;
      case 'provincia':
        isInvalid = !value;
        break;
      case 'countryOrigin':
        isInvalid = currentData.isForeigner && !value;
        break;
      case 'providerServices':
        isInvalid = isProvider && (!Array.isArray(value) || value.length === 0);
        break;
    }

    setFormErrors(prev => ({ ...prev, [field]: isInvalid }));
    return !isInvalid;
  };

  const validateForm = (data: any, isRegistering: boolean, rt: any, isProvider: boolean = false) => {
    const fields = isProvider
      ? ['name', 'email', 'phone', 'birthDate', 'provincia', 'providerServices']
      : ['name', 'email', 'birthDate', 'provincia'];
    if (data.isForeigner) fields.push('countryOrigin');
    
    let isValid = true;
    fields.forEach(f => {
      if (!validateField(f, (data as any)[f], isRegistering ? 'reg' : 'edit', isProvider)) {
        isValid = false;
      }
    });

    if (!isValid) {
      // Note: Using the local isInvalid logic instead of stale formErrors for the alert
      // but for consistency with original code we'll keep the alert logic here
      // In the original code it was checking formErrors which might be stale.
      // We'll just return isValid and let the View handle the alert if possible, 
      // or we can pass the errors back.
    }
    
    return isValid;
  };

  const toggleSport = (sport: ActivityType, target: 'reg' | 'edit' = 'reg') => {
    const setter = target === 'reg' ? setProfileData : setEditForm;
    setter(prev => ({
      ...prev,
      preferredSports: prev.preferredSports.includes(sport)
        ? prev.preferredSports.filter(s => s !== sport)
        : [...prev.preferredSports, sport]
    }));
    setFormErrors(prev => ({ ...prev, preferredSports: false }));
  };

  return {
    profileData, setProfileData,
    isEditingProfile, setIsEditingProfile,
    editForm, setEditForm,
    formErrors, setFormErrors,
    showQRView, setShowQRView,
    qrColorIndex, setQrColorIndex,
    fileInputRef,
    handlePhotoUpload,
    validateField,
    validateForm,
    toggleSport
  };
};
