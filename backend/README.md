# Go Speedy EV Finance Scheme - Backend API Server

<div align="center">

[![Runtime](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Database](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Jest-Unit%20Tests-C21325?style=for-the-badge&logo=jest&logoColor=white)](https://jestjs.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<p align="center">
  <b>The high-performance Express 5 REST API powering the Go Speedy EV Finance Scheme. It serves as the secure core of the platform, enforcing business rules, 4-tier hierarchical access scoping, precision financial calculations, and secure document handling.</b>
</p>

</div>

---

## Overview

The Go Speedy Backend API manages the operational backend for large-scale electric fleet operations across Delhi NCR. It coordinates inventory tracking, multi-step customer onboarding, rental contracts, daily/weekly/monthly payment ledgers, hardware uniqueness validation, and audit logging.

It connects to **Supabase PostgreSQL** as its primary relational store and **Supabase Storage** for private, signed document access.

---

## Full Backend Tech Stack

| Category | Technology | Version | Purpose & Implementation Details |
| :--- | :--- | :--- | :--- |
| **Runtime Environment** | [Node.js](https://nodejs.org/) | `>= 18.x` | Cross-platform JavaScript runtime powering fast asynchronous I/O operations. |
| **Server Framework** | [Express.js](https://expressjs.com/) | `5.2.1` | RESTful API server structuring modular routes, middleware, and controllers. |
| **Database Client** | [@supabase/supabase-js](https://supabase.com/docs/reference/javascript/introduction) | `2.115.0` | Official client interacting with Supabase PostgreSQL via privileged Service Role Key. |
| **Database Engine** | [PostgreSQL](https://www.postgresql.org/) (Supabase) | `15+` | Relational database utilizing `pg_trgm` (trigram ILIKE search) and Row-Level Security (RLS). |
| **Object Storage** | [Supabase Storage](https://supabase.com/storage) | Built-in | Private storage buckets storing KYC, contracts, and insurance docs with pre-signed short-lived URLs. |
| **Authentication & Tokens**| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | `9.0.3` | Dual-token authentication issuing stateless 15-minute Access Tokens and verified payload claims. |
| **Password & Token Hash** | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | `3.0.3` | Multi-round salt hashing for user passwords and persistent database-stored refresh tokens. |
| **OAuth 2.0 Integration** | [Passport.js](https://www.passportjs.org/) / `passport-google-oauth20` | `0.7.0` / `2.0.0` | Google Single Sign-On (SSO) authentication for administrative and field personnel. |
| **HTTP Security Headers** | [Helmet](https://helmetjs.github.io/) | `8.3.0` | Secures Express apps by setting essential HTTP headers, disabling iframe sniffing, and mitigating XSS. |
| **CORS Management** | [CORS](https://github.com/expressjs/cors) | `2.8.6` | Configurable origin whitelist ensuring cross-site requests are strictly guarded. |
| **Session Middleware** | [express-session](https://github.com/expressjs/session) | `1.19.0` | Ephemeral session state utilized exclusively during Google OAuth callback redirects. |
| **Cookie Parsing** | [cookie-parser](https://github.com/expressjs/cookie-parser) | `1.4.7` | Parses cryptographically secure, HttpOnly cookies containing authentication tokens. |
| **Rate Limiting** | [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | `8.7.0` | Defense-in-depth against brute-force attacks and DDoS by throttling high-frequency API endpoints. |
| **File Upload Handling** | [Multer](https://github.com/expressjs/multer) | `2.3.0` | Multipart/form-data handler managing in-memory file buffers before passing to validation and Supabase. |
| **MIME / Magic Byte Check**| Custom `fileSignature.js` | Custom | Inspects raw magic numbers/file signatures to prevent malicious executable files posing as PDFs/images. |
| **Email & OTP Service** | [Nodemailer](https://nodemailer.com/) | `10.0.1` | SMTP transport integration for transactional password-reset OTP verification emails. |
| **Request Validation** | [Zod](https://zod.dev/) | `4.5.4` | Server-side runtime type checking and sanitization across all request bodies, params, and queries. |
| **API Documentation** | [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express) / `swagger-jsdoc` | `5.0.1` / `6.3.0` | OpenAPI 3.0 interactive API documentation available in development environments. |
| **Unique ID Generator** | [uuid](https://github.com/uuidjs/uuid) | `14.0.2` | Generates cryptographically secure RFC4122 UUIDs for system entities. |
| **Unit Testing** | [Jest](https://jestjs.io/) | `30.5.1` | Automated test runner for unit testing auth, balance calculations, JWTs, and multi-tenant scoping. |
| **HTTP Integration Tests** | [Supertest](https://github.com/ladjs/supertest) | `7.2.2` | HTTP assertions for testing REST endpoints and status codes without binding to physical network ports. |
| **Development Reload** | [Nodemon](https://nodemon.io/) | `3.1.14` | Development auto-reload tool monitoring backend source changes. |

---

## Core Architectural Modules

### 1. 4-Tier Scoping Middleware (`scope.js`)
Enforces tenant data boundaries at the SQL query level:
- **`super_admin`**: Global visibility across all Head Offices and ward branches.
- **`ho_admin`**: Injects `head_office_id` constraint, restricting visibility to branches within their zone.
- **`branch_admin`**: Injects `branch_id` constraint, strictly limiting access to their ward depot.
- **`staff`**: Injects `branch_id` constraint for field operations.

### 2. Precision Financial Ledger & Balance Engine (`balanceCalc.js`)
- Supports Daily (Rs 250 default), Weekly, and Monthly installment schedules.
- Dynamically calculates:
  - Total accrued installments over contract duration.
  - Total payments collected to date.
  - Outstanding balance.
  - Days overdue and delinquent account flagging.
  - Automated late fee accumulation (`late_fee_daily_rate = 50.00/day`).
  - Penalty waiver tracking with administrative justification.

### 3. Hardware Asset Uniqueness & Anti-Fraud
Electric scooters have critical hardware components enforced with database partial unique indexes:
- `chassis_no` (Unique across all active units)
- `motor_no` (Unique across all active units)
- `controller_no` (Unique across all active units)
- `charger_no` (Unique across all active units)
- `battery_no` (Unique across all active units)

### 4. Zero-Trust KYC Document Vault (`documents.service.js`)
- Connects to Supabase private storage bucket (`documents`).
- Validates file headers using magic numbers (`fileSignature.js`) to reject malicious files disguised as images or PDFs.
- Issues time-limited, cryptographically signed URLs for viewing or downloading sensitive KYC documents.

### 5. Comprehensive Audit Trail (`auditLog.js`)
- Every administrative action (staff creation, price updates, stock transfers, penalty waivers, contract modifications) writes an immutable record to `audit_logs` storing:
  - User ID and role.
  - Action name (e.g., `CREATE_RENTAL`, `WAIVE_PENALTY`, `STOCK_ADJUST`).
  - Affected entity type and ID.
  - Before-and-after JSON changes diff.
  - Client IP address and timestamp.

---

## Project Structure

```text
backend/
├── db/
│   └── schema.sql                    # Production PostgreSQL Schema & Zonal Seed Data
├── src/
│   ├── config/
│   │   ├── cors.js                   # Cross-Origin Whitelist Policy
│   │   ├── env.js                    # Zod-validated Environment Schema
│   │   ├── passport.js               # Google OAuth 2.0 Passport Strategy
│   │   ├── supabase.js               # Supabase Client with Service Role Key
│   │   └── swagger.js                # OpenAPI 3.0 JSDoc Specifications
│   ├── middleware/
│   │   ├── auth.js                   # JWT Verification & Cookie Parser Middleware
│   │   ├── errorHandler.js           # Centralized API Error Response Formatter
│   │   ├── requestLogger.js          # Development HTTP Request Logger
│   │   ├── role.js                   # Role-Based Permission Guards
│   │   ├── roleGuard.js              # Multi-tier RBAC Validator
│   │   ├── scope.js                  # Multi-tenant HO & Branch Scoping Middleware
│   │   └── uploadHandler.js          # Multer Multipart Upload Handler
│   ├── modules/
│   │   ├── audit/                    # Audit Trail Logging Service & Controller
│   │   ├── auth/                     # Authentication, Refresh Tokens, & OTP
│   │   ├── bookings/                 # Pre-Booking Token Management
│   │   ├── branches/                 # Ward Branch Administration (46 Delhi Wards)
│   │   ├── documents/                # Signed Document Vault & Pre-signed URLs
│   │   ├── headOffices/              # Zonal Headquarters (Delhi, Noida, Gurgaon)
│   │   ├── models/                   # Brand-new & Refurbished EV Catalog
│   │   ├── payments/                 # Financial Ledger & Late Fee Engine
│   │   ├── purchases/                # Direct Purchase Flow & Invoicing
│   │   ├── rentals/                  # Rental Onboarding Wizard & Balance Engine
│   │   └── staff/                    # User Administration & Branch Assignment
│   ├── services/
│   │   └── email.service.js          # Email Transport for Transactional Emails
│   └── utils/
│       ├── auditLog.js               # Audit Event Logger Helper
│       ├── balanceCalc.js            # EMI & Late Fee Precision Math
│       ├── fileSignature.js          # Magic Byte File Header Security Inspector
│       ├── jwt.js                    # JWT Generation & Verification Utilities
│       ├── pagination.js             # Standardized Query Pagination Helper
│       └── response.js               # Uniform API Response Formatter
├── tests/
│   └── unit/                         # Jest Unit Tests (Auth, Balance, JWT, Scoping)
├── .env                              # Backend Environment Configuration
├── index.js                          # Express Application Entry Point
└── package.json                      # Backend Dependencies & Scripts
```

---

## REST API Reference

In development mode, interactive OpenAPI 3.0 documentation is available at:
`http://localhost:5000/api/docs`

| Prefix | Module | Key Endpoints | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth` | Authentication | `POST /login`, `GET /me`, `POST /refresh`, `POST /logout`, `GET /google` | User sessions, dual-token rotation, and Google OAuth. |
| `/api/head-offices` | Zonal Command | `GET /`, `GET /my-dashboard`, `GET /:id/dashboard`, `POST /` | Regional headquarters analytics and branch listings. |
| `/api/branches` | Ward Depots | `GET /`, `GET /:id`, `POST /`, `PATCH /:id` | Ward branches management and depot profiles. |
| `/api/staff` | Staff & Users | `GET /`, `POST /`, `PATCH /:id`, `PATCH /:id/status` | Staff directory, role assignments, and branch pairing. |
| `/api/models` | New EV Inventory | `GET /`, `POST /`, `PATCH /:id/stock` | Scooter catalog, specifications, and stock counts. |
| `/api/old-evs` | Refurbished Fleet | `GET /`, `POST /`, `PATCH /:id` | Used/returned scooters available for resale or re-lease. |
| `/api/rentals` | Rental Leases | `GET /`, `GET /:id`, `POST /`, `POST /:id/return` | Multi-step lease creation, balance math, and returns. |
| `/api/purchases` | Direct Purchases | `GET /`, `GET /:id`, `POST /` | Direct sale registration, downpayments, and invoicing. |
| `/api/bookings` | Token Bookings | `GET /`, `POST /`, `POST /:id/convert`, `PATCH /:id/cancel` | Pre-booking reservations and lease conversion. |
| `/api/payments` | Ledger Collections| `GET /`, `POST /`, `POST /waive-penalty` | Installment tracking (Cash/Online) and penalty waivers. |
| `/api/documents` | Document Vault | `POST /upload`, `GET /signed-url` | Secure KYC storage and short-lived signed URLs. |
| `/api/audit` | Audit Logs | `GET /` | Query system audit trail with user and delta diffs. |

---

## Local Setup & Getting Started

### 1. Database Initialization
1. In your Supabase project dashboard, open the **SQL Editor**.
2. Run [`db/schema.sql`](db/schema.sql). This initializes:
   - All 9 core relational tables.
   - Partial unique indexes on chassis, motor, controller, battery, and charger serials.
   - `pg_trgm` fuzzy text search extension.
   - Initial seed records for Head Offices (`DEL-HO`, `NOI-HO`, `GUR-HO`) and 46 Delhi municipal wards.
3. In Supabase **Storage**, create a private bucket named:
   ```text
   documents
   ```

### 2. Configure Environment (`.env`)
Create or update `backend/.env`:

```ini
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
BACKEND_URL=http://localhost:5000

# Supabase Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Security Secrets
JWT_SECRET=super_strong_custom_jwt_secret_key_32_chars_min
SESSION_SECRET=session_secret_for_oauth

# Swagger Documentation (true for development)
SWAGGER_ENABLED=true

# Google OAuth (Optional - Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### 3. Install Dependencies & Run
```bash
npm install
npm run dev
```

The server starts on `http://localhost:5000` with hot-reloading via Nodemon.

---

## Environment Variables Reference

| Variable Name | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | Optional | `5000` | Port on which the Express server listens. |
| `NODE_ENV` | Optional | `development` | Environment mode (`development`, `production`, `test`). |
| `FRONTEND_URL` | Yes | `http://localhost:3001` | Origin URL permitted by CORS policy to receive credentials. |
| `BACKEND_URL` | Optional | `http://localhost:5000` | Fully qualified backend URL for OAuth callback redirects. |
| `SUPABASE_URL` | **Yes** | - | Supabase PostgreSQL project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | - | Privileged Supabase Service Role Key for server-side queries. |
| `JWT_SECRET` | **Yes** | - | Cryptographic secret used to sign 15-minute access tokens. |
| `SESSION_SECRET` | Optional | - | Ephemeral secret key for temporary OAuth sessions. |
| `SWAGGER_ENABLED` | Optional | `true` | Enables Swagger UI documentation at `/api/docs` in non-production. |
| `GOOGLE_CLIENT_ID` | Optional | - | OAuth client ID obtained from Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | Optional | - | OAuth client secret obtained from Google Cloud Console. |
| `GOOGLE_CALLBACK_URL` | Optional | - | OAuth callback URL matching the Google Cloud configuration. |

---

## Testing & Quality Assurance

The backend includes a comprehensive Jest test suite verifying token refreshes, EMI balance calculations, JWT handling, and multi-tenant scoping guards.

```bash
# Run all unit tests
npm run test:unit

# Run full test suite
npm test
```

---

## License

This project is licensed under the [MIT License](LICENSE).
