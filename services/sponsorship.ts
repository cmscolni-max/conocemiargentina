const normalizeDateKey = (value?: string | null) => {
  if (!value) return null;
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
};

export const getTodayDateKey = (reference = new Date()) => {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, '0');
  const day = String(reference.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const hasSponsoredWindow = (startDate?: string | null, endDate?: string | null) =>
  Boolean(normalizeDateKey(startDate) && normalizeDateKey(endDate));

export const isSponsoredActive = (
  startDate?: string | null,
  endDate?: string | null,
  isSponsored?: boolean,
  reference = new Date()
) => {
  if (hasSponsoredWindow(startDate, endDate)) {
    return isSponsoredWindowActive(startDate, endDate, reference);
  }
  return Boolean(isSponsored);
};

export const isSponsoredWindowActive = (
  startDate?: string | null,
  endDate?: string | null,
  reference = new Date()
) => {
  const normalizedStart = normalizeDateKey(startDate);
  const normalizedEnd = normalizeDateKey(endDate);
  if (!normalizedStart || !normalizedEnd) return false;
  const today = getTodayDateKey(reference);
  return normalizedStart <= today && today <= normalizedEnd;
};

export const sortSponsoredFirst = <T extends { isSponsored?: boolean; sponsoredStartDate?: string; sponsoredEndDate?: string }>(
  items: T[]
) => (
  [...items].sort((a, b) => {
    const aActive = isSponsoredActive(a.sponsoredStartDate, a.sponsoredEndDate, a.isSponsored);
    const bActive = isSponsoredActive(b.sponsoredStartDate, b.sponsoredEndDate, b.isSponsored);
    if (aActive === bActive) return 0;
    return aActive ? -1 : 1;
  })
);
