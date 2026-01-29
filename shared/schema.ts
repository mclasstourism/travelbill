import { z } from "zod";

// Bill Creators (staff who can create invoices with PIN auth)
export const billCreators = {
  id: "",
  name: "",
  pin: "", // 4-digit PIN stored as hashed
  active: true,
};

export const insertBillCreatorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  pin: z.string().length(8, "PIN must be 8 digits").regex(/^\d{8}$/, "PIN must be 8 numeric digits"),
});

export type InsertBillCreator = z.infer<typeof insertBillCreatorSchema>;
export type BillCreator = {
  id: string;
  name: string;
  pin: string;
  active: boolean;
};

// Customers
export const insertCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().min(1, "Phone number is required"),
  company: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  depositBalance: z.number().default(0),
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = {
  id: string;
  name: string;
  phone: string;
  company: string;
  address: string;
  email: string;
  depositBalance: number;
};

// Agents (bulk ticket buyers)
export const insertAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  phone: z.string().min(1, "Phone number is required"),
  company: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  creditBalance: z.number().default(0), // Credit we give to agent
  depositBalance: z.number().default(0), // Deposit received from agent
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = {
  id: string;
  name: string;
  phone: string;
  company: string;
  address: string;
  email: string;
  creditBalance: number;
  depositBalance: number;
};

// Vendor Airlines
export const insertVendorAirlineSchema = z.object({
  name: z.string().min(1, "Airline name is required"),
  code: z.string().optional().or(z.literal("")), // e.g., EK for Emirates
});

export type InsertVendorAirline = z.infer<typeof insertVendorAirlineSchema>;
export type VendorAirline = InsertVendorAirline & { id: string };

// Vendors/Suppliers
export const insertVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().optional().or(z.literal("")),
  creditBalance: z.number().default(0), // Credit given by vendor
  depositBalance: z.number().default(0), // Deposit made to vendor
  airlines: z.array(insertVendorAirlineSchema).default([]), // Airlines registered with this vendor
});

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  creditBalance: number;
  depositBalance: number;
  airlines: VendorAirline[];
};

// Payment methods
export const paymentMethods = ["cash", "card", "credit"] as const;
export type PaymentMethod = typeof paymentMethods[number];

// Invoice status
export const invoiceStatuses = ["draft", "issued", "paid", "partial", "cancelled"] as const;
export type InvoiceStatus = typeof invoiceStatuses[number];

// Invoice line items
export const insertInvoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Price must be positive"),
});

export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = InsertInvoiceItem & { id: string };

// Vendor balance source for invoice deduction
export const vendorBalanceSources = ["none", "credit", "deposit"] as const;
export type VendorBalanceSource = typeof vendorBalanceSources[number];

// Customer types for invoice
export const customerTypes = ["customer", "agent"] as const;
export type CustomerType = typeof customerTypes[number];

