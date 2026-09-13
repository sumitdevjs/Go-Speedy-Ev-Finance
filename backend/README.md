# Go Speedy EV Finance Scheme - Backend

This is the Express REST API that powers the Go Speedy EV Finance Scheme operations. 
It serves as the sole authorization boundary, enforcing all security rules in code rather than relying on Supabase RLS.

## Features
- **Complete EV Inventory API**: Endpoints for fleet tracking, uniqueness checks, and stock management.
- **Direct Purchases & Rentals Tracking**: Complex state machines for rental lifecycles (Pending -> Rented -> Completed/Cancelled).
- **Comprehensive Insurance & AMC Data**: API support for tracking Scooty/Rider insurance, Annual Maintenance Contracts, and Buybacks.
- **Secure File Handling**: Integration with Supabase Storage to issue short-lived signed URLs for vault documents.
- **Advanced Auth**:
  - Email & Password with JWT access tokens.
  - Refresh Token Rotation (hashed in DB).
  - Google OAuth2 authentication.
  - OTP Password Resets via Brevo SMTP.

## Tech Stack
- **Runtime**: Node.js + Express
- **Database**: Supabase (PostgreSQL) using `@supabase/supabase-js`
- **Auth & Crypto**: JWT, bcrypt, Google Auth Library
- **Email**: Brevo SMTP integration (Nodemailer)
- **Validation**: Zod (Strict payload sanitization)

## Setup
1. Duplicate `.env.example` to `.env`. You will need:
   - Supabase URL & Service Role Key
   - Google Client ID & Secret
   - Brevo SMTP Credentials
   - JWT Secret & Session configurations
2. Run `npm install`
3. Start development server: `npm run dev`
