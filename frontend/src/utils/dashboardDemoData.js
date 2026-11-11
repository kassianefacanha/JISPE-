const entityNames = [
  'Órgão de demonstração 01',
  'Órgão de demonstração 02',
  'Órgão de demonstração 03',
  'Órgão de demonstração 04',
];

const demoEntities = entityNames.map((name, index) => ({
  _id: `demo-entity-${index + 1}`,
  name,
  email: `orgao${index + 1}@exemplo.invalid`,
  phone: '(85) 3000-0000',
  status: ['approved', 'approved', 'pending', 'rejected'][index],
  responsible: {
    fullName: `Responsável demonstração ${index + 1}`,
    cpf: '000.000.000-00',
    email: `responsavel${index + 1}@exemplo.invalid`,
  },
  createdAt: new Date(Date.UTC(2026, 9, 20 - index)).toISOString(),
}));

const modalities = [
  'Corrida de 5 km',
  'Futsal',
  'Voleibol',
  'Natação',
  'Tênis de mesa',
  'Xadrez',
  'Handebol',
  'Basquetebol',
];

const demoAthletes = Array.from({ length: 24 }, (_, index) => {
  const entityIndex = index % entityNames.length;
  const modality = modalities[index % modalities.length];
  const approvalStatus = ['approved', 'approved', 'pending', 'rejected'][index % 4];
  const naipe = ['masculino', 'feminino', 'misto'][index % 3];
  const age = 20 + ((index * 3) % 35);

  return {
    _id: `demo-athlete-${index + 1}`,
    entityId: `demo-entity-${entityIndex + 1}`,
    fullName: `Atleta demonstração ${String(index + 1).padStart(2, '0')}`,
    cpf: '000.000.000-00',
    email: `atleta${index + 1}@exemplo.invalid`,
    phone: '(85) 90000-0000',
    matricula: `DEMO-${String(index + 1).padStart(4, '0')}`,
    birthDate: new Date(Date.UTC(2026 - age, index % 12, 12)).toISOString(),
    modality,
    modalities: [modality],
    naipe,
    gender: naipe,
    approvalStatus,
    isPcd: index % 7 === 0,
    hasSpecialCondition: index % 9 === 0,
    isExternalServant: index % 5 === 0,
    linkedEntityName: index % 5 === 0 ? 'Órgão vinculado de demonstração' : '',
    photoUrl: '',
    proofUrl: '',
    affiliationProofUrl: '',
  };
});

export const getDashboardDemoData = () => ({
  entities: demoEntities.map((entity) => ({ ...entity, responsible: { ...entity.responsible } })),
  athletes: demoAthletes.map((athlete) => ({ ...athlete, modalities: [...athlete.modalities] })),
});

export const getEntityDashboardDemoAthletes = () => (
  demoAthletes
    .filter((athlete) => athlete.entityId === 'demo-entity-1')
    .map((athlete) => ({ ...athlete, modalities: [...athlete.modalities] }))
);
