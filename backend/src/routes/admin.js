const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { auth } = require('../middlewares/auth');
const { adminEditorOnly, adminViewerOnly } = require('../middlewares/adminPermissions');
const Admin = require('../models/Admin');
const Entity = require('../models/Entity');
const Athlete = require('../models/Athlete');
const Registration = require('../models/Registration');
const Counter = require('../models/Counter');
const Modality = require('../models/Modality');
const RegistrationControls = require('../models/RegistrationControls');
const EntityModalityRule = require('../models/EntityModalityRule');
const PasswordChangeRequest = require('../models/PasswordChangeRequest');
const HomeContent = require('../models/HomeContent');
const { deleteReplacedAsset, getAssetUrl, isSameStoredAsset, storeAsset } = require('../services/r2Storage');
const { validateUploadedAsset } = require('../utils/uploadValidation');
const { getModalityCatalog } = require('../config/defaultModalities');
const { applyRegistrationDeadline } = require('../services/registrationWindow');
const { getRaceRegistrationCount, getRaceRegistrationLimit } = require('../services/raceRegistration');
const { getGlobalModalityLimit, getModalityRegistrationCounts } = require('../services/globalModalityRegistration');

const router = express.Router();

const getRegistrationControls = () => RegistrationControls.findOneAndUpdate(
  { _id: 'global' },
  { $setOnInsert: { entityRegistrationOpen: true, athleteRegistrationOpen: true, selfAthleteRegistrationOpen: true } },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);

const normalizeHomeContent = (body = {}) => ({
  news: Array.isArray(body.news) ? body.news.slice(0, 30).map((item) => ({
    _id: item?._id || new mongoose.Types.ObjectId(),
    title: String(item?.title || '').trim().slice(0, 160),
    type: ['Boletim', 'Informativa', 'Aviso', 'Comunicado', 'Outra'].includes(item?.type)
      ? item.type
      : 'Informativa',
    summary: String(item?.summary || '').trim().slice(0, 500),
    body: String(item?.body || '').trim().slice(0, 5000),
    link: String(item?.link || '').trim().slice(0, 2048),
    imageUrl: String(item?.imageUrl || '').trim(),
    documentId: String(item?.documentId || '').trim(),
    publishedAt: item?.publishedAt || new Date(),
  })) : null,
  documents: Array.isArray(body.documents) ? body.documents.slice(0, 30).map((item) => ({
    _id: item?._id || new mongoose.Types.ObjectId(),
    clientId: String(item?.clientId || '').trim(),
    title: String(item?.title || '').trim().slice(0, 160),
    description: String(item?.description || '').trim().slice(0, 500),
    fileUrl: String(item?.fileUrl || '').trim(),
    fileName: String(item?.fileName || '').trim().slice(0, 255),
  })) : null,
});

const serializeHomeContent = async (content) => {
  const result = content.toObject();
  result.news = await Promise.all(result.news.map(async (news) => {
    const item = news.toObject ? news.toObject() : news;
    item.imageUrl = await getAssetUrl(item.imageUrl);
    return item;
  }));
  result.documents = await Promise.all(result.documents.map(async (document) => {
    const item = document.toObject ? document.toObject() : document;
    item.fileUrl = await getAssetUrl(item.fileUrl, { download: true });
    return item;
  }));
  return result;
};

router.get('/home-content', auth, adminViewerOnly, async (req, res, next) => {
  try {
    const content = await HomeContent.findById('home')
      .select('news bulletins documents');
    const news = [
      ...(content?.news || []).map((item) => ({
        ...item.toObject(),
        type: item.type || 'Informativa',
      })),
      ...(content?.bulletins || []).map((item) => ({
        ...item.toObject(),
        type: 'Boletim',
      })),
    ].sort((first, second) => new Date(second.publishedAt) - new Date(first.publishedAt));
    const newsWithAssets = await Promise.all(news.map(async (item) => ({
      ...item,
      imageUrl: await getAssetUrl(item.imageUrl),
    })));
    res.json({ success: true, content: content
      ? {
        ...await serializeHomeContent(content),
        news: newsWithAssets,
      }
      : { news: [], documents: [] } });
  } catch (error) {
    next(error);
  }
});

