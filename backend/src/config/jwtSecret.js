const secret = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production' && (!secret || Buffer.byteLength(secret) < 32)) {
  throw new Error('Configure um JWT_SECRET com pelo menos 32 bytes no ambiente de produção.');
}

module.exports = secret || 'local-development-only-secret';