const fs = require('fs');
const path = require('path');
const readline = require('readline');

require('dotenv').config({
  path: [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ],
});

const API_URL = 'https://api.resend.com';
const DEFAULT_TIME_ZONE = 'America/Fortaleza';

const fail = (message) => {
  console.error(message);
  process.exitCode = 1;
};

const parseCsv = (content) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (inQuotes) {
      if (character === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      inQuotes = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (inQuotes) throw new Error('O CSV termina com um campo entre aspas incompleto.');
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  if (rows.length < 2) throw new Error('O CSV não contém linhas de e-mail para analisar.');

  const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, '').trim());
  return rows
    .filter((values) => values.some((value) => value !== ''))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
};

const getAddress = (value) => {
  const text = String(value || '').trim();
  const bracketedAddress = text.match(/<([^<>]+)>/);
  return (bracketedAddress ? bracketedAddress[1] : text).trim().toLowerCase();
};

const getRecipients = (value) => {
  const recipients = Array.isArray(value) ? value : String(value || '').split(',');
  return recipients.map((recipient) => String(recipient).trim().toLowerCase()).filter(Boolean);
};

const getLocalDate = (value, timeZone) => {
  const timestamp = Date.parse(value || '');
  if (Number.isNaN(timestamp)) return null;
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(timestamp);
  const dateParts = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
};

const apiRequest = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || `Resend respondeu com HTTP ${response.status}.`);
    error.responseCode = response.status;
    error.code = result.name || `HTTP_${response.status}`;
    throw error;
  }
  return result;
};

const listAllEmails = async () => {
  const emails = [];
  let after = '';
  const seenCursors = new Set();

  do {
    const query = new URLSearchParams({ limit: '100' });
    if (after) query.set('after', after);
    const result = await apiRequest(`/emails?${query.toString()}`);
    if (!Array.isArray(result.data)) throw new Error('Resposta inesperada ao listar e-mails no Resend.');
    emails.push(...result.data);

    if (!result.has_more) break;
    const nextCursor = result.data[result.data.length - 1]?.id;
    if (!nextCursor || seenCursors.has(nextCursor)) {
      throw new Error('Não foi possível avançar a paginação da lista de e-mails do Resend.');
    }
    seenCursors.add(nextCursor);
    after = nextCursor;
  } while (true);

  return emails;
};

const askForConfirmation = (count) => new Promise((resolve) => {
  if (!process.stdin.isTTY) {
    resolve(false);
    return;
  }

  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  prompt.question(`Digite REENVIAR ${count} para confirmar: `, (answer) => {
    prompt.close();
    resolve(answer === `REENVIAR ${count}`);
  });
});