// Invoices
export const insertInvoiceSchema = z.object({
  customerType: z.enum(customerTypes).default("customer"), // Individual customer or agent
  customerId: z.string().min(1, "Customer/Agent is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  items: z.array(insertInvoiceItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0),
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
  total: z.number().min(0),
  vendorCost: z.number().min(0).default(0), // Actual cost from vendor
  paymentMethod: z.enum(paymentMethods),
  useCustomerDeposit: z.boolean().default(false),
  depositUsed: z.number().min(0).default(0),
  useVendorBalance: z.enum(vendorBalanceSources).default("none"),
  vendorBalanceDeducted: z.number().min(0).default(0),
  notes: z.string().optional().or(z.literal("")),
  issuedBy: z.string().min(1, "Bill creator is required"),
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = InsertInvoice & {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  createdAt: string;
  paidAmount: number;
};

// Tickets (for travel tickets)
export const ticketStatuses = ["issued", "used", "cancelled", "refunded"] as const;
export type TicketStatus = typeof ticketStatuses[number];

export const tripTypes = ["one_way", "round_trip"] as const;
export type TripType = typeof tripTypes[number];

export const insertTicketSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  invoiceId: z.string().optional(),
  tripType: z.enum(tripTypes).default("one_way"),
  ticketType: z.string().min(1, "Ticket type is required"),
  route: z.string().min(1, "Route is required"),
  airlines: z.string().min(1, "Airlines is required"),
  flightNumber: z.string().min(1, "Flight number is required"),
  flightTime: z.string().min(1, "Flight time is required"), // 24hr format HH:MM
  travelDate: z.string().min(1, "Travel date is required"),
  returnDate: z.string().optional(), // Only for round trip
  passengerName: z.string().min(1, "Passenger name is required"),
  faceValue: z.number().min(0, "Face value must be positive"),
  deductFromDeposit: z.boolean().default(false),
  depositDeducted: z.number().min(0).default(0),
  issuedBy: z.string().min(1, "Bill creator is required"),
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = InsertTicket & {
  id: string;
  ticketNumber: string;
  status: TicketStatus;
  createdAt: string;
};

// Deposit transactions for customers
export const depositTransactionTypes = ["credit", "debit"] as const;
export type DepositTransactionType = typeof depositTransactionTypes[number];

export const insertDepositTransactionSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  type: z.enum(depositTransactionTypes),
  amount: z.number().min(0.01, "Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  referenceId: z.string().optional(), // Invoice or ticket ID
  referenceType: z.string().optional(), // "invoice" or "ticket"
});

export type InsertDepositTransaction = z.infer<typeof insertDepositTransactionSchema>;
export type DepositTransaction = InsertDepositTransaction & {
  id: string;
  balanceAfter: number;
  createdAt: string;
};

// Vendor transaction payment methods
export const vendorPaymentMethods = ["cash", "cheque", "bank_transfer"] as const;
export type VendorPaymentMethod = typeof vendorPaymentMethods[number];

// Vendor credit transactions
export const insertVendorTransactionSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  type: z.enum(depositTransactionTypes),
  transactionType: z.enum(["credit", "deposit"] as const), // credit from vendor or deposit to vendor
  amount: z.number().min(0.01, "Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  paymentMethod: z.enum(vendorPaymentMethods).optional(),
  referenceId: z.string().optional(),
  referenceType: z.string().optional(),
});

export type InsertVendorTransaction = z.infer<typeof insertVendorTransactionSchema>;
export type VendorTransaction = InsertVendorTransaction & {
  id: string;
  balanceAfter: number;
  paymentMethod: VendorPaymentMethod;
  createdAt: string;
};

// Dashboard metrics
export type DashboardMetrics = {
  totalCustomers: number;
  totalVendors: number;
  totalInvoices: number;
  totalTickets: number;
  totalRevenue: number;
  pendingPayments: number;
  customerDepositsTotal: number;
  vendorCreditsTotal: number;
  recentInvoices: Invoice[];
  recentTickets: Ticket[];
};

// PIN session for authentication
export type PinSession = {
  billCreatorId: string;
  billCreatorName: string;
  authenticated: boolean;
  expiresAt: number;
};

// Keep existing user schema for compatibility
export const users = {
  id: "",
  username: "",
  password: "",
};

export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  passwordHint: z.string().optional(),
  pin: z.string().length(5).optional(),
  active: z.boolean().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = {
  id: string;
  username: string;
  password: string;
  name?: string;
  email?: string;
  phone?: string;
  passwordHint?: string;
  pin?: string;
  active?: boolean;
  role?: "superadmin" | "staff";
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
};

// Password reset token
export type PasswordResetToken = {
  id: string;
  userId: string;
  token: string;
  expiresAt: number;
  used: boolean;
};

// User roles for role-based permissions
export const userRoles = ["superadmin", "staff"] as const;
export type UserRole = typeof userRoles[number];

// Activity log actions
export const activityActions = [
  "create", "update", "delete", "login", "logout", "view", "export", "email"
] as const;
export type ActivityAction = typeof activityActions[number];

// Activity log entity types
export const activityEntities = [
  "invoice", "ticket", "customer", "agent", "vendor", "deposit", "user", "report"
] as const;
export type ActivityEntity = typeof activityEntities[number];

// Activity log entry
export type ActivityLog = {
  id: string;
  userId: string;
  userName: string;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: string;
  entityName: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
};

export const insertActivityLogSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  action: z.enum(activityActions),
  entity: z.enum(activityEntities),
  entityId: z.string(),
  entityName: z.string(),
  details: z.string(),
  ipAddress: z.string().optional(),
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Supported currencies
export const currencies = ["AED", "USD", "EUR", "GBP", "SAR", "INR", "PKR"] as const;
export type Currency = typeof currencies[number];

// Currency exchange rates (base: AED)
export type CurrencyRate = {
  code: Currency;
  name: string;
  rate: number; // Rate to convert to AED
  symbol: string;
};

// Document attachments
export const documentTypes = ["passport", "visa", "e_ticket", "id_card", "other"] as const;
export type DocumentType = typeof documentTypes[number];

export type DocumentAttachment = {
  id: string;
  entityType: "customer" | "agent" | "ticket" | "invoice";
  entityId: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
};

export const insertDocumentAttachmentSchema = z.object({
  entityType: z.enum(["customer", "agent", "ticket", "invoice"]),
  entityId: z.string(),
  documentType: z.enum(documentTypes),
  fileName: z.string(),
  fileUrl: z.string(),
  uploadedBy: z.string(),
});

export type InsertDocumentAttachment = z.infer<typeof insertDocumentAttachmentSchema>;

// Payment reminder
export type PaymentReminder = {
  id: string;
  invoiceId: string;
  customerId: string;
  customerEmail: string;
  amount: number;
  dueDate: string;
  reminderSent: boolean;
  reminderSentAt?: string;
  createdAt: string;
};

// Enhanced dashboard metrics with analytics
export type SalesAnalytics = {
  dailySales: { date: string; amount: number; count: number }[];
  topCustomers: { id: string; name: string; totalSpent: number; invoiceCount: number }[];
  topAgents: { id: string; name: string; totalSales: number; ticketCount: number }[];
  topRoutes: { route: string; count: number; revenue: number }[];
  vendorComparison: { id: string; name: string; totalCost: number; ticketCount: number; avgCost: number }[];
  profitByVendor: { vendorId: string; vendorName: string; revenue: number; cost: number; profit: number; margin: number }[];
};

// Bulk import result
export type BulkImportResult = {
  success: number;
  failed: number;
  errors: { row: number; error: string }[];
};

// 2FA settings
export type TwoFactorAuth = {
  userId: string;
  enabled: boolean;
  secret?: string;
  backupCodes?: string[];
  verifiedAt?: string;
};
