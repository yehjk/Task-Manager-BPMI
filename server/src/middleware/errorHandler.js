// /server/src/middleware/errorHandler.js
export function errorHandler(err, _req, res, _next) {
  console.error(err);

  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';

  res.status(status).json({
    error: code,
    message: err.message || 'Unexpected error'
  });
}
