const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/Admin');
const Entity = require('../models/Entity');
const jwtSecret = require('../config/jwtSecret');

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas tentativas de acesso. Tente novamente em 15 minutos.' },
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'E-mail e senha são obrigatórios' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (admin && (await bcrypt.compare(password, admin.password))) {
      const token = jwt.sign({ id: admin._id, role: admin.role, type: 'admin' }, jwtSecret, { expiresIn: '7d' });
      return res.json({ success: true, token, user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
    }

    const entity = await Entity.findOne({ email: email.toLowerCase() }).select('+password');
    if (entity && (await bcrypt.compare(password, entity.password))) {
      if (entity.status !== 'approved') {
        return res.status(403).json({ success: false, message: 'Entidade ainda não foi aprovada' });
      }

      const token = jwt.sign({ id: entity._id, role: 'entity', type: 'entity' }, jwtSecret, { expiresIn: '7d' });
      return res.json({ success: true, token, user: { id: entity._id, name: entity.name, email: entity.email, role: 'entity', status: entity.status } });
    }

    return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
