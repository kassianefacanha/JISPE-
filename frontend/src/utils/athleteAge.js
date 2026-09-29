const EVENT_YEAR = 2026;

const parseDateInput = (value) => {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const hasCompletedMinimumAge = (birthDate, referenceDate = new Date()) => {
  const birth = parseDateInput(birthDate);
  if (!birth || Number.isNaN(referenceDate.getTime())) return false;

  let age = referenceDate.getFullYear() - birth.getFullYear();
  const birthdayNotReached = referenceDate.getMonth() < birth.getMonth()
    || (referenceDate.getMonth() === birth.getMonth() && referenceDate.getDate() < birth.getDate());
  if (birthdayNotReached) age -= 1;

  return age >= 18;
};

export const getAutomaticAgeCategory = (birthDate, modality, categories = []) => {
  const birth = parseDateInput(birthDate);
  if (!birth || !modality) return '';

  const eventAge = EVENT_YEAR - birth.getFullYear();
  if (eventAge < 18) return '';

  if (String(modality).toLowerCase().includes('corrida')) {
    if (eventAge <= 29) return '18-29';
    if (eventAge <= 39) return '30-39';
    if (eventAge <= 49) return '40-49';
    return '50+';
  }

  const masterCategory = categories.find((category) => String(category).trim().toLowerCase().startsWith('master'));
  if (masterCategory && eventAge >= 36) return masterCategory;

  const adultCategory = categories.find((category) => {
    const normalized = String(category).trim().toLowerCase();
    return normalized.startsWith('adulto') || normalized.includes('18-35');
  });
  const openCategory = categories.find((category) => String(category).trim().toLowerCase().startsWith('aberto'));
  return adultCategory || openCategory || categories[0] || 'adulto';
};

export const getAllowedGenders = (modality) => modality?.genders || [];