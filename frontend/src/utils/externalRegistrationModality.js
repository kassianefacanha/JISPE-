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
const beachVolleyballAliases = new Set([
  'voleidepraia4x4',
  'voleidepraia4x4masculino',
  'voleidepraia4x4feminino',
  'voleidepraia4x4misto',
]);

export const isExternalRegistrationModality = (modality) => {
  const identifiers = typeof modality === 'string' ? [modality] : [modality?.name, modality?.slug];
  return identifiers.some((identifier) => {
    const normalized = normalizeModalityIdentifier(identifier);
    return normalized.includes('beachtennis') || normalized.includes('beachtenis');
  });
};

const consolidateModalities = (modalities, aliases, canonicalName, canonicalSlug, legacyNames, legacySlugs, genders) => {
  const entries = modalities.filter((modality) => (
    [modality.name, modality.slug].some((identifier) => aliases.has(normalizeModalityIdentifier(identifier)))
  ));
  if (!entries.length) return modalities;

  const canonical = entries.find((modality) => normalizeModalityIdentifier(modality.slug) === normalizeModalityIdentifier(canonicalSlug)) || entries[0];
  return [
    ...modalities.filter((modality) => !entries.includes(modality)),
    {
      ...canonical,
      _id: canonicalSlug,
      name: canonicalName,
      slug: canonicalSlug,
      legacySlugs,
      legacyNames,
      genders,
    },
  ];
};

export const normalizeModalityCatalog = (modalities = []) => {
  const availableModalities = modalities.filter((modality) => !isExternalRegistrationModality(modality));
  const withUnifiedSwimming = consolidateModalities(
    availableModalities,
    swimmingRelayAliases,
    'Natação Revezamento',
    'natacao-revezamento',
    ['Natação Revezamento masculino', 'Natação Revezamento feminino', 'Natação Revezamento misto'],
    ['natacao-revezamento-masculino', 'natacao-revezamento-feminino', 'natacao-revezamento-misto'],
    ['masculino', 'feminino', 'misto']
  );
  return consolidateModalities(
    withUnifiedSwimming,
    beachVolleyballAliases,
    'Vôlei de praia 4x4',
    'volei-de-praia-4x4',
    ['Vôlei de praia 4x4 Misto', 'Vôlei de praia 4x4 Masculino', 'Vôlei de praia 4x4 Feminino'],
    ['volei-de-praia-4x4-misto', 'volei-de-praia-4x4-masculino', 'volei-de-praia-4x4-feminino'],
    ['masculino', 'feminino', 'misto']
  ).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
};