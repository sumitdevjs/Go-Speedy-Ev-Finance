# 💻 Go Speedy EV Finance Scheme - Web Application

The interactive, lightning-fast frontend application for the Go Speedy EV Finance Scheme. Built with modern React paradigms to provide staff and admins with an intuitive, dynamic interface for managing the entire EV fleet operation.

## 🎨 Features & UI Capabilities

- **Interactive Registration Wizards**: Step-by-step, animated flows for Direct Purchases and Rental Registrations, significantly reducing data entry errors.
- **Comprehensive Dashboards**: Real-time metric views for Tenant management, Operations ledger, and overall business health.
- **Advanced Inventory Filtering**: Blazing fast search and filter capabilities for EV Model Inventory.
- **Secure Document Vault UI**: Seamless upload components for AMC, Insurance, and KYC Identity Documents with auto-compression.
- **Financial Views**: Clean UI for payment processing, installment tracking, and Buyback tracking.

### 🖼️ Beautiful & Dynamic Representation
The UI prioritizes a **premium aesthetic** using:
- Modern typography and clean glassmorphic elements.
- Fluid transitions and micro-animations via GSAP.
- Highly responsive layouts for desktop and tablet operation out in the field.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **State Management**: Zustand (for lightweight, scalable global state)
- **Data Fetching**: Axios (configured with auto-token refresh interceptors)
- **Form Handling**: `react-hook-form` paired with `zod` for robust client-side validation.
- **Optimization**: `browser-image-compression` for optimizing upload payloads.

### Directory Structure

```text
/src
├── app/            # Next.js App Router (Pages & Layouts)
├── components/     # Reusable UI primitives and complex components
├── hooks/          # Custom React hooks (e.g., useAuth)
├── lib/            # Utilities (Axios client setup, formatters)
└── store/          # Zustand store slices
```

## 🚀 Getting Started

1. **Pre-requisite**: Ensure the backend API server is running locally.

2. **Environment Setup**:
   Duplicate `.env.example` and rename to `.env.local`. Required variables typically include:
   - `NEXT_PUBLIC_API_URL` (e.g., http://localhost:5000)
   - Any public Google OAuth keys if handled client-side.

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   
The application will be available at `http://localhost:3001` (or your configured Next.js port). 

> **Note:** All UI components are modular and strictly reuse primitives from the `components/` directory to maintain design consistency.
