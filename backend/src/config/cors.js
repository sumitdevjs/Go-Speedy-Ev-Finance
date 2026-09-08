const cors = require('cors');
const env = require('./env');

const corsOptions = {
  origin: (origin, callback) => {
    // Dynamically allow whatever origin made the request to completely bypass CORS 
    // configuration headaches (like trailing slashes or preview branch URLs)
    callback(null, origin || true);
  },
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);
