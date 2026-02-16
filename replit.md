# MCT - Tourism Organizers - Billing Application

## Overview
A comprehensive billing application for travel agencies featuring invoice management, payment tracking, customer deposits, vendor credits, and ticket issuance. Supports three party types: Vendors, Agents (bulk buyers), and Individual Customers.

## Current State
MVP fully implemented with:
- Dashboard with key metrics and recent activity
- Customer management with deposit balances
- Agent management (bulk ticket buyers) with credit and deposit balances
- Vendor/Supplier management with credit and deposit tracking
- Invoice creation with party type selection (Customer or Agent), discount, multiple payment methods (cash/card/credit), and deposit usage
- Ticket issuance with deposit deduction
- Customer deposit management with transaction history
- Vendor credit/deposit transaction tracking
- Cash receipt creation and printing with party selection, payment method, reference tracking
- Invoice cancellation with automatic balance refunds (deposit, credit, vendor balance)
- Invoice refund processing with PIN verification, payment method tracking, and audit trail
- All currency displays in AED

## Architecture

### Frontend (React + Vite)
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query for server state
- **UI Components**: Shadcn/UI with Radix primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Theming**: Dark/light mode with ThemeProvider

### Backend (Express)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM (PgStorage class)
- **Validation**: Zod schemas
- **API Pattern**: REST endpoints under `/api/*`
- **Email**: Resend integration for password reset emails

### Key Files
- `shared/schema.ts` - Drizzle table definitions and Zod schemas
- `server/db.ts` - PostgreSQL database connection
- `server/pg-storage.ts` - PostgreSQL storage implementation
- `server/storage.ts` - Storage interface
- `server/routes.ts` - All API endpoints
- `server/lib/resend.ts` - Email service for password reset
- `client/src/App.tsx` - Main app with routing and providers
- `client/src/lib/theme-provider.tsx` - Theme context

## Data Models
- **User**: Staff members with username, password, and role (admin/staff)
- **Customer**: Individual clients with deposit balance tracking
- **Agent**: Bulk ticket buyers with credit and deposit balances
- **Vendor**: Suppliers with credit and deposit balances, registered airlines
- **Invoice**: Billing records with travel-specific line items (sector, travel date, airlines/flight no, PNR, TKT no, amount, basic fare, tax), discounts, payment method, customer type (customer or agent)
- **Ticket**: Travel tickets with face value and deposit deduction
- **DepositTransaction**: Customer deposit ledger entries
- **VendorTransaction**: Vendor credit/deposit ledger entries
- **CashReceipt**: Payment receipts with party type, amount, payment method, reference tracking

## Features

### Staff Login & Role-Based Access
- Username/password authentication for staff members
- Default staff login: username "admin", password "admin123"
- Email-based password reset using Resend (for admin accounts)
- Role-based access control:
  - **Admin role**: Full access including Settings
  - **Staff role**: Cannot access Settings section

### Invoice Creation
- Select party type: Individual Customer or Agent
- Select customer/agent and vendor/supplier for each invoice
- Add multiple travel line items with: Sector, Travel Date, Airlines/Flight No, PNR, TKT No, Amount (AED), Basic Fare, Tax
- Apply percentage discount
- Choose payment method: cash, card, or credit
- Option to use customer/agent deposit balance
- Automatic total calculation

### Ticket Issuance
- Select customer and vendor
- Enter passenger details and travel information
- Option to deduct from customer deposit
- Automatic deposit balance updates

### Customer Deposits
- View total deposits and transaction history
- Add deposits to customer accounts
- Track debits from invoices and tickets

### Vendor Credits
- Track credit from vendors (credit line)
- Track deposits made to vendors
- View transaction history

## Running the App
The application runs on port 5000 using the workflow command `npm run dev`.

## User Preferences
- Dark mode support with toggle
- Professional financial interface design
- Monospace fonts for amounts and transaction IDs
