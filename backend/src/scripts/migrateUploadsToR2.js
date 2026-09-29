require('dotenv').config();

const mongoose = require('mongoose');
const Athlete = require('../models/Athlete');
const Entity = require('../models/Entity');
const { assertConfigured, storeAsset } = require('../services/r2Storage');

const applyChanges = process.env.R2_MIGRATION_APPLY === 'true';
const isInlineFile = (value) => typeof value === 'string' && value.startsWith('data:');

const migrateField = async (document, field, prefix) => {
  const value = document.get(field);
  if (!isInlineFile(value)) return false;

  const objectReference = await storeAsset(value, prefix);
  document.set(field, objectReference);
  await document.save();
  return true;
};

const migrateCollection = async (Model, fields, collectionName) => {
  let scanned = 0;
  let migrated = 0;
  const failures = [];

  for await (const document of Model.find({}).cursor()) {
    scanned += 1;
    for (const { field, prefix } of fields(document)) {
      const value = document.get(field);
      if (!isInlineFile(value)) continue;

      if (applyChanges) {
        try {
          if (await migrateField(document, field, prefix(document))) migrated += 1;
        } catch (error) {
          failures.push({ id: String(document._id), field });
        }
      } else {
        migrated += 1;
      }
    }
  }

  console.log(`${collectionName}: ${scanned} registros verificados; ${migrated} arquivo(s) ${applyChanges ? 'migrado(s)' : 'pronto(s) para migrar'}.`);
  failures.forEach(({ id, field }) => console.error(`${collectionName}: falha no registro ${id}, campo ${field}; arquivo original mantido.`));
  return failures.length;
};

const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error('Defina MONGODB_URI para a base que será migrada.');
  if (applyChanges) assertConfigured();
  if (applyChanges && process.env.R2_MIGRATION_CONFIRM !== 'I_UNDERSTAND') {
    throw new Error('Defina R2_MIGRATION_CONFIRM=I_UNDERSTAND somente após gerar backup do MongoDB.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(applyChanges ? 'Migração R2 iniciada.' : 'Simulação: nenhum dado será alterado.');

  let failures = await migrateCollection(
    Athlete,
    (athlete) => [
      { field: 'photoUrl', prefix: (item) => `athletes/${item._id}/photo` },
      { field: 'proofUrl', prefix: (item) => `athletes/${item._id}/proof` },
    ],
    'Atletas'
  );
  failures += await migrateCollection(
    Entity,
    (entity) => [
      { field: 'responsible.photoUrl', prefix: (item) => `entities/${item._id}/responsible/photo` },
      { field: 'responsible.proofUrl', prefix: (item) => `entities/${item._id}/responsible/proof` },
    ],
    'Entidades'
  );
  if (failures) throw new Error(`${failures} arquivo(s) não foram migrados; os originais continuam no MongoDB.`);
};

run()
  .catch((error) => {
    console.error(error.message || 'Falha na migração para R2.');
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });