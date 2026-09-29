const defaultModalities = [
  { name: 'Futsal', slug: 'futsal', genders: ['masculino', 'feminino'], categories: ['Aberto', 'Adulto', 'Master'], maxTeamsPerEntity: 3, maxAthletesPerTeam: 15, isCollective: true, active: true },
  { name: 'Futebol de 7', slug: 'futebol-de-7', genders: ['masculino', 'feminino'], categories: ['Aberto', 'Adulto', 'Master'], maxTeamsPerEntity: 3, maxAthletesPerTeam: 15, isCollective: true, active: true },
  { name: 'Basquetebol', slug: 'basquetebol', genders: ['masculino', 'feminino'], categories: ['Aberto'], maxTeamsPerEntity: 3, maxAthletesPerTeam: 15, isCollective: true, active: true },
  { name: 'Natação', slug: 'natacao', genders: ['masculino', 'feminino'], categories: ['Adulto (18-35)', 'Master (36+)'], isCollective: true, active: true },
  { name: 'Voleibol de Quadra', slug: 'voleibol-de-quadra', legacySlugs: ['volei'], legacyNames: ['Vôlei'], genders: ['masculino', 'feminino'], categories: ['Aberto'], maxTeamsPerEntity: 3, maxAthletesPerTeam: 12, isCollective: true, active: true },
  { name: 'Vôlei de Praia', slug: 'volei-de-praia', genders: ['masculino', 'feminino', 'misto'], categories: ['Aberto'], maxTeamsPerEntity: 3, maxAthletesPerTeam: 4, isCollective: true, active: true },
  { name: 'Tênis de Mesa', slug: 'tenis-de-mesa', genders: ['masculino', 'feminino'], categories: ['Aberto', 'Adulto', 'Master'], maxTeamsPerEntity: 3, isCollective: false, active: true },
  { name: 'Carimba', slug: 'carimba', genders: ['masculino', 'feminino'], categories: ['Aberto'], maxTeamsPerEntity: 3, maxAthletesPerTeam: 15, isCollective: true, active: true },
  { name: 'Handebol', slug: 'handebol', genders: ['masculino', 'feminino'], categories: ['Aberto'], maxTeamsPerEntity: 3, maxAthletesPerTeam: 15, isCollective: true, active: true },
  { name: 'Beach Tennis', slug: 'beach-tennis', genders: ['masculino', 'feminino', 'misto'], categories: ['Aberto'], maxTeamsPerEntity: 3, maxAthletesPerTeam: 4, isCollective: true, active: true },
  { name: 'Xadrez', slug: 'xadrez', genders: ['masculino', 'feminino'], categories: ['Aberto'], isCollective: false, active: true },
  { name: 'Dama', slug: 'dama', genders: ['masculino', 'feminino'], categories: ['Aberto'], isCollective: false, active: true },
  { name: 'Corrida 5km', slug: 'corrida-5km', genders: ['masculino', 'feminino'], categories: ['18-29', '30-39', '40-49', '50+'], isCollective: false, active: true },
];

const getModalityCatalog = (storedModalities = []) => {
  const matchedSlugs = new Set();
  const officialModalities = defaultModalities.map((modality) => {
    const aliases = [modality.slug, ...(modality.legacySlugs || [])];
    const stored = storedModalities.find((item) =>
      aliases.includes(item.slug) || modality.legacyNames?.includes(item.name)
    );
    if (stored) matchedSlugs.add(stored.slug);
    return { ...stored, ...modality, _id: stored?._id || modality.slug };
  });
  const customModalities = storedModalities.filter((modality) => !matchedSlugs.has(modality.slug));
  return [...officialModalities, ...customModalities]
    .filter((modality) => modality.active !== false)
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
};

module.exports = { defaultModalities, getModalityCatalog };