router.put('/home-content', auth, adminEditorOnly, async (req, res, next) => {
  try {
    const content = normalizeHomeContent(req.body);
    if (!content.news || !content.documents
      || content.news.some((item) => !item.title)
      || content.documents.some((item) => !item.title || !item.fileUrl || !item.fileName)) {
      return res.status(400).json({ success: false, message: 'Revise os campos obrigatórios e tente novamente.' });
    }
    if (content.news.some((item) => {
      if (!item.link) return false;
      try {
        const url = new URL(item.link);
        return !['http:', 'https:'].includes(url.protocol);
      } catch (error) {
        return true;
      }
    })) {
      return res.status(400).json({ success: false, message: 'Os links das notícias precisam ser endereços HTTP ou HTTPS válidos.' });
    }

    const current = await HomeContent.findById('home');
    const previousNews = current?.news || [];
    const previousDocuments = current?.documents || [];
    const documentIds = new Set(content.documents.map((document) => String(document._id)));
    const documentIdByReference = new Map(content.documents.flatMap((document) => [
      [String(document._id), String(document._id)],
      ...(document.clientId ? [[document.clientId, String(document._id)]] : []),
    ]));
    for (const news of content.news) {
      if (!news.documentId) continue;
      const documentId = documentIdByReference.get(news.documentId);
      if (!documentId || !documentIds.has(documentId)) {
        return res.status(400).json({ success: false, message: 'A notícia está vinculada a um documento que não foi enviado.' });
      }
      news.documentId = documentId;
    }

    for (const document of content.documents) {
      const previous = previousDocuments.find((item) => document._id
        ? String(item._id) === String(document._id)
        : item.fileName === document.fileName);
      if (isSameStoredAsset(document.fileUrl, previous?.fileUrl || '')) continue;
      const assetError = validateUploadedAsset(document.fileUrl, 'proof');
      if (assetError) return res.status(400).json({ success: false, message: assetError });
    }

    for (const news of content.news) {
      if (!news.imageUrl) continue;
      const previous = previousNews.find((item) => String(item._id) === String(news._id));
      if (isSameStoredAsset(news.imageUrl, previous?.imageUrl || '')) continue;
      const assetError = validateUploadedAsset(news.imageUrl, 'photo');
      if (assetError) return res.status(400).json({ success: false, message: assetError });
    }

    content.news = await Promise.all(content.news.map(async (news) => {
      const previous = previousNews.find((item) => String(item._id) === String(news._id));
      return {
        ...news,
        imageUrl: news.imageUrl
          ? await storeAsset(news.imageUrl, `home/news/${news._id}`, previous?.imageUrl || '')
          : '',
      };
    }));

    content.documents = await Promise.all(content.documents.map(async (document) => {
      const previous = previousDocuments.find((item) => document._id
        ? String(item._id) === String(document._id)
        : item.fileName === document.fileName);
      return {
        _id: document._id,
        ...document,
        fileUrl: await storeAsset(document.fileUrl, 'home/documents', previous?.fileUrl || ''),
      };
    }));

    content.documents = content.documents.map(({ clientId, ...document }) => document);
    const saved = await HomeContent.findOneAndUpdate(
      { _id: 'home' },
      { $set: {
        news: content.news,
        bulletins: [],
        documents: content.documents,
      } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    const nextAssets = new Set(saved.documents.map((item) => item.fileUrl));
    const nextNewsAssets = new Set(saved.news.map((item) => item.imageUrl).filter(Boolean));
    await Promise.all(previousNews.map((news) => deleteReplacedAsset(
      news.imageUrl,
      nextNewsAssets.has(news.imageUrl) ? news.imageUrl : ''
    )));
    await Promise.all(previousDocuments.map((document) => deleteReplacedAsset(
      document.fileUrl,
      nextAssets.has(document.fileUrl) ? document.fileUrl : ''
    )));

    res.json({ success: true, content: await serializeHomeContent(saved) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', auth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      role: req.user.role,
      type: req.user.type,
    },
  });
});

router.get('/registration-controls', auth, adminViewerOnly, async (req, res, next) => {
  try {
    const controls = await getRegistrationControls();
    res.json({ success: true, controls: applyRegistrationDeadline(controls) });
  } catch (error) {
    next(error);
  }
});

router.patch('/registration-controls', auth, adminEditorOnly, async (req, res, next) => {
  try {
    const update = {};
    for (const field of ['entityRegistrationOpen', 'athleteRegistrationOpen', 'selfAthleteRegistrationOpen']) {
      if (typeof req.body[field] === 'boolean') update[field] = req.body[field];
    }
    if (!Object.keys(update).length) {
      return res.status(400).json({ success: false, message: 'Nenhuma trava válida foi informada.' });
    }

    const controls = await RegistrationControls.findOneAndUpdate(
      { _id: 'global' },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, controls: applyRegistrationDeadline(controls) });
  } catch (error) {
    next(error);
  }
});

router.get('/entities/:entityId/modality-rules', auth, adminViewerOnly, async (req, res, next) => {
  try {
    if (req.params.entityId === 'all') {
      const entities = await Entity.find({ status: 'approved' }).select('_id').lean();
      if (!entities.length) return res.status(404).json({ success: false, message: 'Nenhum órgão aprovado encontrado.' });

      const entityIds = entities.map((entity) => entity._id);
      const controls = await getRegistrationControls();
      const [raceRegistrationLimit, raceRegistrationCount] = await Promise.all([
        getRaceRegistrationLimit(controls),
        getRaceRegistrationCount(controls),
      ]);
      const [storedModalities, savedRules] = await Promise.all([
        Modality.find({ active: true }).lean(),
        EntityModalityRule.find({ entityId: { $in: entityIds } }).lean(),
      ]);
      const rulesByEntityAndSlug = new Map(savedRules.map((rule) => [`${rule.entityId}:${rule.modalitySlug}`, rule]));
      const modalities = getModalityCatalog(storedModalities);
      const modalityCounts = await Promise.all(modalities.map(getModalityRegistrationCounts));
      const rules = modalities.map((modality, index) => {
        const officialLimit = modality.maxTeamsPerEntity && modality.maxAthletesPerTeam
          ? modality.maxTeamsPerEntity * modality.maxAthletesPerTeam
          : null;
        const limits = entities.map((entity) => {
          const savedRule = rulesByEntityAndSlug.get(`${entity._id}:${modality.slug}`);
          return savedRule ? savedRule.maxAthletes : officialLimit;
        });
        const distinctLimits = new Set(limits.map((limit) => limit === null ? 'none' : String(limit)));

        return {
          modalitySlug: modality.slug,
          modalityName: modality.name,
          categories: modality.categories || [],
          registeredCount: modality.slug === 'corrida-5km'
            ? raceRegistrationCount
            : modalityCounts[index].registeredCount,
          pendingCount: modalityCounts[index].pendingCount,
          globalMaxAthletes: modality.slug === 'corrida-5km'
            ? raceRegistrationLimit
            : getGlobalModalityLimit(controls, modality.slug),
          maxAthletes: distinctLimits.size === 1 ? limits[0] : null,
          hasMixedMaxAthletes: distinctLimits.size > 1,
        };
      });

      return res.json({ success: true, entityCount: entities.length, raceRegistrationLimit, raceRegistrationCount, rules });
    }

    const entity = await Entity.findById(req.params.entityId).select('name status');
    if (!entity) return res.status(404).json({ success: false, message: 'Órgão não encontrado.' });

    const [storedModalities, savedRules, athletes] = await Promise.all([
      Modality.find({ active: true }).lean(),
      EntityModalityRule.find({ entityId: entity._id }).lean(),
      Athlete.find({ entityId: entity._id }).select('modality').lean(),
    ]);
    const rulesBySlug = new Map(savedRules.map((rule) => [rule.modalitySlug, rule]));
    const modalities = getModalityCatalog(storedModalities);
    const rules = modalities.map((modality) => {
      const aliases = [modality.name, modality.slug, ...(modality.legacyNames || []), ...(modality.legacySlugs || [])]
        .map((value) => String(value).trim().toLowerCase());
      const savedRule = rulesBySlug.get(modality.slug);
      const officialLimit = modality.maxTeamsPerEntity && modality.maxAthletesPerTeam
        ? modality.maxTeamsPerEntity * modality.maxAthletesPerTeam
        : null;

      return {
        modalitySlug: modality.slug,
        modalityName: modality.name,
        categories: modality.categories || [],
        enabled: savedRule?.enabled ?? true,
        maxAthletes: savedRule ? savedRule.maxAthletes : officialLimit,
        registeredCount: athletes.filter((athlete) => [athlete.modality, ...(athlete.modalities || [])]
          .some((name) => aliases.includes(String(name || '').trim().toLowerCase()))).length,
      };
    });

    res.json({ success: true, entity: { id: entity._id, name: entity.name, status: entity.status }, rules });
  } catch (error) {
    next(error);
  }
});

router.put('/entities/:entityId/modality-rules', auth, adminEditorOnly, async (req, res, next) => {
  try {
    if (req.params.entityId === 'all') {
      const entities = await Entity.find({ status: 'approved' }).select('_id').lean();
      if (!entities.length) return res.status(404).json({ success: false, message: 'Nenhum órgão aprovado encontrado.' });
      const hasRaceLimitUpdate = Object.prototype.hasOwnProperty.call(req.body, 'raceRegistrationLimit');
      const hasGlobalModalityLimitsUpdate = Object.prototype.hasOwnProperty.call(req.body, 'globalModalityLimits');
      if (req.body.rules !== undefined && !Array.isArray(req.body.rules)) {
        return res.status(400).json({ success: false, message: 'A lista de regras por modalidade é inválida.' });
      }
      if (hasGlobalModalityLimitsUpdate && !Array.isArray(req.body.globalModalityLimits)) {
        return res.status(400).json({ success: false, message: 'A lista de tetos globais por modalidade é inválida.' });
      }
      const hasRulesUpdate = Array.isArray(req.body.rules) && req.body.rules.length > 0;
      const hasGlobalLimits = hasGlobalModalityLimitsUpdate && req.body.globalModalityLimits.length > 0;
      if (!hasRulesUpdate && !hasRaceLimitUpdate && !hasGlobalLimits) {
        return res.status(400).json({ success: false, message: 'Informe limites de modalidade ou o teto geral da corrida.' });
      }

      const raceRegistrationLimit = hasRaceLimitUpdate ? Number(req.body.raceRegistrationLimit) : null;
      if (hasRaceLimitUpdate && (!Number.isInteger(raceRegistrationLimit) || raceRegistrationLimit < 1)) {
        return res.status(400).json({ success: false, message: 'O teto da corrida precisa ser um inteiro maior que zero.' });
      }

      const storedModalities = await Modality.find({ active: true }).lean();
      const catalog = getModalityCatalog(storedModalities);
      const catalogBySlug = new Map(catalog.map((modality) => [modality.slug, modality]));
      const bulkRules = [];
      const globalLimitUpdates = [];
      const seenGlobalLimitSlugs = new Set();

      for (const rule of req.body.globalModalityLimits || []) {
        const modality = catalogBySlug.get(rule.modalitySlug);
        if (!modality || modality.slug === 'corrida-5km' || seenGlobalLimitSlugs.has(modality.slug)) {
          return res.status(400).json({ success: false, message: 'Há um teto global de modalidade inválido.' });
        }

        const maxAthletes = rule.maxAthletes === '' || rule.maxAthletes === null || rule.maxAthletes === undefined
          ? null
          : Number(rule.maxAthletes);
        if (maxAthletes !== null && (!Number.isInteger(maxAthletes) || maxAthletes < 1)) {
          return res.status(400).json({ success: false, message: `O teto global de ${modality.name} precisa ser um inteiro maior que zero ou ficar vazio.` });
        }
        seenGlobalLimitSlugs.add(modality.slug);
        globalLimitUpdates.push({ modalitySlug: modality.slug, maxAthletes });
      }

      for (const rule of req.body.rules || []) {
        const modality = catalogBySlug.get(rule.modalitySlug);
        if (!modality) {
          return res.status(400).json({ success: false, message: 'Há uma regra de modalidade inválida.' });
        }

        const maxAthletes = rule.maxAthletes === '' || rule.maxAthletes === null || rule.maxAthletes === undefined
          ? null
          : Number(rule.maxAthletes);
        if (maxAthletes !== null && (!Number.isInteger(maxAthletes) || maxAthletes < 1)) {
          return res.status(400).json({ success: false, message: `O limite de ${modality.name} precisa ser um inteiro maior que zero ou ficar vazio.` });
        }
        bulkRules.push({ modalitySlug: modality.slug, maxAthletes });
      }

      const operations = entities.flatMap((entity) => bulkRules.map((rule) => ({
        updateOne: {
          filter: { entityId: entity._id, modalitySlug: rule.modalitySlug },
          update: { $set: { maxAthletes: rule.maxAthletes } },
          upsert: true,
        },
      })));
      const controls = globalLimitUpdates.length
        ? await getRegistrationControls()
        : null;
      const globalLimitsBySlug = new Map((controls?.globalModalityLimits || []).map((rule) => [rule.modalitySlug, rule.maxAthletes]));
      for (const rule of globalLimitUpdates) globalLimitsBySlug.set(rule.modalitySlug, rule.maxAthletes);
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          if (operations.length) await EntityModalityRule.bulkWrite(operations, { session });
          if (hasRaceLimitUpdate || globalLimitUpdates.length) {
            const controlsUpdate = {};
            if (hasRaceLimitUpdate) controlsUpdate.raceRegistrationLimit = raceRegistrationLimit;
            if (globalLimitUpdates.length) {
              controlsUpdate.globalModalityLimits = Array.from(globalLimitsBySlug, ([modalitySlug, maxAthletes]) => ({
                modalitySlug,
                maxAthletes,
              }));
            }
            await RegistrationControls.updateOne(
              { _id: 'global' },
              { $set: controlsUpdate },
              { upsert: true, session, setDefaultsOnInsert: true }
            );
          }
          if (globalLimitUpdates.length) {
            await Counter.deleteMany({
              _id: { $in: globalLimitUpdates.map((rule) => `global-modality:${rule.modalitySlug}`) },
            }, { session });
          }
        });
      } finally {
        await session.endSession();
      }
      return res.json({ success: true, message: 'Limites e tetos globais atualizados.' });
    }

    const entity = await Entity.findById(req.params.entityId).select('_id');
    if (!entity) return res.status(404).json({ success: false, message: 'Órgão não encontrado.' });
    if (!Array.isArray(req.body.rules)) {
      return res.status(400).json({ success: false, message: 'Informe a lista de regras por modalidade.' });
    }

    const storedModalities = await Modality.find({ active: true }).lean();
    const catalog = getModalityCatalog(storedModalities);
    const catalogBySlug = new Map(catalog.map((modality) => [modality.slug, modality]));
    const operations = [];

    for (const rule of req.body.rules) {
      const modality = catalogBySlug.get(rule.modalitySlug);
      if (!modality || typeof rule.enabled !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Há uma regra de modalidade inválida.' });
      }

      const maxAthletes = rule.maxAthletes === '' || rule.maxAthletes === null || rule.maxAthletes === undefined
        ? null
        : Number(rule.maxAthletes);
      if (maxAthletes !== null && (!Number.isInteger(maxAthletes) || maxAthletes < 1)) {
        return res.status(400).json({ success: false, message: `O limite de ${modality.name} precisa ser um inteiro maior que zero ou ficar vazio.` });
      }

      operations.push({
        updateOne: {
          filter: { entityId: entity._id, modalitySlug: modality.slug },
          update: { $set: { enabled: rule.enabled, maxAthletes } },
          upsert: true,
        },
      });
    }

    if (operations.length) await EntityModalityRule.bulkWrite(operations);
    res.json({ success: true, message: 'Limites de modalidade atualizados.' });
  } catch (error) {
    next(error);
  }
});

