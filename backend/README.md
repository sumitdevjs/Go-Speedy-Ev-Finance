# ⚙️ Go Speedy EV Finance Scheme - Backend API

The high-performance Express REST API that powers the Go Speedy EV Finance Scheme. It serves as the secure core of the platform, enforcing complex business rules, validating data, and acting as the sole authorization boundary for database and storage operations.

## ✨ API Capabilities

- **Fleet & Inventory Engine**: Endpoints for registering new EV models, verifying chassis/motor uniqueness, and managing ward stock.
- **Rental Lifecycle Management**: Complex state machines tracking rentals from `Pending` -> `Rented` -> `Completed`/`Cancelled`.
- **Financial & Insurance Tracking**: Support for tracking Scooty/Rider insurance expiries, Annual Maintenance Contracts (AMC), and dynamic buyback workflows.
- **Secure Vault Integration**: Connects with Supabase Storage to issue short-lived signed URLs for sensitive user documents (Aadhar, PAN, Agreements).
- **Robust Authentication Module**:
  - Email/Password login with JWT access tokens.
  - Secure Refresh Token Rotation (hashed in PostgreSQL).
  - Google OAuth2 SSO authentication.
  - OTP-based Password Resets powered by Brevo SMTP.

## 🛠️ Tech Stack & Architecture

- **Runtime**: Node.js + Express.js
- **Database**: Supabase (PostgreSQL) managed via `@supabase/supabase-js`
- **Security & Crypto**: `jsonwebtoken` (JWT), `bcrypt`, Google Auth Library
- **Mail Delivery**: Brevo SMTP integration (Nodemailer)
- **Validation Layer**: `zod` for rigorous payload sanitization.

### Directory Structure

```text
/src
├── api/            # Express routes and controllers
├── config/         # App configurations (DB, Env vars)
├── middleware/     # Auth checks, error handling, input validation
├── modules/        # Feature-specific logic (e.g., models, tenants, staff)
├── services/       # Integrations (Supabase client, Brevo email)
└── utils/          # Helpers (CORS config, token generators, formatters)
```

## 🚀 Getting Started

1. **Environment Setup**:
   Duplicate `.env.example` and rename to `.env`. Required variables include:
   - Supabase URL & Service Role Key
   - Google Client ID & Secret
   - Brevo SMTP Credentials (Host, Port, User, Pass)
   - JWT Secret & Session expiration configs
   - Frontend CORS Origin URLs

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   *The server uses `nodemon` for hot-reloading.*

## 📚 API Documentation

Once the server is running, the Swagger API documentation is automatically generated and accessible at:
👉 **[http://localhost:5000/api/docs](http://localhost:5000/api/docs)**
