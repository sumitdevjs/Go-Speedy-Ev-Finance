# Go Speedy EV Finance Scheme

Production-grade EV Rent & Purchase Monitor System for Delhi operations.

## Overview
A comprehensive management platform tailored for EV fleet operations. The system handles the entire lifecycle: Wards supply EV scooties → Staff registers inventory → Tenants rent (≤ 24 months) or Direct Purchase → Auto-converts rentals to purchases on completion.

## Core Features
- **Fleet Inventory Management**: Track in-stock/out-of-stock EV models, pricing, and ward distribution.
- **Rental & Purchase Wizards**: Interactive multi-step registration forms for seamless onboarding.
- **Financial Ledger**: Track daily/weekly/monthly installments, downpayments, booking amounts, and AMC (Annual Maintenance Contracts).
- **Insurance & Security**: Full tracking of Scooty and Rider insurance (IDV, expiry), vehicle registration, chassis/motor uniqueness checks, and buyback structures.
- **Document Vault**: Secure uploads for Aadhar, PAN, Rent Agreements, AMC Documents, and Identity Photos.
- **Authentication**: JWT-based auth with rotating refresh tokens, OAuth2 (Google Sign-In), and email OTP password resets via Brevo SMTP.
- **Audit Logging**: Comprehensive admin logs for all staff activities and system changes.

## Architecture & Tech Stack
- **Backend:** Node.js + Express (REST APIs)
- **Database:** Supabase (PostgreSQL) - 6 core tables with strict schema validations.
- **File Storage:** Supabase Storage (private buckets + temporary signed URLs for security).
- **Authentication:** JWT Access tokens + bcrypt hashed Refresh Tokens + Google OAuth Integration.
- **Email Service:** Brevo SMTP for OTP and account recovery.
- **Frontend:** Next.js 14 (App Router) with Zustand state management and GSAP animations.
- **Deployment:** Vercel (Backend and Frontend deployed as separate projects).
- **Validation:** `zod` schemas for backend request sanitization and frontend form validation (`react-hook-form`).

## Project Structure
This repository is a monorepo containing:
- `/backend` - Express API server
- `/frontend` - Next.js 14 web application

## Setup Instructions
1. Clone the repository.
2. Navigate into `/backend` and `/frontend` separately to install dependencies (`npm install`).
3. Set up the environment variables (Ask the development team for `.env` credentials, including Supabase, Google OAuth, and Brevo keys).
4. Run `npm run dev` in both directories to start the local development environment.