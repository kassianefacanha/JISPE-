const EVENT_YEAR = 2026;

const getBirthDate = (birthDate) => {
  const birth = new Date(birthDate);
  return Number.isNaN(birth.getTime()) ? null : birth;
};

const hasCompletedMinimumAge = (birthDate, referenceDate = new Date()) => {
  const birth = getBirthDate(birthDate);
  if (!birth || Number.isNaN(referenceDate.getTime())) return false;

  let age = referenceDate.getFullYear() - birth.getUTCFullYear();
  const birthdayNotReached = referenceDate.getMonth() < birth.getUTCMonth()
    || (referenceDate.getMonth() === birth.getUTCMonth() && referenceDate.getDate() < birth.getUTCDate());
  if (birthdayNotReached) age -= 1;

  return age >= 18;
};

const getAgeCategory = (birthDate, modality, categories = []) => {
  const birth = getBirthDate(birthDate);
  if (!birth) return '';

  const age = EVENT_YEAR - birth.getUTCFullYear();
  if (age < 18) return '';

  const normalizedModality = String(modality || '').toLowerCase();
  const normalizedCategories = categories.map((category) => String(category).trim().toLowerCase());

  if (normalizedModality.includes('corrida')) {
    if (age <= 29) return '18-29';
    if (age >= 30 && age <= 39) return '30-39';
    if (age >= 40 && age <= 49) return '40-49';
    if (age >= 50) return '50+';
  }

  const masterCategory = categories.find((category) => String(category).trim().toLowerCase().startsWith('master'));
  if (masterCategory && age >= 36) return masterCategory;

  const adultCategory = categories.find((category) => {
    const normalized = String(category).trim().toLowerCase();
    return normalized.startsWith('adulto') || normalized.includes('18-35');
  });
  if (adultCategory) return adultCategory;

  const openCategory = categories.find((category) => String(category).trim().toLowerCase().startsWith('aberto'));
  if (openCategory) return openCategory;

  return categories[0] || 'adulto';
};

module.exports = { EVENT_YEAR, getAgeCategory, hasCompletedMinimumAge };
