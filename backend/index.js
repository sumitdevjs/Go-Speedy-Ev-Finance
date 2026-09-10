const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const swaggerUi = require('swagger-ui-express');

const env = require('./src/config/env');
const cors = require('./src/config/cors');
const swaggerSpec = require('./src/config/swagger');
const errorHandler = require('./src/middleware/errorHandler');
const passport = require('./src/config/passport');

const app = express();

// Trust reverse proxy (required for secure cookies & HTTPS detection on Vercel, Render, Railway, etc.)
app.set('trust proxy', 1);

// Security and utility middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to allow Swagger UI scripts from unpkg CDN
}));
app.use(cors);
app.use(express.json());
app.use(cookieParser());

// Session — used briefly during OAuth redirect (not for general auth)
app.use(session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: env.NODE_ENV === 'production', maxAge: 5 * 60 * 1000 }, // 5 min
}));

// Passport (OAuth only)
app.use(passport.initialize());
app.use(passport.session());

// Swagger Docs (enabled by default unless explicitly disabled)
if (env.SWAGGER_ENABLED) {
  app.get(['/api/docs', '/api/docs/'], (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Go Speedy API Documentation</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
        <script>
          window.onload = () => {
            window.ui = SwaggerUIBundle({
              url: '/api/docs.json',
              dom_id: '#swagger-ui',
            });
          };
        </script>
      </body>
      </html>
    `);
  });
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// Basic Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

// Import Routes
const authRoutes = require('./src/modules/auth/auth.routes');
const staffRoutes = require('./src/modules/staff/staff.routes');
const modelsRoutes = require('./src/modules/models/models.routes');
const rentalsRoutes = require('./src/modules/rentals/rentals.routes');
const paymentsRoutes = require('./src/modules/payments/payments.routes');
const bookingsRoutes = require('./src/modules/bookings/bookings.routes');
const documentsRoutes = require('./src/modules/documents/documents.routes');
const purchasesRoutes = require('./src/modules/purchases/purchases.routes');
const auditRoutes = require('./src/modules/audit/audit.routes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/rentals', rentalsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/audit', auditRoutes);

// Global Error Handler (must be last)
app.use(errorHandler);

const PORT = env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${env.NODE_ENV} mode`);
    if (env.SWAGGER_ENABLED) {
      console.log(`📄 Swagger docs available at http://localhost:${PORT}/api/docs`);
    }
  });
}

// Export for Vercel Serverless Functions
module.exports = app;