router.patch('/entities/:entityId/password', auth, adminEditorOnly, async (req, res, next) => {
  try {
    const password = req.body?.password;
    const passwordConfirmation = req.body?.passwordConfirmation;
    if (typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({ success: false, message: 'A senha precisa ter pelo menos 12 caracteres.' });
    }
    if (password !== passwordConfirmation) {
      return res.status(400).json({ success: false, message: 'As senhas informadas não coincidem.' });
    }

    const entity = await Entity.findById(req.params.entityId)
      .select('+password +sessionVersion +passwordResetTokenHash +passwordResetExpiresAt');
    if (!entity) return res.status(404).json({ success: false, message: 'Órgão não encontrado.' });
    if (await bcrypt.compare(password, entity.password)) {
      return res.status(400).json({ success: false, message: 'A nova senha deve ser diferente da senha atual.' });
    }

    entity.password = await bcrypt.hash(password, 12);
    entity.sessionVersion = (entity.sessionVersion || 0) + 1;
    entity.passwordResetTokenHash = undefined;
    entity.passwordResetExpiresAt = undefined;
    await entity.save();
    await PasswordChangeRequest.findOneAndUpdate(
      { entityId: entity._id, status: 'pending' },
      { $set: { status: 'completed', resolvedAt: new Date(), resolvedBy: req.user.id } }
    );

    res.json({ success: true, message: 'Senha do órgão alterada. As sessões anteriores foram encerradas.' });
  } catch (error) {
    next(error);
  }
});

