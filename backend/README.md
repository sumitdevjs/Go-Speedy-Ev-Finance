# Go Speedy EV Finance Scheme - Backend

This is the Express REST API for the Go Speedy EV Finance Scheme.

## Tech Stack
- Node.js + Express
- Database: Supabase (PostgreSQL)
- Storage: Supabase Storage
- Auth: JWT + bcrypt (Refresh Token Rotation)
- Validation: Zod

## Setup
1. Duplicate `.env.example` to `.env` (ask the team for credentials)
2. Run `npm install`
3. Run `npm run dev`

This backend serves as the sole authorization boundary for the application, enforcing all security rules in code rather than relying on Supabase RLS.
