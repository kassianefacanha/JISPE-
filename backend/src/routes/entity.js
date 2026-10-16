const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const Entity = require('../models/Entity');
const Athlete = require('../models/Athlete');
const RegistrationControls = require('../models/RegistrationControls');
const { auth } = require('../middlewares/auth');
const { adminEditorOnly, adminViewerOnly } = require('../middlewares/adminPermissions');
const { isValidCPF } = require('../utils/cpfValidator');
const { validateUploadedAsset } = require('../utils/uploadValidation');
const { deleteAsset, deleteReplacedAsset, getAssetUrl, isSameStoredAsset, storeAsset } = require('../services/r2Storage');
const { sendEntityDecisionEmail, sendEntityRegistrationEmail } = require('../services/passwordResetEmail');

const router = express.Router();
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas tentativas de cadastro. Tente novamente em 15 minutos.' },
});

const serializeEntity = async (entity) => {
  const payload = entity.toObject();
  delete payload.password;
  payload.responsible.photoUrl = await getAssetUrl(payload.responsible.photoUrl);
  payload.responsible.proofUrl = await getAssetUrl(payload.responsible.proofUrl, { download: true });
  payload.responsible.affiliationProofUrl = await getAssetUrl(payload.responsible.affiliationProofUrl, { download: true });
  return payload;
};

