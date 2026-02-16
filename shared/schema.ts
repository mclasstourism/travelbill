import { z } from "zod";
import { pgTable, text, varchar, boolean, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Drizzle Table Definitions
export const usersTable = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  passwordHint: text("password_hint"),
  pin: varchar("pin", { length: 72 }),
  role: varchar("role", { length: 20 }).default("staff"),
  active: boolean("active").default(true),
});

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  token: varchar("token", { length: 10 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
});

export const customersTable = pgTable("customers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  company: varchar("company", { length: 255 }).default(""),
  address: text("address").default(""),
  email: varchar("email", { length: 255 }).default(""),
  depositBalance: real("deposit_balance").default(0),
});

export const agentsTable = pgTable("agents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  company: varchar("company", { length: 255 }).default(""),
  address: text("address").default(""),
  email: varchar("email", { length: 255 }).default(""),
  creditBalance: real("credit_balance").default(0),
  depositBalance: real("deposit_balance").default(0),
});

export const vendorsTable = pgTable("vendors", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).default(""),
  phone: varchar("phone", { length: 50 }).notNull(),
  address: text("address").default(""),
  creditBalance: real("credit_balance").default(0),
  depositBalance: real("deposit_balance").default(0),
  airlines: jsonb("airlines").default([]),
});

