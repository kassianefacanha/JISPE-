const normalizeModalityIdentifier = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const swimmingRelayAliases = new Set([
  'natacaorevezamento',
  'natacaorevezamentomasculino',
  'natacaorevezamentofeminino',
  'natacaorevezamentomisto',
]);

export const isExternalRegistrationModality = (modality) => {
  const identifiers = typeof modality === 'string' ? [modality] : [modality?.name, modality?.slug];
  return identifiers.some((identifier) => {
    const normalized = normalizeModalityIdentifier(identifier);
    return normalized.includes('beachtennis') || normalized.includes('beachtenis');
  });
};

export const normalizeModalityCatalog = (modalities = []) => {
  const availableModalities = modalities.filter((modality) => !isExternalRegistrationModality(modality));
  const swimmingRelayEntries = availableModalities.filter((modality) => (
    [modality.name, modality.slug].some((identifier) => swimmingRelayAliases.has(normalizeModalityIdentifier(identifier)))
  ));
  if (!swimmingRelayEntries.length) return availableModalities;

  const swimmingRelay = swimmingRelayEntries.find((modality) => (
    normalizeModalityIdentifier(modality.slug) === 'natacaorevezamento'
  )) || swimmingRelayEntries[0];
  const otherModalities = availableModalities.filter((modality) => !swimmingRelayEntries.includes(modality));

  return [...otherModalities, {
    ...swimmingRelay,
    _id: 'natacao-revezamento',
    name: 'Natação Revezamento',
    slug: 'natacao-revezamento',
    legacySlugs: ['natacao-revezamento-masculino', 'natacao-revezamento-feminino', 'natacao-revezamento-misto'],
    legacyNames: ['Natação Revezamento masculino', 'Natação Revezamento feminino', 'Natação Revezamento misto'],
    genders: ['masculino', 'feminino', 'misto'],
  }].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
};