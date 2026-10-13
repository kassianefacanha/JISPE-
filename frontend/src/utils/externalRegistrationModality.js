const normalizeModalityIdentifier = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

export const isExternalRegistrationModality = (modality) => {
  const identifiers = typeof modality === 'string' ? [modality] : [modality?.name, modality?.slug];
  return identifiers.some((identifier) => {
    const normalized = normalizeModalityIdentifier(identifier);
    return normalized.includes('beachtennis') || normalized.includes('beachtenis');
  });
};