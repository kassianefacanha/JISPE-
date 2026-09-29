const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

const isDatabaseUnavailable = (error) => {
  const databaseErrorNames = new Set([
    'MongoNetworkError',
    'MongoNetworkTimeoutError',
    'MongoServerSelectionError',
    'MongooseServerSelectionError',
  ]);
  const connectionErrorCodes = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']);

  return databaseErrorNames.has(error.name)
    || connectionErrorCodes.has(error.code)
    || /buffering timed out|failed to connect to.*mongodb/i.test(error.message || '');
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let statusCode = Number(err.statusCode || err.status || 500);
  let message = err.message || 'Erro interno do servidor.';

  if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
    statusCode = 500;
  }

  if (isDatabaseUnavailable(err)) {
    statusCode = 503;
    message = 'Sistema temporariamente indisponível. Tente novamente em alguns instantes.';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors || {}).map((item) => item.message).filter(Boolean).join(' ') || 'Confira os dados enviados.';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Já existe um cadastro com esses dados.';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Um dos identificadores enviados é inválido.';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Os dados enviados estão em formato inválido.';
  } else if (err.name === 'MulterError') {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE'
      ? 'O arquivo excede o tamanho máximo permitido.'
      : 'Não foi possível processar o arquivo enviado.';
  } else if (statusCode >= 500) {
    message = 'Ocorreu um erro inesperado. Tente novamente em alguns instantes.';
  }

  console.error(err);

  res.status(statusCode).json({
    success: false,
    message,
    stack: isProduction ? undefined : err.stack,
  });
};

module.exports = { errorHandler };
