const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/Admin');
const Entity = require('../models/Entity');
const jwtSecret = require('../config/jwtSecret');
const { auth } = require('../middlewares/auth');
const { sendPasswordResetEmail } = require('../services/passwordResetEmail');

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas tentativas de acesso. Tente novamente em 15 minutos.' },
});
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas solicitações. Tente novamente mais tarde.' },
});
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas tentativas. Tente novamente mais tarde.' },
});

const genericRecoveryMessage = 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.';
const validateNewPassword = (password) => typeof password === 'string' && password.length >= 12;

router.post('/forgot-password', forgotPasswordLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const entity = await Entity.findOne({ email }).select('+passwordResetTokenHash +passwordResetExpiresAt');
      if (entity) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        entity.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        entity.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
        await entity.save();

        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '');
        const resetUrl = new URL('/reset-password', frontendUrl);
        resetUrl.searchParams.set('token', rawToken);
        try {
          await sendPasswordResetEmail(email, resetUrl.toString());
        } catch (emailError) {
          console.error(`Password reset email delivery failed: ${emailError.name || 'error'}`);
          entity.passwordResetTokenHash = undefined;
          entity.passwordResetExpiresAt = undefined;
          await entity.save();
        }
      }
    }

    return res.status(202).json({ success: true, message: genericRecoveryMessage });
  } catch (error) {
    return next(error);
  }
});

router.post('/reset-password', resetPasswordLimiter, async (req, res, next) => {
  try {
    const token = String(req.body?.token || '');
    const password = req.body?.password;
    if (!/^[a-f0-9]{64}$/i.test(token) || !validateNewPassword(password)) {
      return res.status(400).json({ success: false, message: 'Link inválido ou expirado. Solicite uma nova redefinição.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const entity = await Entity.findOneAndUpdate(
      {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      },
      {
        $set: { password: await bcrypt.hash(password, 12) },
        $inc: { sessionVersion: 1 },
        $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
      },
      { new: true, runValidators: true }
    );

    if (!entity) {
      return res.status(400).json({ success: false, message: 'Link inválido ou expirado. Solicite uma nova redefinição.' });
    }

    return res.json({ success: true, message: 'Senha alterada. Entre novamente com a nova senha.' });
  } catch (error) {
    return next(error);
  }
});

router.put('/password', auth, resetPasswordLimiter, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !validateNewPassword(newPassword)) {
      return res.status(400).json({ success: false, message: 'Informe a senha atual e uma nova senha com pelo menos 12 caracteres.' });
    }

    const Account = req.user.type === 'entity' ? Entity : req.user.type === 'admin' ? Admin : null;
    if (!Account) return res.status(403).json({ success: false, message: 'Tipo de conta não permitido.' });
    const account = await Account.findById(req.user.id).select('+password +sessionVersion');
    if (!account) return res.status(401).json({ success: false, message: 'Sessão inválida. Entre novamente.' });
    if (!(await bcrypt.compare(currentPassword, account.password))) {
      return res.status(400).json({ success: false, message: 'A senha atual está incorreta.' });
    }
    if (await bcrypt.compare(newPassword, account.password)) {
      return res.status(400).json({ success: false, message: 'A nova senha deve ser diferente da senha atual.' });
    }

    account.password = await bcrypt.hash(newPassword, 12);
    account.sessionVersion = (account.sessionVersion || 0) + 1;
    await account.save();

    return res.json({ success: true, message: 'Senha alterada. Entre novamente com a nova senha.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'E-mail e senha são obrigatórios' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password +sessionVersion');
    if (admin && (await bcrypt.compare(password, admin.password))) {
      const token = jwt.sign({ id: admin._id, role: admin.role, type: 'admin', sessionVersion: admin.sessionVersion || 0 }, jwtSecret, { expiresIn: '7d' });
      return res.json({ success: true, token, user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
    }

    const entity = await Entity.findOne({ email: email.toLowerCase() }).select('+password +sessionVersion');
    if (entity && (await bcrypt.compare(password, entity.password))) {
      if (entity.status !== 'approved') {
        return res.status(403).json({ success: false, message: 'Entidade ainda não foi aprovada' });
      }

      const token = jwt.sign({ id: entity._id, role: 'entity', type: 'entity', sessionVersion: entity.sessionVersion || 0 }, jwtSecret, { expiresIn: '7d' });
      return res.json({ success: true, token, user: { id: entity._id, name: entity.name, email: entity.email, role: 'entity', status: entity.status } });
    }

    return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
