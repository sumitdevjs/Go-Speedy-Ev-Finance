const cors = require('cors');
const env = require('./env');

const corsOptions = {
  origin: (origin, callback) => {
    // If no origin (e.g. direct browser visit), allow it
    if (!origin || !env.FRONTEND_URL || env.FRONTEND_URL === '*' || env.FRONTEND_URL === origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);
