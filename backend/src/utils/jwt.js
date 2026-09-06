const jwt = require('jsonwebtoken');
const env = require('../config/env');

const generateAccessToken = (payload) => {
  // Access token valid for 15 minutes
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  verifyAccessToken,
};
