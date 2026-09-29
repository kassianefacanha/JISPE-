const jwt = require('jsonwebtoken');
const Entity = require('../models/Entity');
const jwtSecret = require('../config/jwtSecret');

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token de acesso ausente ou inválido' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
  }

  if (decoded.type === 'entity') {
    try {
      const entity = await Entity.findById(decoded.id).select('status').lean();
      if (!entity || entity.status !== 'approved') {
        return res.status(403).json({ success: false, message: 'Acesso da entidade não está aprovado.' });
      }
    } catch (error) {
      return next(error);
    }
  }

  req.user = decoded;
  return next();
};

module.exports = { auth };
