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
  if (!origin) return true;
  const cleanOrigin = String(origin).replace(/\/+$/, '');
  if (allowedOrigins.includes(cleanOrigin)) return true;
  // Automatically allow this EC2 server's public IP
  if (/^https?:\/\/3\.7\.65\.179(:\d+)?$/.test(cleanOrigin)) return true;
  // Automatically allow localhost and 127.0.0.1
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) return true;
  // Automatically allow company domains (both HTTP and HTTPS)
  if (/^https?:\/\/([a-z0-9-]+\.)?gospeedy\.in(:\d+)?$/.test(cleanOrigin)) return true;
  if (/^https?:\/\/([a-z0-9-]+\.)?gospeedyev\.in(:\d+)?$/.test(cleanOrigin)) return true;
  return false;
}

module.exports = { allowedOrigins, isAllowedOrigin };
