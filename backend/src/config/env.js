const { z } = require('zod');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Define the schema for our environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  FRONTEND_URL: z.string().optional().default('*'),
  SWAGGER_ENABLED: z.string().transform((val) => val === 'true').default('true'),
  // Google OAuth — optional so the app runs without them configured
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  BACKEND_URL: z.string().optional(),
  SESSION_SECRET: z.string().optional().default('gospeedy_session_secret_change_me'),

  // SMTP Email Configuration (Gmail OTP)
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('465'),
  SMTP_USER: z.string().default('gospeedy.admin@gmail.com'),
  SMTP_PASS: z.string().optional(),
});

// Validate the environment variables
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(_env.error.format(), null, 2));
  throw new Error('Environment variable validation failed. Check your Vercel Environment Variables.');
}

module.exports = _env.data;
