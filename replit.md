# TravelBill - Travel Agency Billing Application

## Overview
A comprehensive billing application for travel agencies featuring invoice management, payment tracking, customer deposits, vendor credits, ticket issuance, and PIN-based authentication for bill creators.

## Current State
MVP fully implemented with:
- Dashboard with key metrics and recent activity
- Customer management with deposit balances
- Vendor/Supplier management with credit and deposit tracking
- Invoice creation with discount, multiple payment methods (cash/card/credit), and deposit usage
- Ticket issuance with deposit deduction
- PIN authentication for bill creators
- Customer deposit management with transaction history
- Vendor credit/deposit transaction tracking

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
- **Storage**: In-memory storage (MemStorage class)
- **Validation**: Zod schemas
- **API Pattern**: REST endpoints under `/api/*`

### Key Files
- `shared/schema.ts` - All data models and Zod schemas
- `server/storage.ts` - Storage interface and in-memory implementation
- `server/routes.ts` - All API endpoints
- `client/src/App.tsx` - Main app with routing and providers
- `client/src/lib/pin-context.tsx` - PIN authentication context
- `client/src/lib/theme-provider.tsx` - Theme context

## Data Models
- **BillCreator**: Staff members with 4-digit PIN for authentication
- **Customer**: Clients with deposit balance tracking
- **Vendor**: Suppliers with credit and deposit balances
- **Invoice**: Billing records with line items, discounts, payment method
- **Ticket**: Travel tickets with face value and deposit deduction
- **DepositTransaction**: Customer deposit ledger entries
- **VendorTransaction**: Vendor credit/deposit ledger entries

## Features

### PIN Authentication
- Bill creators must authenticate with 8-digit PIN before creating invoices or issuing tickets
- Session persists for 30 minutes in localStorage
- Default test account: "Admin" with PIN "12345678"

### Invoice Creation
- Select customer and vendor/supplier for each invoice
- Add multiple line items with quantity and price
- Apply percentage discount
- Choose payment method: cash, card, or credit
- Option to use customer deposit balance
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
