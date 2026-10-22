/**
 * Standardize API responses.
 */

const successResponse = (res, statusCode = 200, data = null, message = 'Success', pagination = null) => {
  const response = {
    success: true,
    message,
  };
  
  if (data !== null) response.data = data;
  if (pagination !== null) {
    response.pagination = pagination;
    response.meta = pagination;
  }

  return res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  let safeMessage = message;
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    const isSensitive = /relation|table|column|select|insert|update|delete|postgres|supabase|sql|syntax|is not defined|referenceerror|typeerror|cannot read|undefined|null/i.test(String(message));
    if (isSensitive) {
      safeMessage = 'An unexpected server error occurred. Please try again.';
    }
  }

  const response = {
    success: false,
    message: safeMessage,
  };

  if (errors !== null && (process.env.NODE_ENV !== 'production' || statusCode < 500)) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  successResponse,
  errorResponse,
};
