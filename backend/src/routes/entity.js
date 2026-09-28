const express = require('express');
const bcrypt = require('bcryptjs');
const Entity = require('../models/Entity');
const Athlete = require('../models/Athlete');
const { auth } = require('../middlewares/auth');
const { isValidCPF } = require('../utils/cpfValidator');

const router = express.Router();

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
    },
  };
};

router.post('/register', async (req, res, next) => {
  try {
    const payload = normalizeEntityPayload(req.body);

    if (!payload.name || !payload.email || !payload.password || !payload.phone || !payload.responsible.fullName || !payload.responsible.cpf || !payload.responsible.email) {
      return res.status(400).json({ success: false, message: 'Dados obrigatórios não informados' });
    }

    if (!isValidCPF(payload.responsible.cpf)) {
      return res.status(400).json({ success: false, message: 'CPF do responsável é inválido' });
    }

    const exists = await Entity.findOne({ email: payload.email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'E-mail já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(payload.password, 12);
    const entity = await Entity.create({
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      phone: payload.phone,
      responsible: payload.responsible,
      status: 'pending',
    });

    res.status(201).json({ success: true, entity: { id: entity._id, name: entity.name, status: entity.status } });
  } catch (error) {
    next(error);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador' });
    }

    const payload = normalizeEntityPayload(req.body);

    if (!payload.name || !payload.email || !payload.password || !payload.phone || !payload.responsible.fullName || !payload.responsible.cpf || !payload.responsible.email) {
      return res.status(400).json({ success: false, message: 'Dados obrigatórios não informados' });
    }

    if (!isValidCPF(payload.responsible.cpf)) {
      return res.status(400).json({ success: false, message: 'CPF do responsável é inválido' });
    }

    const exists = await Entity.findOne({ email: payload.email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'E-mail já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(payload.password, 12);
    const entity = await Entity.create({
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      phone: payload.phone,
      responsible: payload.responsible,
      status: req.body.status === 'pending' ? 'pending' : 'approved',
    });

    res.status(201).json({ success: true, entity: { id: entity._id, name: entity.name, email: entity.email, status: entity.status } });
  } catch (error) {
    next(error);
  }
});

router.get('/', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador' });
    }

    const entities = await Entity.find().sort({ createdAt: -1 });
    res.json({ success: true, entities });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador' });
    }

    const entity = await Entity.findById(req.params.id);
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entidade não encontrada' });
    }

    res.json({ success: true, entity });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador' });
    }

    const payload = normalizeEntityPayload(req.body);

    if (!payload.name || !payload.email || !payload.phone || !payload.responsible.fullName || !payload.responsible.cpf || !payload.responsible.email || !payload.responsible.photoUrl || !payload.responsible.proofUrl) {
      return res.status(400).json({ success: false, message: 'Dados obrigatórios não informados' });
    }

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
      responsible: payload.responsible,
    };

    if (payload.password) {
      updateData.password = await bcrypt.hash(payload.password, 12);
    }

    const entity = await Entity.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entidade não encontrada' });
    }

    res.json({ success: true, entity });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador' });
    }

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

    res.json({ success: true, message: 'Entidade excluída com sucesso' });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/approve', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador' });
    }

    const entity = await Entity.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entidade não encontrada' });
    }

    res.json({ success: true, entity });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/reject', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador' });
    }

    const entity = await Entity.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entidade não encontrada' });
    }

    res.json({ success: true, entity });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
