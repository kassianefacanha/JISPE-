const jwt = require('jsonwebtoken');
const Entity = require('../models/Entity');
const Admin = require('../models/Admin');
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

  const Account = decoded.type === 'entity' ? Entity : decoded.type === 'admin' ? Admin : null;
  if (!Account) return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });

  try {
    const account = await Account.findById(decoded.id).select('status +sessionVersion').lean();
    if (!account) return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
    if (decoded.type === 'entity' && account.status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Acesso da entidade não está aprovado.' });
    }
    if (Number(decoded.sessionVersion || 0) !== Number(account.sessionVersion || 0)) {
      return res.status(401).json({ success: false, message: 'Sessão expirada. Entre novamente.' });
    }
  } catch (error) {
    return next(error);
  }

  req.user = decoded;
  return next();
};

module.exports = { auth };
