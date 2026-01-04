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
  pin: z.string().length(4, "PIN must be 4 digits").regex(/^\d{4}$/, "PIN must be numeric"),
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
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  depositBalance: z.number().default(0),
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  depositBalance: number;
};

// Vendors/Suppliers
export const insertVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  creditBalance: z.number().default(0), // Credit given by vendor
  depositBalance: z.number().default(0), // Deposit made to vendor
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

// Invoices
export const insertInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  items: z.array(insertInvoiceItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0),
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
  total: z.number().min(0),
  paymentMethod: z.enum(paymentMethods),
  useCustomerDeposit: z.boolean().default(false),
  depositUsed: z.number().min(0).default(0),
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

export const insertTicketSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  invoiceId: z.string().optional(),
  ticketType: z.string().min(1, "Ticket type is required"),
  route: z.string().min(1, "Route is required"),
  travelDate: z.string().min(1, "Travel date is required"),
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

// Vendor credit transactions
export const insertVendorTransactionSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  type: z.enum(depositTransactionTypes),
  transactionType: z.enum(["credit", "deposit"] as const), // credit from vendor or deposit to vendor
  amount: z.number().min(0.01, "Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  referenceId: z.string().optional(),
  referenceType: z.string().optional(),
});

export type InsertVendorTransaction = z.infer<typeof insertVendorTransactionSchema>;
export type VendorTransaction = InsertVendorTransaction & {
  id: string;
  balanceAfter: number;
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
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = {
  id: string;
  username: string;
  password: string;
};
