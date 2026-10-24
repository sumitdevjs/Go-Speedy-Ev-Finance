const env = require('./env');

const configured = env.FRONTEND_URL && env.FRONTEND_URL !== '*'
  ? env.FRONTEND_URL.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
  : [];

const devOrigins = ['http://localhost:3000', 'http://localhost:3001'];

const allowedOrigins = [...new Set([...configured, ...devOrigins])];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const cleanOrigin = String(origin).replace(/\/+$/, '');
  if (allowedOrigins.includes(cleanOrigin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) return true;
  if (/^https?:\/\/([a-z0-9-]+\.)?gospeedy\.in(:\d+)?$/.test(cleanOrigin)) return true;
  if (/^https?:\/\/([a-z0-9-]+\.)?gospeedyev\.in(:\d+)?$/.test(cleanOrigin)) return true;
  // Allow direct IP access (e.g. EC2 public IP or local network IP) when wildcard or development
  if (env.FRONTEND_URL === '*' || env.NODE_ENV !== 'production') {
    if (/^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(cleanOrigin)) return true;
  }
  return false;
}

module.exports = { allowedOrigins, isAllowedOrigin };
