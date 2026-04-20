// middleware/errorHandler.js
const { logger } = require('./logger');

/**
 * Centralized Express error handler.
 * Must be registered AFTER all routes with app.use(errorHandler).
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  logger.error(`${req.method} ${req.originalUrl} → ${status}: ${err.message}`);
  if (status === 500) logger.error(err.stack);

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Validation helper – throws a 400 error with a user-friendly message.
 */
function validationError(message) {
  const err = new Error(message);
  err.status = 400;
  throw err;
}

module.exports = { errorHandler, validationError };
