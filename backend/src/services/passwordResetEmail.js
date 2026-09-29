const nodemailer = require('nodemailer');

const isEmailConfigured = () => Boolean(
  process.env.SMTP_HOST
  && process.env.SMTP_PORT
  && process.env.SMTP_USER
  && process.env.SMTP_PASS
  && process.env.SMTP_FROM
);

const assertEmailConfigured = () => {
  if (!isEmailConfigured()) {
    throw new Error('Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM para envio de e-mail.');
  }
};

const createTransport = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendPasswordResetEmail = async (email, resetUrl) => {
  assertEmailConfigured();
  const transport = createTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Redefinição de senha - JISPE 2026',
    text: `Recebemos uma solicitação para redefinir a senha da sua entidade. Acesse este link em até 30 minutos: ${resetUrl}\n\nSe você não solicitou a alteração, ignore esta mensagem.`,
    html: `<p>Recebemos uma solicitação para redefinir a senha da sua entidade.</p><p><a href="${resetUrl}">Definir nova senha</a></p><p>O link expira em 30 minutos. Se você não solicitou a alteração, ignore esta mensagem.</p>`,
  });
};

module.exports = { assertEmailConfigured, isEmailConfigured, sendPasswordResetEmail };