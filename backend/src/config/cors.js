const cors = require('cors');
const { isAllowedOrigin } = require('./allowedOrigins');

const corsOptions = {
  origin: (origin, callback) => {
    // Reflecting every origin while allowing credentials would let any
    // website make authenticated requests using a logged-in user's cookies.
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);
