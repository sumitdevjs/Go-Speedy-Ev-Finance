/**
 * Standardize API responses.
 */

const successResponse = (res, statusCode = 200, data = null, message = 'Success', pagination = null) => {
  const response = {
    success: true,
    message,
  };
  
  if (data !== null) response.data = data;
  if (pagination !== null) response.pagination = pagination;

  return res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors !== null) response.errors = errors;

  return res.status(statusCode).json(response);
};

module.exports = {
  successResponse,
  errorResponse,
};
