# Go Speedy EV Finance Scheme - Frontend Web Application

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16.4-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-4.5-443E38?style=for-the-badge&logo=redux&logoColor=white)](https://github.com/pmndrs/zustand)
[![GSAP](https://img.shields.io/badge/GSAP-3.15-88CE02?style=for-the-badge&logo=greensock&logoColor=white)](https://gsap.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<p align="center">
  <b>The interactive, responsive web application for Go Speedy EV Finance Scheme. Built with Next.js 16 App Router, dynamic GSAP animations, OGL 3D WebGL shaders, Zustand state management, and role-tailored operational dashboards.</b>
</p>

</div>

---

## Overview

The Go Speedy Frontend provides administrative personnel, zonal managers, branch leads, and field staff with an intuitive command center for EV fleet operations. It features animated multi-step customer registration wizards, live financial ledgers, stock management across 46+ municipal wards, client-side document photo compression, and one-click Excel report exports.

---

## Full Frontend Tech Stack

| Category | Technology | Version | Purpose & Implementation Details |
| :--- | :--- | :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) | `16.4.3` | React framework with App Router, server-side route proxy rewrites, and fast compilation. |
| **Core UI Library** | [React](https://react.dev/) / [React DOM](https://react.dev/) | `18.3.1` | Declarative component UI engine with modern hooks and concurrent rendering. |
| **Styling & CSS** | [Tailwind CSS](https://tailwindcss.com/) | `3.4.4` | Utility-first CSS framework with dynamic dark/light mode theming and custom extensions. |
| **CSS Processing** | [PostCSS](https://postcss.org/) / [Autoprefixer](https://github.com/postcss/autoprefixer) | `8.4.39` / `10.4.19` | Automated CSS prefixing, optimization, and Tailwind AST compilation. |
| **Animation Engine** | [GSAP](https://gsap.com/) & [@gsap/react](https://gsap.com/resources/React/) | `3.15.0` / `2.1.2` | High-performance animation engine used for KPI number tickers, fluid fade-ins, and hero transitions. |
| **3D & Shaders** | [OGL](https://github.com/oframe/ogl) | `1.0.11` | Minimal WebGL library powering interactive, responsive 3D fluid/metal canvas shaders on the landing page. |
| **Smooth Scrolling** | [Lenis](https://lenis.darkroom.engineering/) | `1.3.26` | Butter-smooth inertial scrolling physics across all dashboard interfaces. |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) | `4.5.4` | Lightweight, scalable state management for authentication, modals, branch switching, and UI state. |
| **Forms & Validation** | [React Hook Form](https://react-hook-form.com/) | `7.52.1` | High-speed, un-controlled form state manager minimizing unnecessary re-renders. |
| **Schema Validation** | [Zod](https://zod.dev/) & [@hookform/resolvers](https://github.com/react-hook-form/resolvers) | `4.6.7` / `5.x` | Strict schema validation sharing identical rules between frontend forms and backend controllers. |
| **Icons** | [Lucide React](https://lucide.dev/) | `0.400.0` | Clean, modern iconography system covering financial, vehicular, and administrative actions. |
| **HTTP Client** | [Axios](https://axios-http.com/) | `1.7.2` | Intercepted HTTP client handling automated token refreshes, queue retries, and `X-HTTP-Method-Override: PATCH`. |
| **Image Compression** | [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression) | `2.0.2` | Client-side compression of customer KYC photos, PAN, Aadhaar, and vehicle images before upload. |
| **Report Exporting** | [XLSX (SheetJS)](https://sheetjs.com/) | `0.20.3` | Client-side generation and instant export of detailed Excel spreadsheets for fleet and collections audits. |

---

## Key Modules & UI Features

### 1. Role-Adaptive Command Dashboards
The dashboard dynamically renders the appropriate interface based on the authenticated user role:
- **`HoDashboard`**: Zonal Command Center for HO Admins. Aggregates live collections, zero-stock ward alerts, zonal delinquency lists, and branch comparison matrix.
- **`BranchDashboard`**: Ward Depot view for Branch Admins. Displays local fleet availability, collector performance, and overdue customer alerts.
- **`StaffDashboard`**: Ground operator view equipped with quick payment modals, EV return checklists, and walk-in customer lookups.

### 2. Multi-Step Onboarding Wizards
- **Rental Wizard (`/rentals/new`)**: Step-by-step registration capturing customer KYC, guarantor references, hardware serial numbers (chassis, motor, battery), insurance policies, downpayment, and rent agreement signatures.
- **Direct Purchase Wizard (`/purchases/new`)**: Fast registration flow for upfront vehicle sales with GST breakdowns and delivery documentation.

### 3. Visual Experience & Animations
- **Molten Metal WebGL Canvas**: Custom interactive 3D fluid shader powered by OGL rendered on the landing page.
- **Lenis Inertial Scroll**: Smooth hardware-accelerated scrolling throughout the application.
- **GSAP Dynamic Counters**: Real-time ticker animations on financial KPIs and fleet statistics.

### 4. Client-Side Document Optimization
- Automatically compresses high-resolution smartphone photos of Aadhaar cards, PAN cards, and vehicles via `browser-image-compression` before sending multipart payloads to the backend API.

### 5. Resilient Axios Interceptors
- **Silent Token Refresh**: Intercepts `401 Unauthorized` responses and queues pending requests while requesting a new access token via refresh token cookies.
- **Branch Context Injection**: Automatically adds `x-branch-id` header from local state when an administrator switches active branch context.
- **Method Override**: Converts client-side `PATCH` requests to `PUT` with `X-HTTP-Method-Override: PATCH` to ensure proxy compatibility.

---

## Directory Structure

```text
frontend/
├── public/                           # Static Web Assets, Branding, Favicons
├── src/
│   ├── app/                          # Next.js App Router Structure
│   │   ├── (dashboard)/              # Authenticated Shell with Persistent Sidebar
│   │   │   ├── audit/                # Audit Trail Explorer
│   │   │   ├── bookings/             # Booking Tokens Management
│   │   │   ├── branches/             # Ward Branch Directory & Management
│   │   │   ├── dashboard/            # Dynamic Role-Based Command Centers
│   │   │   ├── models/               # EV Models Catalog & Stock Manager
│   │   │   │   └── [id]/             # Single Model Details & Stock History
│   │   │   ├── purchases/            # Direct Sales Directory
│   │   │   │   ├── [id]/             # Single Sale Details & Printable Receipt
│   │   │   │   └── new/              # Direct Purchase Registration Wizard
│   │   │   ├── rentals/              # Rental Contracts Directory
│   │   │   │   ├── [id]/             # Rental Details, Ledger, & Return Modal
│   │   │   │   └── new/              # Multi-step Rental Onboarding Wizard
│   │   │   └── staff/                # Staff & Personnel Management
│   │   ├── globals.css               # Tailwind CSS Base & Theme Directives
│   │   ├── layout.js                 # Global Root HTML & Theme Wrapper
│   │   └── page.js                   # Landing Page (Interactive 3D Molten Metal Shader)
│   ├── components/
│   │   ├── branch/                   # BranchDashboard Components
│   │   ├── dashboard/                # Sustainability Metrics & Common Widgets
│   │   ├── ho/                       # HoDashboard Zonal Command Components
│   │   ├── layout/                   # Header, Sidebar, ProtectedRoute, BranchSwitcher
│   │   ├── staff/                    # StaffDashboard, QuickPaymentModal, ReturnEvModal
│   │   └── ui/                       # Design System Components (Card, Table, Badge, etc.)
│   ├── hooks/
│   │   └── useImageCompress.js       # Client-side Image Compression Hook
│   ├── lib/
│   │   ├── api.js                    # Axios Client with Auto-Refresh & Interceptors
│   │   ├── confirmDialog.js          # Imperative Modal Dialog Trigger
│   │   ├── constants.js              # System Roles, Status Codes, & Ward Maps
│   │   ├── exportToExcel.js          # SheetJS Excel Exporter Utility
│   │   ├── gsap.js                   # Reusable GSAP Animation Helper Routines
│   │   └── toast.js                  # Global Toast Notification Dispatcher
│   └── store/
│       ├── authStore.js              # Zustand Authentication & Permissions Store
│       ├── sidebarContext.js         # Responsive Sidebar Context
│       ├── themeContext.js           # Dark / Light Theme Toggle Context
│       └── uiStore.js                # Global UI & Modal State Store
├── .env.local                        # Frontend Environment Configuration
├── next.config.js                    # Next.js Proxy Rewrites & Route Configurations
├── tailwind.config.js                # Tailwind CSS Configuration
└── package.json                      # Frontend Dependencies & Scripts
```

---

## App Routes Reference

| Route | Role Access | Purpose |
| :--- | :--- | :--- |
| `/` | Public | Landing page with interactive 3D shader, staff login, and password reset OTP modal. |
| `/dashboard` | Authenticated | Dynamic role dashboard (`HoDashboard`, `BranchDashboard`, or `StaffDashboard`). |
| `/branches` | Admin / HO / Branch | Ward branch directory, contact persons, and operational status management. |
| `/staff` | Admin / HO / Branch | Staff roster, role creation (`branch_admin`, `staff`), and branch attribution. |
| `/models` | All Roles | New EV catalog, stock counters by ward, and refurbished scooter tabs. |
| `/models/[id]` | All Roles | EV model specs, unit pricing, and chronological stock adjustments log. |
| `/rentals` | All Roles | Active, completed, and overdue rental contracts directory with search. |
| `/rentals/new` | All Roles | 6-step customer rental onboarding wizard. |
| `/rentals/[id]` | All Roles | Detailed agreement ledger, payment history, penalty waivers, and EV return action. |
| `/purchases` | All Roles | Direct vehicle purchases directory. |
| `/purchases/new` | All Roles | Direct purchase registration wizard. |
| `/purchases/[id]` | All Roles | Direct sale contract, invoice print preview, and customer information. |
| `/bookings` | All Roles | Token booking directory with deposit amounts and conversion actions. |
| `/audit` | Super Admin / HO | Immutable system activity log with actor attribution and JSON delta diffs. |

---

## Local Setup & Getting Started

### 1. Prerequisites
- **Node.js**: `v20.9+` (Node 24 verified)
- **Backend API**: The Express API server must be running on `http://localhost:5000`.

### 2. Configure Environment (`.env.local`)
Create or update `frontend/.env.local`:

```ini
NEXT_PUBLIC_API_URL=http://localhost:5000
```

> **Note on Proxy Rewrites**: Next.js automatically rewrites `/api/*` requests to the destination configured in `NEXT_PUBLIC_API_URL` (see `next.config.js`). This ensures all session cookies operate on the same origin from the browser perspective, avoiding cross-site cookie restrictions.

### 3. Install Dependencies & Run
```bash
npm install
npm run dev
```

The application will be accessible at:
`http://localhost:3001`

---

## Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server on port 3001 with Fast Refresh. |
| `npm run build` | Compiles and builds the production Next.js bundle. |
| `npm start` | Starts the built production server on port 3001. |
| `npm run lint` | Runs standalone Next.js and React Hooks ESLint checks across all pages and components. |

---

## License

This project is licensed under the [MIT License](LICENSE).
