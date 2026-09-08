const { errorResponse } = require('../utils/response');
const { ZodError } = require('zod');

const errorHandler = (err, req, res, next) => {
  // Catch Zod validation errors
  if (err instanceof ZodError || err.name === 'ZodError') {
    const formattedErrors = (err.errors || err.issues || []).map((e) => ({
      field: e.path ? e.path.join('.') : 'unknown',
      message: e.message,
    }));
    console.error('[ZOD ERROR]:', JSON.stringify(formattedErrors));
    return errorResponse(res, 400, 'Validation Error', formattedErrors);
  }

  // Handle SyntaxError from Express JSON parsing (e.g., malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 400, 'Invalid JSON body');
  }

  // Handle specific Supabase or Postgres errors if needed here
  
  // Default fallback
  console.error('[Error handler]', err);
  const isDev = true; // Temporary debug override to see exact 500 errors in production
  return errorResponse(
    res,
    err.status || 500,
    isDev ? err.message : 'Internal Server Error',
    isDev ? err.stack : null
  );
};

module.exports = errorHandler;
