# Travel Agency Billing Application - Design Guidelines

## Design Approach
**System-Based Approach**: Material Design with enterprise modifications for data-heavy financial interfaces. This provides robust patterns for complex forms, tables, and transaction workflows while maintaining professional credibility.

## Typography System
- **Primary Font**: Inter (via Google Fonts CDN)
- **Monospace Font**: JetBrains Mono (for invoice numbers, amounts, transaction IDs)

**Hierarchy**:
- Page Headers: text-2xl font-semibold
- Section Headers: text-lg font-medium
- Form Labels: text-sm font-medium
- Body Text: text-base font-normal
- Metadata/Timestamps: text-sm font-normal
- Numbers/Amounts: text-base font-mono font-semibold

## Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 exclusively
- Component padding: p-4 or p-6
- Section spacing: space-y-6 or space-y-8
- Form field gaps: gap-4
- Card spacing: p-6

**Grid Structure**:
- Main container: max-w-7xl mx-auto
- Two-column layouts for form sections: grid grid-cols-1 lg:grid-cols-2 gap-6
- Dashboard metrics: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4

## Component Library

### Navigation
- Sidebar navigation (fixed left): w-64 with collapsible mobile drawer
- Top bar: sticky header with user profile, notifications, quick actions
- Breadcrumb trail for nested sections

### Forms & Inputs
- Text inputs: Full-width with floating labels, h-12
- Select dropdowns: Custom styled with search functionality for vendor/customer selection
- Number inputs (amounts): Right-aligned text, monospace font
- Date pickers: Calendar modal with range selection for invoice dates
- Payment method selector: Radio button cards with icons
- PIN entry: 4-6 digit numeric input with masked display

### Data Display
- Invoice table: Striped rows, sticky header, sortable columns
- Transaction history: Timeline-style list with status indicators
- Customer/Vendor cards: Compact display with key info (name, balance, last transaction)
- Deposit balance: Large emphasized display with trend indicator

### Actions & Controls
- Primary CTA (Create Invoice, Issue Ticket): Prominent positioning
- Secondary actions: Ghost or outlined style
- Destructive actions (void invoice): Require confirmation modal
- Quick action buttons: Icon + label combination

### Overlays
- Invoice creation modal: Multi-step wizard (customer → items → payment → review)
- PIN authentication: Centered modal with numeric keypad
- Confirmation dialogs: Clear action buttons
- Success/error toast notifications: Top-right positioning

### Status Indicators
- Payment status badges: Pill-shaped with distinct states (paid, pending, overdue, partial)
- Ticket status: Icon + text combination
- Vendor credit availability: Visual meter/progress bar

## Icons
**Library**: Heroicons (via CDN)
- Financial icons: currency-dollar, credit-card, receipt-refund
- Actions: plus, pencil, trash, check, x-mark
- Navigation: home, document-text, users, cog

## Animations
**Minimal and purposeful**:
- Form field focus: Subtle border transition
- Modal entry/exit: Fade + slight scale
- Toast notifications: Slide-in from right
- Loading states: Spinner for data fetching

## Accessibility
- All form inputs with visible labels and ARIA attributes
- Keyboard navigation throughout application
- Focus indicators on all interactive elements
- Error states with descriptive text and icons
- High contrast for financial data and amounts

## Images
No hero images or marketing visuals. This is a utility application focused on data entry and financial transactions. Use icon-based visual hierarchy instead.