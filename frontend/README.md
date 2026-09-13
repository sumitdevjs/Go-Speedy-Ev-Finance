# Go Speedy EV Finance Scheme - Frontend

This is the Next.js frontend application for the Go Speedy EV Finance Scheme.

## Features

- Complete EV Model Inventory Management & Filtering
- Interactive Wizards for Direct Purchases & Rentals Registration
- Comprehensive Dashboards for Tenants, Ledger, and Operations
- Document Vault for AMC, Insurance, and Identity Documents
- Payment Processing and Buyback tracking UI

## Tech Stack

- Next.js 14 (App Router)
- State: Zustand
- HTTP Client: Axios (with auto token refresh)
- Forms: react-hook-form + zod
- Image Compression: browser-image-compression

## Setup

1. Ensure the backend is running locally.
2. Duplicate `.env.example` to `.env.local`
3. Run `npm install`
4. Run `npm run dev`

All UI components are modular and strictly reuse primitives from
`components/ui/`.
