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
  family: 4,
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  socketTimeout: 20_000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

const sendEmail = async ({ to, subject, text, html }) => {
  assertEmailConfigured();
  const transport = createTransport();
  try {
    await transport.sendMail({ from: process.env.SMTP_FROM, to, subject, text, html });
  } finally {
    transport.close();
  }
};

const sendNotification = async (eventName, message) => {
  try {
    await sendEmail(message);
    return true;
  } catch (error) {
    console.error(`Transactional email failed (${eventName}):`, {
      name: error.name || 'Error',
      code: error.code || 'UNKNOWN',
      responseCode: error.responseCode,
      command: error.command,
      message: error.message,
    });
    return false;
  }
};

const sendPasswordResetEmail = (email, resetUrl) => sendNotification('password-reset', {
  to: email,
  subject: 'Solicitação de redefinição de senha | JISPE 2026',
  text: `Prezada entidade,\n\nRecebemos uma solicitação para redefinir a senha de acesso ao sistema JISPE 2026. Para cadastrar uma nova senha, acesse o link abaixo em até 30 minutos:\n\n${resetUrl}\n\nSe não reconhece esta solicitação, desconsidere esta mensagem. Por segurança, nunca informe sua senha por e-mail.\n\nAtenciosamente,\nEquipe JISPE 2026`,
  html: `<p>Prezada entidade,</p><p>Recebemos uma solicitação para redefinir a senha de acesso ao sistema JISPE 2026.</p><p>Para cadastrar uma nova senha, acesse o link abaixo em até 30 minutos:</p><p><a href="${escapeHtml(resetUrl)}">Redefinir senha</a></p><p>Se não reconhece esta solicitação, desconsidere esta mensagem. Por segurança, nunca informe sua senha por e-mail.</p><p>Atenciosamente,<br>Equipe JISPE 2026</p>`,
});

const sendEntityRegistrationEmail = (entity) => sendNotification('entity-registration', {
  to: entity.email,
  subject: 'Recebimento do cadastro da entidade | JISPE 2026',
  text: `Prezada ${entity.name},\n\nConfirmamos o recebimento do cadastro da sua entidade no sistema JISPE 2026. A solicitação será analisada pela equipe responsável. O acesso será liberado após a aprovação.\n\nAtenciosamente,\nEquipe JISPE 2026`,
  html: `<p>Prezada ${escapeHtml(entity.name)},</p><p>Confirmamos o recebimento do cadastro da sua entidade no sistema JISPE 2026.</p><p>A solicitação será analisada pela equipe responsável. O acesso será liberado após a aprovação.</p><p>Atenciosamente,<br>Equipe JISPE 2026</p>`,
});

const sendAthleteRegistrationEmail = (entity, athlete) => sendNotification('athlete-registration', {
  to: entity.email,
  subject: 'Confirmação de cadastro de atleta | JISPE 2026',
  text: `Prezada ${entity.name},\n\nConfirmamos o cadastro do(a) atleta ${athlete.fullName}, matrícula ${athlete.matricula}, na modalidade ${athlete.modality}.\n\nAtenciosamente,\nEquipe JISPE 2026`,
  html: `<p>Prezada ${escapeHtml(entity.name)},</p><p>Confirmamos o cadastro do(a) atleta <strong>${escapeHtml(athlete.fullName)}</strong>, matrícula <strong>${escapeHtml(athlete.matricula)}</strong>, na modalidade ${escapeHtml(athlete.modality)}.</p><p>Atenciosamente,<br>Equipe JISPE 2026</p>`,
});

const sendPasswordChangedEmail = (account) => sendNotification('password-changed', {
  to: account.email,
  subject: 'Confirmação de alteração de senha | JISPE 2026',
  text: `Prezada(o) ${account.name},\n\nInformamos que a senha da sua conta JISPE 2026 foi alterada. Se você não realizou essa ação, entre em contato com a equipe responsável imediatamente.\n\nPor segurança, nenhuma senha é enviada por e-mail.\n\nAtenciosamente,\nEquipe JISPE 2026`,
  html: `<p>Prezada(o) ${escapeHtml(account.name)},</p><p>Informamos que a senha da sua conta JISPE 2026 foi alterada.</p><p>Se você não realizou essa ação, entre em contato com a equipe responsável imediatamente.</p><p>Por segurança, nenhuma senha é enviada por e-mail.</p><p>Atenciosamente,<br>Equipe JISPE 2026</p>`,
});

const sendEntityDecisionEmail = (entity, status) => {
  const approved = status === 'approved';
  const subject = approved ? 'Cadastro da entidade aprovado | JISPE 2026' : 'Atualização do cadastro da entidade | JISPE 2026';
  const decision = approved
    ? 'Informamos que o cadastro da sua entidade foi aprovado. Você já pode acessar o sistema com suas credenciais.'
    : 'Informamos que, após análise, o cadastro da sua entidade não foi aprovado neste momento. Para obter orientações, entre em contato com a equipe responsável.';

  return sendNotification('entity-decision', {
    to: entity.email,
    subject,
    text: `Prezada ${entity.name},\n\n${decision}\n\nAtenciosamente,\nEquipe JISPE 2026`,
    html: `<p>Prezada ${escapeHtml(entity.name)},</p><p>${escapeHtml(decision)}</p><p>Atenciosamente,<br>Equipe JISPE 2026</p>`,
  });
};

module.exports = {
  assertEmailConfigured,
  isEmailConfigured,
  sendAthleteRegistrationEmail,
  sendEntityDecisionEmail,
  sendEntityRegistrationEmail,
  sendNotification,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
};