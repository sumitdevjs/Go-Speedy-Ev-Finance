const cors = require('cors');
const env = require('./env');

const corsOptions = {
  origin: (origin, callback) => {
    // If no FRONTEND_URL provided, or it's *, allow the requesting origin
    if (!env.FRONTEND_URL || env.FRONTEND_URL === '*' || env.FRONTEND_URL === origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);
