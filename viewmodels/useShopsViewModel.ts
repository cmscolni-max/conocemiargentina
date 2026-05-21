import { useState, useMemo, useEffect } from 'react';
import { OutdoorShop } from '../types';
import { cumbreApi } from '../services/cumbreApi';
import { sortSponsoredFirst } from '../services/sponsorship';

export const useShopsViewModel = (searchQuery: string, activeShopProvince: string) => {
  const [selectedShop, setSelectedShop] = useState<OutdoorShop | null>(null);
  const [isShopMapMode, setIsShopMapMode] = useState(false);
  const [activeShopCategory, setActiveShopCategory] = useState<string>('Todas');
  const [shops, setShops] = useState<OutdoorShop[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoadingShops(true);
        const data = await cumbreApi.getShops();
        if (!cancelled) setShops(data);
      } catch (error) {
        console.error('Error loading shops from DB:', error);
        if (!cancelled) setShops([]);
      } finally {
        if (!cancelled) setIsLoadingShops(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredShops = useMemo(() => {
    return sortSponsoredFirst(shops.filter(shop => {
      const hasGearRental = `${shop.specialty} ${shop.description || ''} ${(shop.reviews || []).map((review) => review.comment).join(' ')}`
        .toLowerCase()
        .includes('alquil');
      const matchesProvince = activeShopProvince === 'Todas' || shop.province === activeShopProvince;
      const matchesCategory = activeShopCategory === 'Todas' ||
        (activeShopCategory === 'Con alquiler de equipo'
          ? hasGearRental
          : activeShopCategory === 'Sin alquiler de equipo'
          ? !hasGearRental
          : true);
      const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           shop.specialty.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesProvince && matchesCategory && matchesSearch;
    }));
  }, [activeShopProvince, activeShopCategory, searchQuery, shops]);

  return {
    selectedShop, setSelectedShop,
    isShopMapMode, setIsShopMapMode,
    activeShopCategory, setActiveShopCategory,
    filteredShops,
    shops, setShops,
    isLoadingShops
  };
};
