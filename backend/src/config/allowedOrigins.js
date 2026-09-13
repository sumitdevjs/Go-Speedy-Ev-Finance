const env = require('./env');

// FRONTEND_URL may be a single origin or a comma-separated list (e.g. for
// staging + production frontends sharing one backend).
const configured = env.FRONTEND_URL && env.FRONTEND_URL !== '*'
  ? env.FRONTEND_URL.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
  : [];

// Always allow common local dev origins so local development still works
// even if FRONTEND_URL is unset or misconfigured.
const devOrigins = ['http://localhost:3000', 'http://localhost:3001'];

const allowedOrigins = [...new Set([...configured, ...devOrigins])];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return allowedOrigins.includes(String(origin).replace(/\/+$/, ''));
}

module.exports = { allowedOrigins, isAllowedOrigin };
