const swaggerJSDoc = require('swagger-jsdoc');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Go Speedy EV Finance Scheme API',
      version: '1.0.0',
      description: 'API documentation for the Go Speedy EV Finance Scheme backend',
    },
    tags: [
      { name: 'Auth', description: 'Authentication and profile' },
      { name: 'Staff', description: 'Staff management (Admin only)' },
      { name: 'Models', description: 'EV Models inventory' },
      { name: 'Bookings', description: 'Pending bookings and reservations' },
      { name: 'Rentals', description: 'Active rentals/tenants' },
      { name: 'Payments', description: 'Installment collections' },
      { name: 'Documents', description: 'File uploads and retrieval' },
      { name: 'Purchases', description: 'Completed and direct purchases' },
      { name: 'Audit', description: 'Audit logs (Admin only)' },
    ],
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ['./src/modules/**/*.routes.js', './src/modules/**/*.controller.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