const normalizeEntityPayload = (payload = {}) => {
  const { name, email, password, phone, responsible } = payload;

  return {
    name: String(name || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    password: String(password || ''),
    phone: String(phone || '').trim(),
    responsible: {
      fullName: String(responsible?.fullName || '').trim(),
      cpf: String(responsible?.cpf || '').trim(),
      email: String(responsible?.email || '').trim().toLowerCase(),
      photoUrl: String(responsible?.photoUrl || '').trim(),
      proofUrl: String(responsible?.proofUrl || '').trim(),
      affiliationProofUrl: String(responsible?.affiliationProofUrl || '').trim(),
    },
  };
};

router.post('/register', registrationLimiter, async (req, res, next) => {
  try {
    const controls = await RegistrationControls.findById('global').lean();
    if (controls?.entityRegistrationOpen === false) {
      return res.status(403).json({ success: false, message: 'O cadastro de novas entidades está temporariamente fechado.' });
    }

    const payload = normalizeEntityPayload(req.body);

    if (!payload.name || !payload.email || !payload.password || !payload.phone || !payload.responsible.fullName || !payload.responsible.cpf || !payload.responsible.email || !payload.responsible.photoUrl || !payload.responsible.proofUrl || !payload.responsible.affiliationProofUrl) {
      return res.status(400).json({ success: false, message: 'Informe todos os dados e envie a foto, o documento e o comprovante de vínculo do responsável.' });
    }

    const assetError = validateUploadedAsset(payload.responsible.photoUrl, 'photo')
      || validateUploadedAsset(payload.responsible.proofUrl, 'proof')
      || validateUploadedAsset(payload.responsible.affiliationProofUrl, 'proof');
    if (assetError) return res.status(400).json({ success: false, message: assetError });

    if (!isValidCPF(payload.responsible.cpf)) {
      return res.status(400).json({ success: false, message: 'CPF do responsável é inválido' });
    }

    const exists = await Entity.findOne({ email: payload.email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'E-mail já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(payload.password, 12);
    const entity = new Entity({
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      phone: payload.phone,
      responsible: payload.responsible,
      status: 'pending',
    });
    entity.responsible.photoUrl = await storeAsset(payload.responsible.photoUrl, `entities/${entity._id}/responsible/photo`);
    entity.responsible.proofUrl = await storeAsset(payload.responsible.proofUrl, `entities/${entity._id}/responsible/proof`);
    entity.responsible.affiliationProofUrl = await storeAsset(payload.responsible.affiliationProofUrl, `entities/${entity._id}/responsible/affiliation-proof`);
    await entity.save();

    void sendEntityRegistrationEmail(entity);
    res.status(201).json({ success: true, entity: { id: entity._id, name: entity.name, status: entity.status } });
  } catch (error) {
    next(error);
  }
});

router.post('/', auth, adminEditorOnly, async (req, res, next) => {
  try {
    const payload = normalizeEntityPayload(req.body);

    if (!payload.name || !payload.email || !payload.password || !payload.phone || !payload.responsible.fullName || !payload.responsible.cpf || !payload.responsible.email || !payload.responsible.affiliationProofUrl) {
      return res.status(400).json({ success: false, message: 'Dados obrigatórios não informados' });
    }

    const assetError = (payload.responsible.photoUrl && validateUploadedAsset(payload.responsible.photoUrl, 'photo'))
      || (payload.responsible.proofUrl && validateUploadedAsset(payload.responsible.proofUrl, 'proof'))
      || validateUploadedAsset(payload.responsible.affiliationProofUrl, 'proof');
    if (assetError) return res.status(400).json({ success: false, message: assetError });

    if (!isValidCPF(payload.responsible.cpf)) {
      return res.status(400).json({ success: false, message: 'CPF do responsável é inválido' });
    }

    const exists = await Entity.findOne({ email: payload.email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'E-mail já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(payload.password, 12);
    const entity = new Entity({
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      phone: payload.phone,
      responsible: payload.responsible,
      status: req.body.status === 'pending' ? 'pending' : 'approved',
    });
    if (payload.responsible.photoUrl) {
      entity.responsible.photoUrl = await storeAsset(payload.responsible.photoUrl, `entities/${entity._id}/responsible/photo`);
    }
    if (payload.responsible.proofUrl) {
      entity.responsible.proofUrl = await storeAsset(payload.responsible.proofUrl, `entities/${entity._id}/responsible/proof`);
    }
    entity.responsible.affiliationProofUrl = await storeAsset(payload.responsible.affiliationProofUrl, `entities/${entity._id}/responsible/affiliation-proof`);
    await entity.save();

    res.status(201).json({ success: true, entity: await serializeEntity(entity) });
  } catch (error) {
    next(error);
  }
});

router.get('/', auth, adminViewerOnly, async (req, res, next) => {
  try {
    const entities = await Entity.find().sort({ createdAt: -1 });
    res.json({ success: true, entities: await Promise.all(entities.map(serializeEntity)) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', auth, adminViewerOnly, async (req, res, next) => {
  try {
    const entity = await Entity.findById(req.params.id);
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entidade não encontrada' });
    }

    res.json({ success: true, entity: await serializeEntity(entity) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', auth, adminEditorOnly, async (req, res, next) => {
  try {
    const currentEntity = await Entity.findById(req.params.id);
    if (!currentEntity) {
      return res.status(404).json({ success: false, message: 'Entidade não encontrada' });
    }

    const payload = normalizeEntityPayload(req.body);

    if (!payload.name || !payload.email || !payload.phone || !payload.responsible.fullName || !payload.responsible.cpf || !payload.responsible.email || !payload.responsible.photoUrl || !payload.responsible.proofUrl || !payload.responsible.affiliationProofUrl) {
      return res.status(400).json({ success: false, message: 'Dados obrigatórios não informados' });
    }

    const assetError = (!isSameStoredAsset(payload.responsible.photoUrl, currentEntity.responsible.photoUrl)
      && validateUploadedAsset(payload.responsible.photoUrl, 'photo'))
      || (!isSameStoredAsset(payload.responsible.proofUrl, currentEntity.responsible.proofUrl)
        && validateUploadedAsset(payload.responsible.proofUrl, 'proof'))
      || (!isSameStoredAsset(payload.responsible.affiliationProofUrl, currentEntity.responsible.affiliationProofUrl)
        && validateUploadedAsset(payload.responsible.affiliationProofUrl, 'proof'));
    if (assetError) return res.status(400).json({ success: false, message: assetError });

    if (!isValidCPF(payload.responsible.cpf)) {
      return res.status(400).json({ success: false, message: 'CPF do responsável é inválido' });
    }

    const existing = await Entity.findOne({ email: payload.email, _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'E-mail já cadastrado' });
    }

    const updateData = {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      responsible: {
        ...payload.responsible,
        photoUrl: await storeAsset(payload.responsible.photoUrl, `entities/${currentEntity._id}/responsible/photo`, currentEntity.responsible.photoUrl),
        proofUrl: await storeAsset(payload.responsible.proofUrl, `entities/${currentEntity._id}/responsible/proof`, currentEntity.responsible.proofUrl),
        affiliationProofUrl: await storeAsset(payload.responsible.affiliationProofUrl, `entities/${currentEntity._id}/responsible/affiliation-proof`, currentEntity.responsible.affiliationProofUrl),
      },
    };

    if (payload.password) {
      updateData.password = await bcrypt.hash(payload.password, 12);
    }

    const entity = await Entity.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entidade não encontrada' });
    }

    await Promise.all([
      deleteReplacedAsset(currentEntity.responsible.photoUrl, entity.responsible.photoUrl),
      deleteReplacedAsset(currentEntity.responsible.proofUrl, entity.responsible.proofUrl),
      deleteReplacedAsset(currentEntity.responsible.affiliationProofUrl, entity.responsible.affiliationProofUrl),
    ]);
    res.json({ success: true, entity: await serializeEntity(entity) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', auth, adminEditorOnly, async (req, res, next) => {
  try {
    const associatedAthletes = await Athlete.find({ entityId: req.params.id }).select('fullName');
    if (associatedAthletes.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir esta entidade porque ela possui atletas associados.',
        athletes: associatedAthletes.map((athlete) => athlete.fullName),
      });
    }

    const entity = await Entity.findByIdAndDelete(req.params.id);
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entidade não encontrada' });
    }

    await Promise.all([
      deleteAsset(entity.responsible.photoUrl),
      deleteAsset(entity.responsible.proofUrl),
      deleteAsset(entity.responsible.affiliationProofUrl),
    ]);
    res.json({ success: true, message: 'Entidade excluída com sucesso' });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/approve', auth, adminEditorOnly, async (req, res, next) => {
  try {
    const entity = await Entity.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entidade não encontrada' });
    }

    void sendEntityDecisionEmail(entity, 'approved');
    res.json({ success: true, emailStatus: 'pending', entity: await serializeEntity(entity) });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/reject', auth, adminEditorOnly, async (req, res, next) => {
  try {
    const entity = await Entity.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entidade não encontrada' });
    }

    void sendEntityDecisionEmail(entity, 'rejected');
    res.json({ success: true, emailStatus: 'pending', entity: await serializeEntity(entity) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
