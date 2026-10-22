const { errorResponse } = require('../utils/response');
const { ZodError } = require('zod');
const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError || err.name === 'ZodError') {
    const formattedErrors = (err.errors || err.issues || []).map((e) => ({
      field: e.path ? e.path.join('.') : 'unknown',
      message: e.message,
    }));
    console.error('[ZOD ERROR]:', JSON.stringify(formattedErrors));
    return errorResponse(res, 400, 'Validation Error', formattedErrors);
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 400, 'Invalid JSON body');
  }

  console.error('[Error handler]', err);
  const isDev = env.NODE_ENV !== 'production';
  return errorResponse(
    res,
    err.status || 500,
    isDev ? err.message : 'Internal Server Error',
    isDev ? err.stack : null
  );
};

module.exports = errorHandler;
