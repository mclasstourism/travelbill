import {
  type User,
  type InsertUser,
  type Customer,
  type InsertCustomer,
  type Agent,
  type InsertAgent,
  type Vendor,
  type InsertVendor,
  type BillCreator,
  type InsertBillCreator,
  type Invoice,
  type InsertInvoice,
  type Ticket,
  type InsertTicket,
  type DepositTransaction,
  type InsertDepositTransaction,
  type VendorTransaction,
  type InsertVendorTransaction,
  type DashboardMetrics,
  type PasswordResetToken,
  type ActivityLog,
  type InsertActivityLog,
  type DocumentAttachment,
  type InsertDocumentAttachment,
  type SalesAnalytics,
  type CurrencyRate,
  type Currency,
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: string, newPassword: string): Promise<boolean>;
  deleteUser(id: string): Promise<boolean>;
  verifyUserPassword(username: string, password: string): Promise<User | null>;
  getPasswordHint(username: string): Promise<string | null>;
  
  // Password Reset
  createPasswordResetToken(userId: string): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenUsed(tokenId: string): Promise<void>;

  // Bill Creators
  getBillCreators(): Promise<BillCreator[]>;
  getBillCreator(id: string): Promise<BillCreator | undefined>;
  createBillCreator(creator: InsertBillCreator): Promise<BillCreator>;
  updateBillCreator(id: string, updates: Partial<BillCreator>): Promise<BillCreator | undefined>;
  verifyPin(creatorId: string, pin: string): Promise<BillCreator | undefined>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  findDuplicateCustomer(name: string, phone: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined>;

  // Agents
  getAgents(): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  findDuplicateAgent(name: string, phone: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | undefined>;

  // Vendors
  getVendors(): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  findDuplicateVendor(name: string, phone: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor | undefined>;

  // Invoices
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined>;

  // Tickets
  getTickets(): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined>;

  // Deposit Transactions
  getDepositTransactions(): Promise<DepositTransaction[]>;
  getCustomerDepositTransactions(customerId: string): Promise<DepositTransaction[]>;
  createDepositTransaction(tx: InsertDepositTransaction): Promise<DepositTransaction>;

  // Vendor Transactions
  getVendorTransactions(): Promise<VendorTransaction[]>;
  getVendorTransactionsByVendor(vendorId: string): Promise<VendorTransaction[]>;
  createVendorTransaction(tx: InsertVendorTransaction): Promise<VendorTransaction>;

  // Metrics
  getDashboardMetrics(): Promise<DashboardMetrics>;
  
  // Activity Logs
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  // Documents
  getDocuments(entityType: string, entityId: string): Promise<DocumentAttachment[]>;
  createDocument(doc: InsertDocumentAttachment): Promise<DocumentAttachment>;
  deleteDocument(id: string): Promise<boolean>;
  
  // Analytics
  getSalesAnalytics(startDate?: string, endDate?: string): Promise<SalesAnalytics>;
  
  // Currency
  getCurrencyRates(): Promise<CurrencyRate[]>;
  
  // Users management
  getUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Invoices by customer
  getInvoicesByCustomer(customerId: string): Promise<Invoice[]>;
  getInvoicesByAgent(agentId: string): Promise<Invoice[]>;
  
  // Admin: Reset functions
  resetUsers(): Promise<void>;
  resetAllData(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private passwordResetTokens: Map<string, PasswordResetToken>;
  private billCreators: Map<string, BillCreator>;
  private customers: Map<string, Customer>;
  private agents: Map<string, Agent>;
  private vendors: Map<string, Vendor>;
  private invoices: Map<string, Invoice>;
  private tickets: Map<string, Ticket>;
  private depositTransactions: Map<string, DepositTransaction>;
  private vendorTransactions: Map<string, VendorTransaction>;
  private activityLogs: Map<string, ActivityLog>;
  private documents: Map<string, DocumentAttachment>;
  private invoiceCounter: number;
  private ticketCounter: number;
  
  private currencyRates: CurrencyRate[] = [
    { code: "AED", name: "UAE Dirham", rate: 1, symbol: "د.إ" },
    { code: "USD", name: "US Dollar", rate: 3.67, symbol: "$" },
    { code: "EUR", name: "Euro", rate: 4.02, symbol: "€" },
    { code: "GBP", name: "British Pound", rate: 4.65, symbol: "£" },
    { code: "SAR", name: "Saudi Riyal", rate: 0.98, symbol: "﷼" },
    { code: "INR", name: "Indian Rupee", rate: 0.044, symbol: "₹" },
    { code: "PKR", name: "Pakistani Rupee", rate: 0.013, symbol: "Rs" },
  ];

  constructor() {
    this.users = new Map();
    this.passwordResetTokens = new Map();
    this.billCreators = new Map();
    this.customers = new Map();
    this.agents = new Map();
    this.vendors = new Map();
    this.invoices = new Map();
    this.tickets = new Map();
    this.depositTransactions = new Map();
    this.vendorTransactions = new Map();
    this.activityLogs = new Map();
    this.documents = new Map();
    this.invoiceCounter = 1000;
    this.ticketCounter = 1000;

    // Seed with a default bill creator for testing
    const defaultCreatorId = randomUUID();
    this.billCreators.set(defaultCreatorId, {
      id: defaultCreatorId,
      name: "Admin",
      pin: "12345678",
      active: true,
    });

    // Seed with a default admin user (password: admin123, PIN: 00000)
    const defaultUserId = randomUUID();
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    this.users.set(defaultUserId, {
      id: defaultUserId,
      username: "admin",
      password: hashedPassword,
      email: "admin@example.com",
      passwordHint: "Default password is admin followed by 123",
      pin: "00000",
      active: true,
      role: "superadmin",
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.phone === phone,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = bcrypt.hashSync(insertUser.password, 10);
    const user: User = { 
      ...insertUser, 
      password: hashedPassword,
      plainPassword: insertUser.password,
      id,
      role: "staff",
      active: insertUser.active !== false,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    user.password = hashedPassword;
    this.users.set(userId, user);
    return true;
  }

  async verifyUserPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) return null;
    return user;
  }

  async getPasswordHint(username: string): Promise<string | null> {
    const user = await this.getUserByUsername(username);
    if (!user || !user.passwordHint) return null;
    return user.passwordHint;
  }

  // Password Reset Tokens
  async createPasswordResetToken(userId: string): Promise<PasswordResetToken> {
    const id = randomUUID();
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    const resetToken: PasswordResetToken = {
      id,
      userId,
      token,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      used: false,
    };
    this.passwordResetTokens.set(id, resetToken);
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    return Array.from(this.passwordResetTokens.values()).find(
      (t) => t.token === token && !t.used && t.expiresAt > Date.now()
    );
  }

  async markTokenUsed(tokenId: string): Promise<void> {
    const token = this.passwordResetTokens.get(tokenId);
    if (token) {
      token.used = true;
      this.passwordResetTokens.set(tokenId, token);
    }
  }

  // Bill Creators
  async getBillCreators(): Promise<BillCreator[]> {
    return Array.from(this.billCreators.values());
  }

  async getBillCreator(id: string): Promise<BillCreator | undefined> {
    return this.billCreators.get(id);
  }

  async createBillCreator(creator: InsertBillCreator): Promise<BillCreator> {
    const id = randomUUID();
    const billCreator: BillCreator = {
      id,
      name: creator.name,
      pin: creator.pin,
      active: true,
    };
    this.billCreators.set(id, billCreator);
    return billCreator;
  }

  async updateBillCreator(id: string, updates: Partial<BillCreator>): Promise<BillCreator | undefined> {
    const creator = this.billCreators.get(id);
    if (!creator) return undefined;
    const updated = { ...creator, ...updates };
    this.billCreators.set(id, updated);
    return updated;
  }

  async verifyPin(creatorId: string, pin: string): Promise<BillCreator | undefined> {
    const creator = this.billCreators.get(creatorId);
    if (!creator || !creator.active) return undefined;
    if (creator.pin === pin) {
      return creator;
    }
    return undefined;
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async findDuplicateCustomer(name: string, phone: string): Promise<Customer | undefined> {
    const customers = Array.from(this.customers.values());
    return customers.find(c => 
      c.name.toLowerCase() === name.toLowerCase() || 
      (phone && c.phone === phone)
    );
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const newCustomer: Customer = {
      id,
      name: customer.name,
      phone: customer.phone || "",
      company: customer.company || "",
      address: customer.address || "",
      email: customer.email || "",
      depositBalance: customer.depositBalance || 0,
    };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;
    const updated = { ...customer, ...updates };
    this.customers.set(id, updated);
    return updated;
  }

  // Agents
  async getAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async findDuplicateAgent(name: string, phone: string): Promise<Agent | undefined> {
    const agents = Array.from(this.agents.values());
    return agents.find(a => 
      a.name.toLowerCase() === name.toLowerCase() || 
      (phone && a.phone === phone)
    );
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const id = randomUUID();
    const newAgent: Agent = {
      id,
      name: agent.name,
      phone: agent.phone,
      company: agent.company || "",
      address: agent.address || "",
      email: agent.email || "",
      creditBalance: agent.creditBalance || 0,
      depositBalance: agent.depositBalance || 0,
    };
    this.agents.set(id, newAgent);
    return newAgent;
  }

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    const updated = { ...agent, ...updates };
    this.agents.set(id, updated);
    return updated;
  }

  // Vendors
  async getVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values());
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    return this.vendors.get(id);
  }

  async findDuplicateVendor(name: string, phone: string): Promise<Vendor | undefined> {
    const vendors = Array.from(this.vendors.values());
    return vendors.find(v => 
      v.name.toLowerCase() === name.toLowerCase() || 
      (phone && v.phone === phone)
    );
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const id = randomUUID();
    const airlines = (vendor.airlines || []).map(a => ({
      ...a,
      id: randomUUID(),
      code: a.code || "",
    }));
    const newVendor: Vendor = {
      id,
      name: vendor.name,
      email: vendor.email || "",
      phone: vendor.phone,
      address: vendor.address || "",
      creditBalance: vendor.creditBalance || 0,
      depositBalance: vendor.depositBalance || 0,
      airlines,
    };
    this.vendors.set(id, newVendor);
    return newVendor;
  }

  async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor | undefined> {
    const vendor = this.vendors.get(id);
    if (!vendor) return undefined;
    const updated = { ...vendor, ...updates };
    this.vendors.set(id, updated);
    return updated;
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    this.invoiceCounter++;
    const invoiceNumber = `INV-${this.invoiceCounter}`;
    
    const newInvoice: Invoice = {
      ...invoice,
      id,
      invoiceNumber,
      status: "issued",
      createdAt: new Date().toISOString(),
      paidAmount: 0,
    };
    this.invoices.set(id, newInvoice);

    // If deposit was used, deduct from customer
    if (invoice.useCustomerDeposit && invoice.depositUsed > 0) {
      const customer = await this.getCustomer(invoice.customerId);
      if (customer) {
        await this.updateCustomer(invoice.customerId, {
          depositBalance: customer.depositBalance - invoice.depositUsed,
        });
        // Create deposit transaction
        await this.createDepositTransaction({
          customerId: invoice.customerId,
          type: "debit",
          amount: invoice.depositUsed,
          description: `Invoice ${invoiceNumber} - Deposit applied`,
          referenceId: id,
          referenceType: "invoice",
        });
      }
    }

    // If vendor balance is used, deduct from vendor
    if (invoice.useVendorBalance && invoice.useVendorBalance !== "none" && invoice.vendorBalanceDeducted > 0) {
      const vendor = await this.getVendor(invoice.vendorId);
      if (vendor) {
        const balanceField = invoice.useVendorBalance === "credit" ? "creditBalance" : "depositBalance";
        const currentBalance = vendor[balanceField];
        
        await this.updateVendor(invoice.vendorId, {
          [balanceField]: currentBalance - invoice.vendorBalanceDeducted,
        });
        
        // Create vendor transaction
        await this.createVendorTransaction({
          vendorId: invoice.vendorId,
          type: "debit",
          transactionType: invoice.useVendorBalance,
          amount: invoice.vendorBalanceDeducted,
          description: `Invoice ${invoiceNumber} - Balance deducted`,
          paymentMethod: "cash",
          referenceId: id,
          referenceType: "invoice",
        });
      }
    }

    return newInvoice;
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    const updated = { ...invoice, ...updates };
    this.invoices.set(id, updated);
    return updated;
  }

  // Tickets
  async getTickets(): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const id = randomUUID();
    this.ticketCounter++;
    const ticketNumber = `TKT-${this.ticketCounter}`;

    const newTicket: Ticket = {
      ...ticket,
      id,
      ticketNumber,
      status: "issued",
      createdAt: new Date().toISOString(),
    };
    this.tickets.set(id, newTicket);

    // If deposit was deducted, update customer balance
    if (ticket.deductFromDeposit && ticket.depositDeducted > 0) {
      const customer = await this.getCustomer(ticket.customerId);
      if (customer) {
        await this.updateCustomer(ticket.customerId, {
          depositBalance: customer.depositBalance - ticket.depositDeducted,
        });
        // Create deposit transaction
        await this.createDepositTransaction({
          customerId: ticket.customerId,
          type: "debit",
          amount: ticket.depositDeducted,
          description: `Ticket ${ticketNumber} - ${ticket.route}`,
          referenceId: id,
          referenceType: "ticket",
        });
      }
    }

    return newTicket;
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;
    const updated = { ...ticket, ...updates };
    this.tickets.set(id, updated);
    return updated;
  }

  // Deposit Transactions
  async getDepositTransactions(): Promise<DepositTransaction[]> {
    return Array.from(this.depositTransactions.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getCustomerDepositTransactions(customerId: string): Promise<DepositTransaction[]> {
    return Array.from(this.depositTransactions.values())
      .filter((tx) => tx.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createDepositTransaction(tx: InsertDepositTransaction): Promise<DepositTransaction> {
    const id = randomUUID();
    const customer = await this.getCustomer(tx.customerId);
    let balanceAfter = 0;

    if (customer) {
      if (tx.type === "credit") {
        balanceAfter = customer.depositBalance + tx.amount;
        await this.updateCustomer(tx.customerId, { depositBalance: balanceAfter });
      } else {
        balanceAfter = customer.depositBalance - tx.amount;
        // Only update if this is a standalone debit (not already handled by invoice/ticket creation)
        if (!tx.referenceId) {
          await this.updateCustomer(tx.customerId, { depositBalance: balanceAfter });
        } else {
          // Get updated balance after invoice/ticket already updated it
          const updatedCustomer = await this.getCustomer(tx.customerId);
          balanceAfter = updatedCustomer?.depositBalance || 0;
        }
      }
    }

    const newTx: DepositTransaction = {
      ...tx,
      id,
      balanceAfter,
      createdAt: new Date().toISOString(),
    };
    this.depositTransactions.set(id, newTx);
    return newTx;
  }

  // Vendor Transactions
  async getVendorTransactions(): Promise<VendorTransaction[]> {
    return Array.from(this.vendorTransactions.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getVendorTransactionsByVendor(vendorId: string): Promise<VendorTransaction[]> {
    return Array.from(this.vendorTransactions.values())
      .filter((tx) => tx.vendorId === vendorId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createVendorTransaction(tx: InsertVendorTransaction): Promise<VendorTransaction> {
    const id = randomUUID();
    const vendor = await this.getVendor(tx.vendorId);
    let balanceAfter = 0;

    if (vendor) {
      if (tx.transactionType === "credit") {
        if (tx.type === "credit") {
          balanceAfter = vendor.creditBalance + tx.amount;
          await this.updateVendor(tx.vendorId, { creditBalance: balanceAfter });
        } else {
          balanceAfter = vendor.creditBalance - tx.amount;
          await this.updateVendor(tx.vendorId, { creditBalance: balanceAfter });
        }
      } else {
        if (tx.type === "credit") {
          balanceAfter = vendor.depositBalance + tx.amount;
          await this.updateVendor(tx.vendorId, { depositBalance: balanceAfter });
        } else {
          balanceAfter = vendor.depositBalance - tx.amount;
          await this.updateVendor(tx.vendorId, { depositBalance: balanceAfter });
        }
      }
    }

    const newTx: VendorTransaction = {
      ...tx,
      id,
      balanceAfter,
      paymentMethod: tx.paymentMethod || "cash",
      createdAt: new Date().toISOString(),
    };
    this.vendorTransactions.set(id, newTx);
    return newTx;
  }

  // Metrics
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const customers = await this.getCustomers();
    const vendors = await this.getVendors();
    const invoices = await this.getInvoices();
    const tickets = await this.getTickets();

    const totalRevenue = invoices
      .filter((inv) => inv.status !== "cancelled")
      .reduce((sum, inv) => sum + inv.total, 0);

    const pendingPayments = invoices
      .filter((inv) => inv.status === "issued" || inv.status === "partial")
      .reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0);

    const customerDepositsTotal = customers.reduce((sum, c) => sum + c.depositBalance, 0);
    const vendorCreditsTotal = vendors.reduce((sum, v) => sum + v.creditBalance, 0);

    return {
      totalCustomers: customers.length,
      totalVendors: vendors.length,
      totalInvoices: invoices.length,
      totalTickets: tickets.length,
      totalRevenue,
      pendingPayments,
      customerDepositsTotal,
      vendorCreditsTotal,
      recentInvoices: invoices.slice(0, 5),
      recentTickets: tickets.slice(0, 5),
    };
  }

  // Activity Logs
  async getActivityLogs(limit = 100): Promise<ActivityLog[]> {
    const logs = Array.from(this.activityLogs.values());
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return logs.slice(0, limit);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = randomUUID();
    const newLog: ActivityLog = {
      ...log,
      id,
      createdAt: new Date().toISOString(),
    };
    this.activityLogs.set(id, newLog);
    return newLog;
  }

  // Documents
  async getDocuments(entityType: string, entityId: string): Promise<DocumentAttachment[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.entityType === entityType && doc.entityId === entityId
    );
  }

  async createDocument(doc: InsertDocumentAttachment): Promise<DocumentAttachment> {
    const id = randomUUID();
    const newDoc: DocumentAttachment = {
      ...doc,
      id,
      uploadedAt: new Date().toISOString(),
    };
    this.documents.set(id, newDoc);
    return newDoc;
  }

  async deleteDocument(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Analytics
  async getSalesAnalytics(startDate?: string, endDate?: string): Promise<SalesAnalytics> {
    const invoices = await this.getInvoices();
    const tickets = await this.getTickets();
    const customers = await this.getCustomers();
    const agents = await this.getAgents();
    const vendors = await this.getVendors();

    let filteredInvoices = invoices.filter((inv) => inv.status !== "cancelled");
    if (startDate) {
      filteredInvoices = filteredInvoices.filter((inv) => inv.createdAt >= startDate);
    }
    if (endDate) {
      filteredInvoices = filteredInvoices.filter((inv) => inv.createdAt <= endDate);
    }

    // Daily sales (last 30 days)
    const dailySalesMap = new Map<string, { amount: number; count: number }>();
    filteredInvoices.forEach((inv) => {
      const date = inv.createdAt.split("T")[0];
      const existing = dailySalesMap.get(date) || { amount: 0, count: 0 };
      dailySalesMap.set(date, { amount: existing.amount + inv.total, count: existing.count + 1 });
    });
    const dailySales = Array.from(dailySalesMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top customers
    const customerSpending = new Map<string, { totalSpent: number; invoiceCount: number }>();
    filteredInvoices.filter((inv) => inv.customerType === "customer").forEach((inv) => {
      const existing = customerSpending.get(inv.customerId) || { totalSpent: 0, invoiceCount: 0 };
      customerSpending.set(inv.customerId, {
        totalSpent: existing.totalSpent + inv.total,
        invoiceCount: existing.invoiceCount + 1,
      });
    });
    const topCustomers = Array.from(customerSpending.entries())
      .map(([id, data]) => {
        const customer = customers.find((c) => c.id === id);
        return { id, name: customer?.name || "Unknown", ...data };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Top agents
    const agentSales = new Map<string, { totalSales: number; ticketCount: number }>();
    filteredInvoices.filter((inv) => inv.customerType === "agent").forEach((inv) => {
      const existing = agentSales.get(inv.customerId) || { totalSales: 0, ticketCount: 0 };
      agentSales.set(inv.customerId, {
        totalSales: existing.totalSales + inv.total,
        ticketCount: existing.ticketCount + 1,
      });
    });
    const topAgents = Array.from(agentSales.entries())
      .map(([id, data]) => {
        const agent = agents.find((a) => a.id === id);
        return { id, name: agent?.name || "Unknown", ...data };
      })
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);

    // Top routes
    const routeStats = new Map<string, { count: number; revenue: number }>();
    tickets.forEach((ticket) => {
      const existing = routeStats.get(ticket.route) || { count: 0, revenue: 0 };
      routeStats.set(ticket.route, {
        count: existing.count + 1,
        revenue: existing.revenue + ticket.faceValue,
      });
    });
    const topRoutes = Array.from(routeStats.entries())
      .map(([route, data]) => ({ route, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Vendor comparison
    const vendorStats = new Map<string, { totalCost: number; ticketCount: number }>();
    filteredInvoices.forEach((inv) => {
      const existing = vendorStats.get(inv.vendorId) || { totalCost: 0, ticketCount: 0 };
      vendorStats.set(inv.vendorId, {
        totalCost: existing.totalCost + inv.vendorCost,
        ticketCount: existing.ticketCount + 1,
      });
    });
    const vendorComparison = Array.from(vendorStats.entries())
      .map(([id, data]) => {
        const vendor = vendors.find((v) => v.id === id);
        return {
          id,
          name: vendor?.name || "Unknown",
          totalCost: data.totalCost,
          ticketCount: data.ticketCount,
          avgCost: data.ticketCount > 0 ? data.totalCost / data.ticketCount : 0,
        };
      })
      .sort((a, b) => b.totalCost - a.totalCost);

    // Profit by vendor
    const vendorProfitMap = new Map<string, { revenue: number; cost: number }>();
    filteredInvoices.forEach((inv) => {
      const existing = vendorProfitMap.get(inv.vendorId) || { revenue: 0, cost: 0 };
      vendorProfitMap.set(inv.vendorId, {
        revenue: existing.revenue + inv.total,
        cost: existing.cost + inv.vendorCost,
      });
    });
    const profitByVendor = Array.from(vendorProfitMap.entries())
      .map(([vendorId, data]) => {
        const vendor = vendors.find((v) => v.id === vendorId);
        const profit = data.revenue - data.cost;
        const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
        return {
          vendorId,
          vendorName: vendor?.name || "Unknown",
          revenue: data.revenue,
          cost: data.cost,
          profit,
          margin,
        };
      })
      .sort((a, b) => b.profit - a.profit);

    return {
      dailySales,
      topCustomers,
      topAgents,
      topRoutes,
      vendorComparison,
      profitByVendor,
    };
  }

  // Currency
  async getCurrencyRates(): Promise<CurrencyRate[]> {
    return this.currencyRates;
  }

  // Users management
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    if (updates.password) {
      updated.plainPassword = updates.password;
      updated.password = bcrypt.hashSync(updates.password, 10);
    }
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // Invoices by customer/agent
  async getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (inv) => inv.customerId === customerId && inv.customerType === "customer"
    );
  }

  async getInvoicesByAgent(agentId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (inv) => inv.customerId === agentId && inv.customerType === "agent"
    );
  }

  // Admin: Reset users to defaults
  async resetUsers(): Promise<void> {
    // Clear all users except recreate default admin
    this.users.clear();
    
    const defaultUserId = randomUUID();
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    this.users.set(defaultUserId, {
      id: defaultUserId,
      username: "admin",
      password: hashedPassword,
      email: "admin@example.com",
      passwordHint: "Default password is admin followed by 123",
      pin: "00000",
      active: true,
      role: "superadmin",
    });
  }

  // Admin: Reset all data
  async resetAllData(): Promise<void> {
    // Reset users
    await this.resetUsers();
    
    // Clear all bill creators
    this.billCreators.clear();
    const defaultCreatorId = randomUUID();
    this.billCreators.set(defaultCreatorId, {
      id: defaultCreatorId,
      name: "Admin",
      pin: "12345678",
      active: true,
    });
    
    // Clear all other data
    this.customers.clear();
    this.agents.clear();
    this.vendors.clear();
    this.invoices.clear();
    this.tickets.clear();
    this.depositTransactions.clear();
    this.vendorTransactions.clear();
    this.activityLogs.clear();
    this.documents.clear();
    this.passwordResetTokens.clear();
  }
}

export const storage = new MemStorage();