router.get('/password-change-requests', auth, adminEditorOnly, async (req, res, next) => {
  try {
    const [pendingRequests, completedRequests] = await Promise.all([
      PasswordChangeRequest.find({ status: 'pending' }).sort({ requestedAt: -1 }),
      PasswordChangeRequest.find({ status: 'completed' }).sort({ requestedAt: -1 }).limit(30),
    ]);
    const requests = await PasswordChangeRequest.populate(
      [...pendingRequests, ...completedRequests].sort((first, second) => second.requestedAt - first.requestedAt),
      [
        { path: 'entityId', select: 'name email' },
        { path: 'resolvedBy', select: 'name' },
      ]
    );
    res.json({
      success: true,
      requests: requests.map((request) => ({
        id: request._id,
        status: request.status,
        requestedAt: request.requestedAt,
        resolvedAt: request.resolvedAt,
        resolvedBy: request.resolvedBy?.name || '',
        entity: request.entityId
          ? { id: request.entityId._id, name: request.entityId.name, email: request.entityId.email }
          : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/password-change-requests/:requestId/complete', auth, adminEditorOnly, async (req, res, next) => {
  try {
    const password = req.body?.password;
    const passwordConfirmation = req.body?.passwordConfirmation;
    if (typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({ success: false, message: 'A senha precisa ter pelo menos 12 caracteres.' });
    }
    if (password !== passwordConfirmation) {
      return res.status(400).json({ success: false, message: 'As senhas informadas não coincidem.' });
    }

    const request = await PasswordChangeRequest.findOne({
      _id: req.params.requestId,
      status: 'pending',
    });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Solicitação pendente não encontrada.' });
    }

    const entity = await Entity.findById(request.entityId)
      .select('+password +sessionVersion +passwordResetTokenHash +passwordResetExpiresAt');
    if (!entity) {
      return res.status(404).json({ success: false, message: 'O órgão desta solicitação não foi encontrado.' });
    }
    if (await bcrypt.compare(password, entity.password)) {
      return res.status(400).json({ success: false, message: 'A nova senha deve ser diferente da senha atual.' });
    }

    entity.password = await bcrypt.hash(password, 12);
    entity.sessionVersion = (entity.sessionVersion || 0) + 1;
    entity.passwordResetTokenHash = undefined;
    entity.passwordResetExpiresAt = undefined;
    await entity.save();

    request.status = 'completed';
    request.resolvedAt = new Date();
    request.resolvedBy = req.user.id;
    await request.save();

    res.json({ success: true, message: 'Senha trocada. As sessões anteriores do órgão foram encerradas.' });
  } catch (error) {
    next(error);
  }
});

router.get('/managers', auth, adminEditorOnly, async (req, res, next) => {
  try {
    const managers = await Admin.find({ role: 'gerencia' }).select('name email role createdAt').sort({ name: 1 }).lean();
    res.json({ success: true, managers });
  } catch (error) {
    next(error);
  }
});

router.post('/managers', auth, adminEditorOnly, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password;
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({ success: false, message: 'Informe nome, e-mail válido e senha com pelo menos 12 caracteres.' });
    }

    const [existingAdmin, existingEntity] = await Promise.all([
      Admin.exists({ email }),
      Entity.exists({ email }),
    ]);
    if (existingAdmin || existingEntity) {
      return res.status(409).json({ success: false, message: 'Já existe uma conta com esse e-mail.' });
    }

    const manager = await Admin.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role: 'gerencia',
    });
    res.status(201).json({
      success: true,
      manager: { _id: manager._id, name: manager.name, email: manager.email, role: manager.role, createdAt: manager.createdAt },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/managers/:id', auth, adminEditorOnly, async (req, res, next) => {
  try {
    const manager = await Admin.findOneAndDelete({ _id: req.params.id, role: 'gerencia' });
    if (!manager) return res.status(404).json({ success: false, message: 'Conta de Gerência não encontrada.' });
    res.json({ success: true, message: 'Conta de Gerência removida.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
