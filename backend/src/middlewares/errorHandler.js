const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  if (process.env.NODE_ENV === 'production') {
    console.error(err.name || 'InternalServerError');
  } else {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode >= 500
      ? 'Erro interno do servidor'
      : err.message || 'Erro interno do servidor',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { errorHandler };
