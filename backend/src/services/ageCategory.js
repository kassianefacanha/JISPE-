const EVENT_YEAR = 2026;

const getAgeFromBirthDate = (birthDate, year = EVENT_YEAR) => {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  let age = year - birth.getFullYear();
  const birthdayThisYear = new Date(year, birth.getMonth(), birth.getDate());
  const comparisonDate = new Date(year, new Date().getMonth(), new Date().getDate());

  if (birthdayThisYear > comparisonDate) {
    age -= 1;
  }

  return age;
};

const getAgeCategory = (birthDate, modality) => {
  const age = getAgeFromBirthDate(birthDate, EVENT_YEAR);
  const normalizedModality = String(modality || '').toLowerCase();

  if (age === null || age < 18) {
    return 'adulto';
  }

  if (normalizedModality.includes('corrida')) {
    if (age >= 18 && age <= 29) return '18-29';
    if (age >= 30 && age <= 39) return '30-39';
    if (age >= 40 && age <= 49) return '40-49';
    if (age >= 50) return '50+';
  }

  return age < 36 ? 'adulto' : 'master';
};

module.exports = { getAgeCategory };
