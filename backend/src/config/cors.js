const cors = require('cors');
const env = require('./env');

const corsOptions = {
  origin: env.FRONTEND_URL,
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);
