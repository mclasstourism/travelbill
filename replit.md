# TravelBill - Travel Agency Billing Application

## Overview
A comprehensive billing application for travel agencies featuring invoice management, payment tracking, customer deposits, vendor credits, ticket issuance, and multi-level authentication. Supports three party types: Vendors, Agents (bulk buyers), and Individual Customers.

## Current State
MVP fully implemented with:
- Dashboard with key metrics and recent activity
- Customer management with deposit balances
- Agent management (bulk ticket buyers) with credit and deposit balances
- Vendor/Supplier management with credit and deposit tracking
- Invoice creation with party type selection (Customer or Agent), discount, multiple payment methods (cash/card/credit), and deposit usage
- Ticket issuance with deposit deduction and bulk CSV import
- Staff authentication with username/password and secure token-based sessions
- PIN authentication for bill creators (8-digit PIN)
- Role-based access control (admin, manager, staff)
- Email invoice sending via Resend integration
- Multi-currency support (7 currencies with AED conversion)
- Analytics and reporting with charts
- Activity logs for audit trail
- User management (admin only)
- All currency displays in AED

## Architecture

### Frontend (React + Vite)
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query for server state
- **UI Components**: Shadcn/UI with Radix primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Theming**: Dark/light mode with ThemeProvider
- **Authentication**: AuthContext with token-based sessions

### Backend (Express)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM
- **Validation**: Zod schemas
- **API Pattern**: REST endpoints under `/api/*`
- **Authentication**: Token-based with server-side session store
- **Email**: Resend integration for HTML invoice emails

### Key Files
- `shared/schema.ts` - Drizzle table definitions and Zod schemas
- `server/db.ts` - Database connection using Neon serverless
- `server/storage.ts` - DatabaseStorage class implementing all CRUD operations
- `server/routes.ts` - All API endpoints with auth middleware
- `client/src/App.tsx` - Main app with routing and providers
- `client/src/lib/auth-context.tsx` - Staff authentication context
- `client/src/lib/pin-context.tsx` - PIN authentication context
- `client/src/lib/theme-provider.tsx` - Theme context
- `client/src/lib/queryClient.ts` - API client with auth headers
- `client/src/lib/airlines.ts` - Airline data with logos for direct ticket booking

## Data Models
- **User**: Staff accounts with username, password hash, and role
- **BillCreator**: Staff members with 8-digit PIN for invoice/ticket creation
- **Customer**: Individual clients with deposit balance tracking
- **Agent**: Bulk ticket buyers with credit and deposit balances
- **Vendor**: Suppliers with credit and deposit balances, registered airlines
- **Invoice**: Billing records with line items, discounts, payment method, customer type
- **Ticket**: Travel tickets with face value and deposit deduction
- **DepositTransaction**: Customer deposit ledger entries
- **VendorTransaction**: Vendor credit/deposit ledger entries
- **ActivityLog**: Audit trail of user actions

## Authentication & Security

### Staff Login
- Username/password authentication
- Secure token-based sessions (32-byte hex tokens via crypto.randomBytes)
- Server-side session store with 24-hour expiration
- Token stored in localStorage, sent via Authorization header
- Default credentials: username "admin", password "admin123"

### Role-Based Access Control
- **superadmin**: Full access - user management, bill creators, all operations
- **staff**: All operations including analytics, activity logs, invoices, tickets, customers, agents, vendors (excludes user management and bill creator management)
- Superadmin can add one or more staff users
- Enforced server-side with requireAuth and requireRole middleware

### Bill Creator PIN
- 8-digit PIN for invoice/ticket creation
- Session persists for 30 minutes in localStorage
- Default test PIN: "12345678"

## Features

### Invoice Creation
- Select party type: Individual Customer or Agent
- Select customer/agent and vendor/supplier for each invoice
- Add multiple line items with quantity and price
- Apply percentage discount
- Choose payment method: cash, card, or credit
- Option to use customer/agent deposit balance
- Multi-currency support with AED conversion
- Email invoice to customer via Resend

### Ticket Issuance
- Select customer and vendor (or "Direct from Airline" for direct purchases)
- When "Direct from Airline" is selected, choose from 28 airlines with logos
- Supported airlines: Airblue, Air India Express, Air Arabia, Air Sial, Akasa Air, Biman Bangladesh, British Airways, Cathay Pacific, Emirates, Etihad, flydubai, Flynas, Gulf Air, IndiGo, Jazeera, Kuwait Airways, Malaysia Airlines, Oman Air, Philippine Airlines, PIA, Qatar Airways, SalamAir, Saudia, Singapore Airlines, SpiceJet, SriLankan, Turkish Airlines, US-Bangla
- Quick-add new customers directly from ticket form
- Enter passenger details and travel information
- Option to deduct from customer deposit
- Bulk CSV import with validation
- Automatic deposit balance updates

### Analytics & Reporting
- Revenue trends and charts
- Agent performance tracking
- Vendor comparison analysis
- Payment method distribution
- Monthly breakdown by vendor

### Activity Logs
- Complete audit trail of all actions
- Filter by action type and date range
- Admin and manager access only

### User Management
- Create/edit/delete staff accounts
- Assign roles (admin, manager, staff)
- Admin access only

## Running the App
The application runs on port 5000 using the workflow command `npm run dev`.

## User Preferences
- Dark mode support with toggle
- Professional financial interface design
- Monospace fonts for amounts and transaction IDs
