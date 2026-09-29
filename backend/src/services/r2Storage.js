const crypto = require('crypto');
const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const storagePrefix = 'r2://';
const maxObjectBytes = 3 * 1024 * 1024;
const endpoint = process.env.R2_ENDPOINT
  || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
const bucket = process.env.R2_BUCKET_NAME || '';
const configured = Boolean(
  endpoint
  && bucket
  && process.env.R2_ACCESS_KEY_ID
  && process.env.R2_SECRET_ACCESS_KEY
);
let client;

const isR2Value = (value) => typeof value === 'string' && value.startsWith(storagePrefix);

const getObjectKey = (value) => (isR2Value(value) ? value.slice(storagePrefix.length) : '');

const getClient = () => {
  if (!configured) throw new Error('O armazenamento R2 não está configurado.');
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
};

const isSameStoredAsset = (submittedValue, storedValue) => {
  if (submittedValue === storedValue) return true;
  if (!isR2Value(storedValue) || typeof submittedValue !== 'string') return false;

  try {
    const signedUrl = new URL(submittedValue);
    const r2Endpoint = new URL(endpoint);
    const segments = signedUrl.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const submittedKey = segments[0] === bucket ? segments.slice(1).join('/') : '';
    return signedUrl.origin === r2Endpoint.origin
      && signedUrl.searchParams.has('X-Amz-Signature')
      && submittedKey === getObjectKey(storedValue);
  } catch (error) {
    return false;
  }
};

const storeAsset = async (value, keyPrefix, previousValue = '') => {
  if (!value) return previousValue;
  if (isSameStoredAsset(value, previousValue)) return previousValue;

  const match = typeof value === 'string'
    ? value.match(/^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/i)
    : null;
  if (!match) return value;

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Configure o R2 no ambiente antes de enviar arquivos.');
    }
    return value;
  }

  const contentType = match[1].toLowerCase();
  const body = Buffer.from(match[2], 'base64');
  if (body.length > maxObjectBytes) throw new Error('Cada arquivo pode ter no máximo 3 MiB.');

  const extensions = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const extension = extensions[contentType];
  if (!extension) throw new Error('Formato de arquivo não permitido.');

  const key = `${keyPrefix}/${crypto.randomUUID()}.${extension}`;
  await getClient().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentLength: body.length,
    ContentType: contentType,
    CacheControl: 'private, no-store',
  }));
  return `${storagePrefix}${key}`;
};

const getAssetUrl = async (value, { download = false } = {}) => {
  if (!isR2Value(value)) return value || '';
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: getObjectKey(value),
    ResponseContentDisposition: download ? 'attachment' : 'inline',
  });
  return getSignedUrl(getClient(), command, { expiresIn: 300 });
};

const getAssetBuffer = async (value) => {
  if (!isR2Value(value)) return null;
  const response = await getClient().send(new GetObjectCommand({
    Bucket: bucket,
    Key: getObjectKey(value),
  }));
  if (response.ContentLength > 5 * 1024 * 1024) return null;
  const body = await response.Body.transformToByteArray();
  return body.byteLength <= 5 * 1024 * 1024 ? Buffer.from(body) : null;
};

const deleteAsset = async (value) => {
  if (!isR2Value(value)) return;
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: getObjectKey(value) }));
};

const deleteReplacedAsset = async (previousValue, nextValue) => {
  if (!isR2Value(previousValue) || previousValue === nextValue) return;
  try {
    await deleteAsset(previousValue);
  } catch (error) {
    console.error('Não foi possível remover o objeto substituído do R2.');
  }
};

const assertConfigured = () => {
  if (!configured) throw new Error('Configure R2_ENDPOINT (ou R2_ACCOUNT_ID), R2_BUCKET_NAME, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY.');
};

const checkConnection = async () => {
  assertConfigured();
  const key = `_healthchecks/${crypto.randomUUID()}.txt`;
  const body = Buffer.from(`r2-check-${crypto.randomUUID()}`);
  let uploaded = false;

  try {
    await getClient().send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'text/plain',
      CacheControl: 'no-store',
    }));
    uploaded = true;

    const response = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const downloaded = await response.Body.transformToByteArray();
    if (!Buffer.from(downloaded).equals(body)) throw new Error('O conteúdo lido do R2 não corresponde ao enviado.');

    await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    uploaded = false;
  } catch (error) {
    if (uploaded) {
      try {
        await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      } catch (cleanupError) {
        console.error('Não foi possível apagar o objeto temporário de teste.');
      }
    }
    throw error;
  }
};

module.exports = {
  assertConfigured,
  checkConnection,
  deleteAsset,
  deleteReplacedAsset,
  getAssetBuffer,
  getAssetUrl,
  isR2Value,
  isSameStoredAsset,
  storeAsset,
};