const main = async () => {
  const args = process.argv.slice(2);
  const options = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--send') {
      if (options.has('send')) throw new Error('A opção --send foi informada mais de uma vez.');
      options.set('send', true);
    } else if (['--csv', '--date', '--time-zone'].includes(argument)) {
      if (options.has(argument)) throw new Error(`A opção ${argument} foi informada mais de uma vez.`);
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Informe um valor para ${argument}.`);
      options.set(argument, value);
      index += 1;
    } else {
      throw new Error(`Opção desconhecida: ${argument}`);
    }
  }

  const csvArgument = options.get('--csv');
  const dateFilter = options.get('--date');
  const timeZone = options.get('--time-zone') || DEFAULT_TIME_ZONE;
  if (!csvArgument || (options.has('send') && !dateFilter)) {
    console.log('Uso: npm run resend:failed-emails -- --csv <arquivo.csv> --date AAAA-MM-DD [--send]');
    console.log('A simulação lista falhas da data informada; --send exige uma data e confirmação digitada.');
    process.exitCode = 1;
    return;
  }
  if (dateFilter && !/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
    throw new Error('A data precisa estar no formato AAAA-MM-DD.');
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
    throw new Error('Configure RESEND_API_KEY e RESEND_FROM em backend/.env ou no .env da raiz do repositório.');
  }

  const csvPath = path.resolve(process.cwd(), csvArgument);
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const failedRows = rows.filter((row) => row.last_event === 'failed'
    && (!dateFilter || getLocalDate(row.created_at, timeZone) === dateFilter));
  if (!failedRows.length) {
    console.log(`O CSV não contém registros failed para ${dateFilter || 'a data selecionada'}.`);
    return;
  }

  console.log(`Registros no CSV: ${rows.length}; falhas em ${dateFilter || 'todas as datas'} (${timeZone}): ${failedRows.length}.`);
  console.log('A exportação não informa o motivo da falha. Serão considerados somente registros failed; bounced e suppressed não serão reenviados.');
  console.log('Consultando o estado atual das mensagens no Resend...');
  const currentEmails = await listAllEmails();
  const currentById = new Map(currentEmails.map((email) => [email.id, email]));
  const configuredSender = getAddress(process.env.RESEND_FROM);
  const eligible = [];
  const skipped = [];
  const seenIds = new Set();

  for (const row of failedRows) {
    if (!row.id || seenIds.has(row.id)) {
      skipped.push({ row, reason: 'ID ausente ou repetido no CSV' });
      continue;
    }
    seenIds.add(row.id);

    const current = currentById.get(row.id);
    if (!current || current.last_event !== 'failed') {
      skipped.push({ row, reason: 'registro ausente ou status atual diferente de failed' });
      continue;
    }

    const recipients = getRecipients(row.to);
    if (recipients.length !== 1) {
      skipped.push({ row, reason: 'o CSV não identifica exatamente um destinatário' });
      continue;
    }
    if (getAddress(row.from) !== configuredSender || getAddress(current.from) !== configuredSender) {
      skipped.push({ row, reason: 'remetente diferente de RESEND_FROM' });
      continue;
    }
    if (current.subject !== row.subject || getRecipients(current.to).join(',') !== recipients[0]) {
      skipped.push({ row, reason: 'destinatário ou assunto não confere com o registro atual do Resend' });
      continue;
    }
    try {
      const details = await apiRequest(`/emails/${encodeURIComponent(row.id)}`);
      if (details.last_event !== 'failed'
        || details.subject !== row.subject
        || getAddress(details.from) !== configuredSender
        || getRecipients(details.to).length !== 1
        || getRecipients(details.to)[0] !== recipients[0]
        || (!details.html && !details.text)) {
        skipped.push({ row, reason: 'detalhes da mensagem não conferem ou não incluem conteúdo recuperável' });
        continue;
      }
      eligible.push({ originalId: row.id, details, recipient: recipients[0] });
    } catch (error) {
      skipped.push({ row, reason: `não foi possível recuperar conteúdo do Resend: ${error.message}` });
    }
  }

  console.log(`Elegíveis para reenvio: ${eligible.length}`);
  eligible.forEach(({ originalId, details, recipient }) => {
    console.log(`- ${recipient} | ${details.subject} | ${details.created_at} | ID ${originalId}`);
  });
  if (skipped.length) {
    console.log(`Ignorados: ${skipped.length}`);
    skipped.forEach(({ row, reason }) => console.log(`- ${row.to || '(sem destinatário)'} | ${row.id || '(sem ID)'} | ${reason}`));
  }
  if (!options.has('send')) {
    console.log('Simulação concluída. Para enviar somente essas falhas, execute novamente com --send.');
    return;
  }
  if (!eligible.length) {
    console.log('Nenhum e-mail elegível para envio.');
    return;
  }
  if (!(await askForConfirmation(eligible.length))) {
    console.log('Envio cancelado. Nenhum e-mail foi enviado.');
    return;
  }

  let sentCount = 0;
  let errorCount = 0;
  let notAttemptedCount = 0;
  for (let index = 0; index < eligible.length; index += 1) {
    const { originalId, details, recipient } = eligible[index];
    try {
      const latest = await apiRequest(`/emails/${encodeURIComponent(originalId)}`);
      if (latest.last_event !== 'failed') {
        console.log(`Ignorado ${recipient}: o registro original não está mais failed.`);
        continue;
      }

      const payload = {
        from: details.from,
        to: [recipient],
        subject: details.subject,
      };
      if (details.html) payload.html = details.html;
      if (details.text) payload.text = details.text;

      const result = await apiRequest('/emails', {
        method: 'POST',
        headers: { 'Idempotency-Key': `jispe-retry-${originalId}` },
        body: JSON.stringify(payload),
      });
      if (!result.id) throw new Error('O Resend não retornou o ID do novo envio.');
      sentCount += 1;
      currentEmails.push({
        id: result.id,
        from: details.from,
        to: [recipient],
        subject: details.subject,
        last_event: 'sent',
        created_at: new Date().toISOString(),
      });
      console.log(`Reenvio aceito: ${recipient} | novo ID ${result.id}`);
    } catch (error) {
      errorCount += 1;
      console.error(`Falha ao reenviar ${recipient} (ID original ${originalId}): ${error.message}`);
      if (error.code === 'daily_quota_exceeded') {
        notAttemptedCount = eligible.length - index - 1;
        console.error('Cota diária do Resend atingida. Interrompendo para evitar novas tentativas recusadas.');
        break;
      }
    }
  }

  console.log(`Concluído: ${sentCount} aceitos pelo Resend; ${errorCount} falhas; ${notAttemptedCount} não tentados.`);
  if (errorCount || notAttemptedCount) process.exitCode = 1;
};

main().catch((error) => fail(`Não foi possível processar os reenvios: ${error.message}`));
