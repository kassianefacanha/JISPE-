const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Entity = require('../models/Entity');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'E-mail e senha são obrigatórios' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (admin && (await bcrypt.compare(password, admin.password))) {
      const token = jwt.sign({ id: admin._id, role: admin.role, type: 'admin' }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '7d' });
      return res.json({ success: true, token, user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
    }

    const entity = await Entity.findOne({ email: email.toLowerCase() });
    if (entity && (await bcrypt.compare(password, entity.password))) {
      if (entity.status !== 'approved') {
        return res.status(403).json({ success: false, message: 'Entidade ainda não foi aprovada' });
      }

      const token = jwt.sign({ id: entity._id, role: 'entity', type: 'entity' }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '7d' });
      return res.json({ success: true, token, user: { id: entity._id, name: entity.name, email: entity.email, role: 'entity', status: entity.status } });
    }

    return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
