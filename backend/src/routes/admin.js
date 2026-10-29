const express = require('express');
const bcrypt = require('bcryptjs');
const { auth } = require('../middlewares/auth');
const { adminEditorOnly, adminViewerOnly } = require('../middlewares/adminPermissions');
const Admin = require('../models/Admin');
const Entity = require('../models/Entity');
const Athlete = require('../models/Athlete');
const Modality = require('../models/Modality');
const RegistrationControls = require('../models/RegistrationControls');
const EntityModalityRule = require('../models/EntityModalityRule');
const PasswordChangeRequest = require('../models/PasswordChangeRequest');
const { getModalityCatalog } = require('../config/defaultModalities');

const router = express.Router();

const getRegistrationControls = () => RegistrationControls.findOneAndUpdate(
  { _id: 'global' },
  { $setOnInsert: { entityRegistrationOpen: true, athleteRegistrationOpen: true, selfAthleteRegistrationOpen: true } },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);

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
    res.json({ success: true, controls });
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
    res.json({ success: true, controls });
  } catch (error) {
    next(error);
  }
});

router.get('/entities/:entityId/modality-rules', auth, adminViewerOnly, async (req, res, next) => {
  try {
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