export const invoicesTable = pgTable("invoices", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  customerType: varchar("customer_type", { length: 20 }).default("customer"),
  customerId: varchar("customer_id", { length: 36 }).notNull(),
  vendorId: varchar("vendor_id", { length: 36 }).notNull(),
  items: jsonb("items").default([]),
  subtotal: real("subtotal").default(0),
  discountPercent: real("discount_percent").default(0),
  discountAmount: real("discount_amount").default(0),
  total: real("total").default(0),
  vendorCost: real("vendor_cost").default(0),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  useCustomerDeposit: boolean("use_customer_deposit").default(false),
  depositUsed: real("deposit_used").default(0),
  useAgentCredit: boolean("use_agent_credit").default(false),
  agentCreditUsed: real("agent_credit_used").default(0),
  useVendorBalance: varchar("use_vendor_balance", { length: 20 }).default("none"),
  vendorBalanceDeducted: real("vendor_balance_deducted").default(0),
  notes: text("notes").default(""),
  issuedBy: varchar("issued_by", { length: 36 }).notNull(),
  createdByName: varchar("created_by_name", { length: 255 }).default(""),
  status: varchar("status", { length: 20 }).default("issued"),
  paidAmount: real("paid_amount").default(0),
  refundAmount: real("refund_amount").default(0),
  refundMethod: varchar("refund_method", { length: 20 }),
  refundDate: varchar("refund_date", { length: 20 }),
  refundNotes: text("refund_notes").default(""),
  refundedBy: varchar("refunded_by", { length: 255 }).default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ticketsTable = pgTable("tickets", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: varchar("ticket_number", { length: 50 }).notNull().unique(),
  customerType: varchar("customer_type", { length: 20 }).default("customer"),
  customerId: varchar("customer_id", { length: 36 }).notNull(),
  vendorId: varchar("vendor_id", { length: 36 }).notNull(),
  invoiceId: varchar("invoice_id", { length: 36 }),
  tripType: varchar("trip_type", { length: 20 }).default("one_way"),
  ticketType: varchar("ticket_type", { length: 100 }).notNull(),
  route: varchar("route", { length: 255 }).notNull(),
  airlines: varchar("airlines", { length: 255 }).notNull(),
  flightNumber: varchar("flight_number", { length: 50 }).notNull(),
  flightTime: varchar("flight_time", { length: 10 }).notNull(),
  travelDate: varchar("travel_date", { length: 20 }).notNull(),
  returnDate: varchar("return_date", { length: 20 }),
  passengerName: varchar("passenger_name", { length: 255 }).notNull(),
  faceValue: real("face_value").default(0),
  vendorCost: real("vendor_cost").default(0),
  additionalCost: real("additional_cost").default(0),
  deductFromDeposit: boolean("deduct_from_deposit").default(false),
  depositDeducted: real("deposit_deducted").default(0),
  useAgentBalance: varchar("use_agent_balance", { length: 20 }).default("none"),
  agentBalanceDeducted: real("agent_balance_deducted").default(0),
  useVendorBalance: varchar("use_vendor_balance", { length: 20 }).default("none"),
  vendorBalanceDeducted: real("vendor_balance_deducted").default(0),
  issuedBy: varchar("issued_by", { length: 36 }).notNull(),
  createdByName: varchar("created_by_name", { length: 255 }).default(""),
  status: varchar("status", { length: 20 }).default("issued"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const depositTransactionsTable = pgTable("deposit_transactions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id", { length: 36 }).notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  referenceId: varchar("reference_id", { length: 36 }),
  referenceType: varchar("reference_type", { length: 20 }),
  balanceAfter: real("balance_after").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendorTransactionsTable = pgTable("vendor_transactions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id", { length: 36 }).notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).default("cash"),
  referenceId: varchar("reference_id", { length: 36 }),
  referenceType: varchar("reference_type", { length: 20 }),
  balanceAfter: real("balance_after").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentTransactionsTable = pgTable("agent_transactions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id", { length: 36 }).notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).default("cash"),
  referenceId: varchar("reference_id", { length: 36 }),
  referenceType: varchar("reference_type", { length: 20 }),
  balanceAfter: real("balance_after").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  email: z.string().optional().or(z.literal("")),
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
export const invoiceStatuses = ["draft", "issued", "paid", "partial", "cancelled", "refunded"] as const;
export type InvoiceStatus = typeof invoiceStatuses[number];

// Invoice line items
export const insertInvoiceItemSchema = z.object({
  sector: z.string().min(1, "Sector is required"),
  travelDate: z.string().min(1, "Travel date is required"),
  airlinesFlightNo: z.string().optional().default(""),
  pnr: z.string().optional().default(""),
  tktNo: z.string().optional().default(""),
  departureTime: z.string().optional().default(""),
  arrivalTime: z.string().optional().default(""),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  basicFare: z.coerce.number().min(0).default(0),
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
  useAgentCredit: z.boolean().default(false),
  agentCreditUsed: z.number().min(0).default(0),
  useVendorBalance: z.enum(vendorBalanceSources).default("none"),
  vendorBalanceDeducted: z.number().min(0).default(0),
  notes: z.string().optional().or(z.literal("")),
  issuedBy: z.string().min(1, "Bill creator is required"),
  createdByName: z.string().optional().default(""),
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = InsertInvoice & {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  createdAt: string;
  paidAmount: number;
  createdByName: string;
  refundAmount: number;
  refundMethod: string | null;
  refundDate: string | null;
  refundNotes: string;
  refundedBy: string;
};

// Tickets (for travel tickets)
export const ticketStatuses = ["issued", "used", "cancelled", "refunded"] as const;
export type TicketStatus = typeof ticketStatuses[number];

export const tripTypes = ["one_way", "round_trip"] as const;
export type TripType = typeof tripTypes[number];

export const insertTicketSchema = z.object({
  customerType: z.enum(["customer", "agent"]).default("customer"),
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
  vendorCost: z.number().min(0, "Vendor cost must be positive").default(0),
  additionalCost: z.number().min(0, "Additional cost must be positive").default(0),
  deductFromDeposit: z.boolean().default(false),
  depositDeducted: z.number().min(0).default(0),
  useAgentBalance: z.enum(vendorBalanceSources).default("none"),
  agentBalanceDeducted: z.number().min(0).default(0),
  useVendorBalance: z.enum(vendorBalanceSources).default("none"),
  vendorBalanceDeducted: z.number().min(0).default(0),
  issuedBy: z.string().min(1, "Bill creator is required"),
  createdByName: z.string().optional().default(""),
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = InsertTicket & {
  id: string;
  ticketNumber: string;
  status: TicketStatus;
  createdAt: string;
  createdByName: string;
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

// Agent credit transactions
export const insertAgentTransactionSchema = z.object({
  agentId: z.string().min(1, "Agent is required"),
  type: z.enum(depositTransactionTypes),
  transactionType: z.enum(["credit", "deposit"] as const), // credit given to agent or deposit received from agent
  amount: z.number().min(0.01, "Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  paymentMethod: z.enum(vendorPaymentMethods).optional(),
  referenceId: z.string().optional(),
  referenceType: z.string().optional(),
});

export type InsertAgentTransaction = z.infer<typeof insertAgentTransactionSchema>;
export type AgentTransaction = InsertAgentTransaction & {
  id: string;
  balanceAfter: number;
  paymentMethod: VendorPaymentMethod;
  createdAt: string;
};

// Cash Receipts
export const cashReceiptsTable = pgTable("cash_receipts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull().unique(),
  partyType: varchar("party_type", { length: 20 }).notNull(),
  partyId: varchar("party_id", { length: 36 }).notNull(),
  sourceType: varchar("source_type", { length: 20 }).notNull().default("flight"),
  pnr: varchar("pnr", { length: 50 }).default(""),
  serviceName: varchar("service_name", { length: 200 }).default(""),
  sector: varchar("sector", { length: 100 }).default(""),
  travelDate: varchar("travel_date", { length: 20 }).default(""),
  airlinesFlightNo: varchar("airlines_flight_no", { length: 100 }).default(""),
  tktNo: varchar("tkt_no", { length: 100 }).default(""),
  departureTime: varchar("departure_time", { length: 20 }).default(""),
  arrivalTime: varchar("arrival_time", { length: 20 }).default(""),
  basicFare: real("basic_fare").default(0),
  items: jsonb("items").default([]),
  amount: real("amount").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  description: text("description").default(""),
  referenceNumber: varchar("reference_number", { length: 100 }).default(""),
  issuedBy: varchar("issued_by", { length: 36 }).notNull(),
  createdByName: varchar("created_by_name", { length: 255 }).default(""),
  status: varchar("status", { length: 20 }).default("issued"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const receiptPartyTypes = ["customer", "agent", "vendor"] as const;
export type ReceiptPartyType = typeof receiptPartyTypes[number];

export const receiptPaymentMethods = ["cash", "card", "cheque", "bank_transfer"] as const;
export type ReceiptPaymentMethod = typeof receiptPaymentMethods[number];

export const receiptSourceTypes = ["flight", "other"] as const;
export type ReceiptSourceType = typeof receiptSourceTypes[number];

export const insertCashReceiptItemSchema = z.object({
  sector: z.string().min(1, "Sector is required"),
  travelDate: z.string().min(1, "Travel date is required"),
  airlinesFlightNo: z.string().optional().default(""),
  pnr: z.string().optional().default(""),
  tktNo: z.string().optional().default(""),
  departureTime: z.string().optional().default(""),
  arrivalTime: z.string().optional().default(""),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  basicFare: z.coerce.number().min(0).default(0),
});

export type CashReceiptItem = z.infer<typeof insertCashReceiptItemSchema>;

export const insertCashReceiptSchema = z.object({
  partyType: z.enum(receiptPartyTypes),
  partyId: z.string().min(1, "Party is required"),
  sourceType: z.enum(receiptSourceTypes),
  pnr: z.string().optional().or(z.literal("")),
  serviceName: z.string().optional().or(z.literal("")),
  sector: z.string().optional().or(z.literal("")),
  travelDate: z.string().optional().or(z.literal("")),
  airlinesFlightNo: z.string().optional().or(z.literal("")),
  tktNo: z.string().optional().or(z.literal("")),
  departureTime: z.string().optional().or(z.literal("")),
  arrivalTime: z.string().optional().or(z.literal("")),
  basicFare: z.coerce.number().optional().default(0),
  items: z.array(insertCashReceiptItemSchema).optional().default([]),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  paymentMethod: z.enum(receiptPaymentMethods),
  description: z.string().optional().or(z.literal("")),
  referenceNumber: z.string().optional().or(z.literal("")),
  issuedBy: z.string().min(1, "Issued by is required"),
  createdByName: z.string().optional().default(""),
});

export type InsertCashReceipt = z.infer<typeof insertCashReceiptSchema>;
export type CashReceipt = InsertCashReceipt & {
  id: string;
  receiptNumber: string;
  status: string;
  createdAt: string;
  createdByName: string;
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

export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  passwordHint: z.string().optional(),
  pin: z.string().optional(),
  role: z.enum(["admin", "staff"]).default("staff"),
  active: z.boolean().default(true),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = {
  id: string;
  username: string;
  password: string;
  email?: string;
  phone?: string;
  passwordHint?: string;
  pin?: string;
  role: "admin" | "staff";
  active: boolean;
};

// Password reset token
export type PasswordResetToken = {
  id: string;
  userId: string;
  token: string;
  expiresAt: number;
  used: boolean;
};
