import { z } from "zod";
import { pgTable, text, integer, boolean, timestamp, doublePrecision, json, varchar, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";

// ===== DRIZZLE DATABASE TABLES =====

// Users table
export const usersTable = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  plainPassword: varchar("plain_password", { length: 255 }),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  passwordHint: varchar("password_hint", { length: 255 }),
  pin: varchar("pin", { length: 10 }),
  active: boolean("active").default(true),
  role: varchar("role", { length: 20 }).default("staff"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bill Creators table
export const billCreatorsTable = pgTable("bill_creators", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  pin: varchar("pin", { length: 255 }).notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers table
export const customersTable = pgTable("customers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  company: varchar("company", { length: 255 }).default(""),
  address: text("address").default(""),
  email: varchar("email", { length: 255 }).default(""),
  depositBalance: doublePrecision("deposit_balance").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Agents table
export const agentsTable = pgTable("agents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  company: varchar("company", { length: 255 }).default(""),
  address: text("address").default(""),
  email: varchar("email", { length: 255 }).default(""),
  creditBalance: doublePrecision("credit_balance").default(0),
  depositBalance: doublePrecision("deposit_balance").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vendors table
export const vendorsTable = pgTable("vendors", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).default(""),
  phone: varchar("phone", { length: 50 }).default(""),
  telephone: varchar("telephone", { length: 50 }).default(""),
  address: text("address").default(""),
  logo: varchar("logo", { length: 500 }).default(""),
  creditBalance: doublePrecision("credit_balance").default(0),
  depositBalance: doublePrecision("deposit_balance").default(0),
  airlines: json("airlines").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// Airlines table (master list)
export const airlinesTable = pgTable("airlines", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  logo: text("logo").default(""),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoices table
export const invoicesTable = pgTable("invoices", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  customerType: varchar("customer_type", { length: 20 }).default("customer"),
  customerId: varchar("customer_id", { length: 36 }).notNull(),
  vendorId: varchar("vendor_id", { length: 36 }).notNull(),
  items: json("items").default([]),
  subtotal: doublePrecision("subtotal").notNull(),
  discountPercent: doublePrecision("discount_percent").default(0),
  discountAmount: doublePrecision("discount_amount").default(0),
  total: doublePrecision("total").notNull(),
  vendorCost: doublePrecision("vendor_cost").default(0),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  useCustomerDeposit: boolean("use_customer_deposit").default(false),
  depositUsed: doublePrecision("deposit_used").default(0),
  useVendorBalance: varchar("use_vendor_balance", { length: 20 }).default("none"),
  vendorBalanceDeducted: doublePrecision("vendor_balance_deducted").default(0),
  notes: text("notes").default(""),
  issuedBy: varchar("issued_by", { length: 36 }).notNull(),
  status: varchar("status", { length: 20 }).default("issued"),
  paidAmount: doublePrecision("paid_amount").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tickets table
export const ticketsTable = pgTable("tickets", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: varchar("ticket_number", { length: 50 }), // Legacy single ticket number
  ticketNumbers: text("ticket_numbers").array(), // Array of ticket numbers (one per passenger)
  pnr: varchar("pnr", { length: 10 }), // Booking reference (6 chars typically)
  customerId: varchar("customer_id", { length: 36 }).notNull(),
  vendorId: varchar("vendor_id", { length: 36 }),
  invoiceId: varchar("invoice_id", { length: 36 }),
  tripType: varchar("trip_type", { length: 20 }).default("one_way"),
  seatClass: varchar("seat_class", { length: 20 }).default("economy"), // economy, business, first
  route: varchar("route", { length: 255 }).notNull(),
  airlines: varchar("airlines", { length: 255 }).notNull(),
  flightNumber: varchar("flight_number", { length: 50 }), // Optional at initial booking
  travelDate: varchar("travel_date", { length: 20 }).notNull(),
  returnDate: varchar("return_date", { length: 20 }),
  passengerName: varchar("passenger_name", { length: 255 }).notNull(), // Primary/lead passenger
  passengerNames: text("passenger_names").array(), // All passenger names (array for each ticket)
  passengers: text("passengers").array(), // Additional passengers (JSON array of names)
  passengerCount: integer("passenger_count").default(1), // Total number of passengers
  vendorPrice: doublePrecision("vendor_price").default(0), // Price from vendor
  airlinePrice: doublePrecision("airline_price").default(0), // Airline's price
  middleClassPrice: doublePrecision("middle_class_price").default(0), // Middle Class Tourism's price/margin
  faceValue: doublePrecision("face_value").notNull(), // Final price to customer
  deductFromDeposit: boolean("deduct_from_deposit").default(false),
  depositDeducted: doublePrecision("deposit_deducted").default(0),
  eticketImage: varchar("eticket_image", { length: 500 }), // Legacy: URL to first e-ticket file
  eticketFiles: text("eticket_files").array(), // Array of e-ticket file URLs (PDF or images)
  issuedBy: varchar("issued_by", { length: 36 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, processing, approved, issued, used, cancelled, refunded
  createdAt: timestamp("created_at").defaultNow(),
});

// Deposit Transactions table
export const depositTransactionsTable = pgTable("deposit_transactions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id", { length: 36 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  amount: doublePrecision("amount").notNull(),
  description: text("description").notNull(),
  referenceId: varchar("reference_id", { length: 36 }),
  referenceType: varchar("reference_type", { length: 50 }),
  balanceAfter: doublePrecision("balance_after").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vendor Transactions table
export const vendorTransactionsTable = pgTable("vendor_transactions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id", { length: 36 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(),
  amount: doublePrecision("amount").notNull(),
  description: text("description").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).default("cash"),
  referenceId: varchar("reference_id", { length: 36 }),
  referenceType: varchar("reference_type", { length: 50 }),
  balanceAfter: doublePrecision("balance_after").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity Logs table
export const activityLogsTable = pgTable("activity_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  entity: varchar("entity", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 36 }).notNull(),
  entityName: varchar("entity_name", { length: 255 }).notNull(),
  details: text("details").notNull(),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents table
export const documentsTable = pgTable("documents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 36 }).notNull(),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedBy: varchar("uploaded_by", { length: 36 }).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Password Reset Tokens table
export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===== ZOD SCHEMAS AND TYPES =====

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
  phone: z.string().optional().or(z.literal("")),
  telephone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  logo: z.string().optional().or(z.literal("")),
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
  telephone: string;
  address: string;
  logo: string;
  creditBalance: number;
  depositBalance: number;
  airlines: VendorAirline[];
};

// Airlines (master list)
export const insertAirlineSchema = createInsertSchema(airlinesTable).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Airline name is required"),
  code: z.string().min(2, "Airline code is required").max(3, "Airline code must be 2-3 characters"),
});

export type InsertAirline = z.infer<typeof insertAirlineSchema>;
export type Airline = typeof airlinesTable.$inferSelect;

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
export const ticketStatuses = ["pending", "processing", "approved", "issued", "used", "cancelled", "refunded"] as const;
export type TicketStatus = typeof ticketStatuses[number];

export const tripTypes = ["one_way", "round_trip"] as const;
export type TripType = typeof tripTypes[number];

export const seatClasses = ["economy", "business", "first"] as const;
export type SeatClass = typeof seatClasses[number];

export const insertTicketSchema = z.object({
  ticketNumber: z.string().optional(), // Legacy single ticket number
  ticketNumbers: z.array(z.string()).optional(), // Array of ticket numbers (one per passenger)
  pnr: z.string().optional(), // Booking reference
  customerId: z.string().min(1, "Customer is required"),
  vendorId: z.string().optional(), // Optional - "direct" or empty means direct from airline
  invoiceId: z.string().optional(),
  tripType: z.enum(tripTypes).default("one_way"),
  seatClass: z.enum(seatClasses).default("economy"),
  route: z.string().min(1, "Route is required"),
  airlines: z.string().min(1, "Airlines is required"),
  flightNumber: z.string().optional(), // Optional at initial booking
  travelDate: z.string().min(1, "Travel date is required"),
  returnDate: z.string().optional(), // Only for round trip
  passengerName: z.string().min(1, "Passenger name is required"),
  passengerNames: z.array(z.string()).optional(), // All passenger names
  passengers: z.array(z.string()).optional(), // Additional passengers (legacy)
  passengerCount: z.number().min(1).default(1), // Total number of passengers
  vendorPrice: z.number().min(0).default(0), // Price from vendor
  airlinePrice: z.number().min(0).default(0), // Airline's price
  middleClassPrice: z.number().min(0).default(0), // Middle Class Tourism's price/margin
  faceValue: z.number().min(0, "Face value must be positive"),
  deductFromDeposit: z.boolean().default(false),
  depositDeducted: z.number().min(0).default(0),
  eticketImage: z.string().optional(), // URL to e-ticket image (PNG/screenshot)
  eticketFiles: z.array(z.string()).optional(), // Array of e-ticket file URLs (PDF or images)
  issuedBy: z.string().min(1, "Bill creator is required"),
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = InsertTicket & {
  id: string;
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
  plainPassword?: string;
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
