const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const getAdminCredentials = (env = process.env) => {
  const name = String(env.ADMIN_NAME || '').trim();
  const email = String(env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(env.ADMIN_PASSWORD || '');

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 16) {
    throw new Error('Para criar o primeiro admin, configure ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 16 caracteres).');
  }

  return { name, email, password };
};

const ensureInitialAdmin = async ({ AdminModel = Admin, env = process.env } = {}) => {
  if (await AdminModel.exists({})) return false;

  const credentials = getAdminCredentials(env);
  try {
    await AdminModel.create({
      name: credentials.name,
      email: credentials.email,
      password: await bcrypt.hash(credentials.password, 12),
      role: 'admin',
    });
    return true;
  } catch (error) {
    if (error.code === 11000 && await AdminModel.exists({})) return false;
    throw error;
  }
};

module.exports = { ensureInitialAdmin, getAdminCredentials };
