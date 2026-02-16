import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import * as schema from "@shared/schema";
import {
  type User,
  type InsertUser,
  type Customer,
  type InsertCustomer,
  type Agent,
  type InsertAgent,
  type Vendor,
  type InsertVendor,
  type Invoice,
  type InsertInvoice,
  type Ticket,
  type InsertTicket,
  type DepositTransaction,
  type InsertDepositTransaction,
  type VendorTransaction,
  type InsertVendorTransaction,
  type AgentTransaction,
  type InsertAgentTransaction,
  type CashReceipt,
  type InsertCashReceipt,
  type DashboardMetrics,
  type PasswordResetToken,
} from "@shared/schema";
import { IStorage } from "./storage";
import bcrypt from "bcryptjs";

export class PgStorage implements IStorage {
  private invoiceCounter: number = 1000;
  private receiptCounter: number = 1000;
  private ticketCounter: number = 1000;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    await this.runOneTimeCleanup();
    await this.initializeCounters();
    await this.seedDefaultData();
    this.initialized = true;
  }

  private async runOneTimeCleanup() {
    if (process.env.RUN_CLEANUP === "true") {
      console.log("Running one-time data cleanup...");
      await this.cleanupAllData();
      console.log("Data cleanup complete.");
    }
  }

  private async initializeCounters() {
    const invoices = await db.select().from(schema.invoicesTable);
    const tickets = await db.select().from(schema.ticketsTable);
    const receipts = await db.select().from(schema.cashReceiptsTable);
    
    if (invoices.length > 0) {
      const maxInvoice = Math.max(...invoices.map(i => parseInt(i.invoiceNumber.replace("INV-", "")) || 1000));
      this.invoiceCounter = maxInvoice;
    }
    if (tickets.length > 0) {
      const maxTicket = Math.max(...tickets.map(t => parseInt(t.ticketNumber.replace("TKT-", "")) || 1000));
      this.ticketCounter = maxTicket;
    }
    if (receipts.length > 0) {
      const maxReceipt = Math.max(...receipts.map(r => parseInt(r.receiptNumber.replace("RCT-", "")) || 1000));
      this.receiptCounter = maxReceipt;
    }
  }

  private async seedDefaultData() {
    // Check if admin user exists
    const existingUsers = await db.select().from(schema.usersTable);
    if (existingUsers.length === 0) {
      const hashedPassword = bcrypt.hashSync("admin123", 10);
      await db.insert(schema.usersTable).values({
        username: "admin",
        password: hashedPassword,
        email: "admin@example.com",
        passwordHint: "Default password is admin followed by 123",
        role: "admin",
        active: true,
      });
      console.log("Created default admin user (username: admin, password: admin123)");
    } else {
      const adminUser = existingUsers.find(u => u.username === "admin");
      if (adminUser && !adminUser.role) {
        await db.update(schema.usersTable)
          .set({ role: "admin", active: true })
          .where(eq(schema.usersTable.username, "admin"));
        console.log("Updated admin user with role");
      }
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(schema.usersTable).where(eq(schema.usersTable.id, id));
    if (result.length === 0) return undefined;
    return this.mapUser(result[0]);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(schema.usersTable).where(eq(schema.usersTable.username, username));
    if (result.length === 0) return undefined;
    return this.mapUser(result[0]);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(schema.usersTable).where(eq(schema.usersTable.email, email));
    if (result.length === 0) return undefined;
    return this.mapUser(result[0]);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const result = await db.select().from(schema.usersTable).where(eq(schema.usersTable.phone, phone));
    if (result.length === 0) return undefined;
    return this.mapUser(result[0]);
  }

  private mapUser(row: typeof schema.usersTable.$inferSelect): User {
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      email: row.email || undefined,
      phone: row.phone || undefined,
      passwordHint: row.passwordHint || undefined,
      pin: row.pin || undefined,
      role: (row.role as "admin" | "staff") || "staff",
      active: row.active ?? true,
    };
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(schema.usersTable);
    return result.map(row => this.mapUser(row));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = bcrypt.hashSync(insertUser.password, 10);
    const result = await db.insert(schema.usersTable).values({
      username: insertUser.username,
      password: hashedPassword,
      email: insertUser.email,
      phone: insertUser.phone,
      passwordHint: insertUser.passwordHint,
      pin: insertUser.pin,
      role: insertUser.role || "staff",
      active: insertUser.active ?? true,
    }).returning();
    return this.mapUser(result[0]);
  }

  async updateUser(id: string, updates: Partial<{ username: string; password: string; active: boolean; email: string; pin: string }>): Promise<User | undefined> {
    const dbUpdates: any = {};
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.password !== undefined) dbUpdates.password = bcrypt.hashSync(updates.password, 10);
    if (updates.active !== undefined) dbUpdates.active = updates.active;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.pin !== undefined) dbUpdates.pin = updates.pin;
    
    if (Object.keys(dbUpdates).length === 0) {
      return this.getUser(id);
    }
    
    const result = await db.update(schema.usersTable).set(dbUpdates).where(eq(schema.usersTable.id, id)).returning();
    if (result.length === 0) return undefined;
    return this.mapUser(result[0]);
  }

  async verifyPin(pin: string): Promise<User | null> {
    const result = await db.select().from(schema.usersTable).where(eq(schema.usersTable.pin, pin));
    if (result.length === 0) return null;
    const user = result[0];
    if (!user.active) return null;
    return this.mapUser(user);
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(schema.usersTable).where(eq(schema.usersTable.id, id));
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await db.update(schema.usersTable).set({ password: hashedPassword }).where(eq(schema.usersTable.id, userId));
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
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const result = await db.insert(schema.passwordResetTokensTable).values({
      userId,
      token,
      expiresAt,
      used: false,
    }).returning();
    return {
      id: result[0].id,
      userId: result[0].userId,
      token: result[0].token,
      expiresAt: result[0].expiresAt.getTime(),
      used: result[0].used || false,
    };
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const result = await db.select().from(schema.passwordResetTokensTable).where(eq(schema.passwordResetTokensTable.token, token));
    if (result.length === 0) return undefined;
    const row = result[0];
    if (row.used || row.expiresAt.getTime() < Date.now()) return undefined;
    return {
      id: row.id,
      userId: row.userId,
      token: row.token,
      expiresAt: row.expiresAt.getTime(),
      used: row.used || false,
    };
  }

  async markTokenUsed(tokenId: string): Promise<void> {
    await db.update(schema.passwordResetTokensTable).set({ used: true }).where(eq(schema.passwordResetTokensTable.id, tokenId));
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const result = await db.select().from(schema.customersTable);
    return result.map(this.mapCustomer);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const result = await db.select().from(schema.customersTable).where(eq(schema.customersTable.id, id));
    if (result.length === 0) return undefined;
    return this.mapCustomer(result[0]);
  }

  async findDuplicateCustomer(name: string, phone: string): Promise<Customer | undefined> {
    const customers = await this.getCustomers();
    return customers.find(c => c.name.toLowerCase() === name.toLowerCase() || c.phone === phone);
  }

  private mapCustomer(row: typeof schema.customersTable.$inferSelect): Customer {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      company: row.company || "",
      address: row.address || "",
      email: row.email || "",
      depositBalance: row.depositBalance || 0,
    };
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const result = await db.insert(schema.customersTable).values({
      name: customer.name,
      phone: customer.phone,
      company: customer.company || "",
      address: customer.address || "",
      email: customer.email || "",
      depositBalance: customer.depositBalance || 0,
    }).returning();
    return this.mapCustomer(result[0]);
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const result = await db.update(schema.customersTable).set(updates).where(eq(schema.customersTable.id, id)).returning();
    if (result.length === 0) return undefined;
    return this.mapCustomer(result[0]);
  }

  // Agents
  async getAgents(): Promise<Agent[]> {
    const result = await db.select().from(schema.agentsTable);
    return result.map(this.mapAgent);
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    const result = await db.select().from(schema.agentsTable).where(eq(schema.agentsTable.id, id));
    if (result.length === 0) return undefined;
    return this.mapAgent(result[0]);
  }

  async findDuplicateAgent(name: string, phone: string): Promise<Agent | undefined> {
    const agents = await this.getAgents();
    return agents.find(a => a.name.toLowerCase() === name.toLowerCase() || a.phone === phone);
  }

  private mapAgent(row: typeof schema.agentsTable.$inferSelect): Agent {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      company: row.company || "",
      address: row.address || "",
      email: row.email || "",
      creditBalance: row.creditBalance || 0,
      depositBalance: row.depositBalance || 0,
    };
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const result = await db.insert(schema.agentsTable).values({
      name: agent.name,
      phone: agent.phone,
      company: agent.company || "",
      address: agent.address || "",
      email: agent.email || "",
      creditBalance: agent.creditBalance || 0,
      depositBalance: agent.depositBalance || 0,
    }).returning();
    return this.mapAgent(result[0]);
  }

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | undefined> {
    const result = await db.update(schema.agentsTable).set(updates).where(eq(schema.agentsTable.id, id)).returning();
    if (result.length === 0) return undefined;
    return this.mapAgent(result[0]);
  }

  // Vendors
  async getVendors(): Promise<Vendor[]> {
    const result = await db.select().from(schema.vendorsTable);
    return result.map(this.mapVendor);
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const result = await db.select().from(schema.vendorsTable).where(eq(schema.vendorsTable.id, id));
    if (result.length === 0) return undefined;
    return this.mapVendor(result[0]);
  }

  async findDuplicateVendor(name: string, phone: string): Promise<Vendor | undefined> {
    const vendors = await this.getVendors();
    return vendors.find(v => v.name.toLowerCase() === name.toLowerCase() || v.phone === phone);
  }

  private mapVendor(row: typeof schema.vendorsTable.$inferSelect): Vendor {
    return {
      id: row.id,
      name: row.name,
      email: row.email || "",
      phone: row.phone,
      address: row.address || "",
      creditBalance: row.creditBalance || 0,
      depositBalance: row.depositBalance || 0,
      airlines: (row.airlines as any[]) || [],
    };
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const result = await db.insert(schema.vendorsTable).values({
      name: vendor.name,
      email: vendor.email || "",
      phone: vendor.phone,
      address: vendor.address || "",
      creditBalance: vendor.creditBalance || 0,
      depositBalance: vendor.depositBalance || 0,
      airlines: vendor.airlines || [],
    }).returning();
    return this.mapVendor(result[0]);
  }

  async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor | undefined> {
    const result = await db.update(schema.vendorsTable).set(updates).where(eq(schema.vendorsTable.id, id)).returning();
    if (result.length === 0) return undefined;
    return this.mapVendor(result[0]);
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    const result = await db.select().from(schema.invoicesTable).orderBy(desc(schema.invoicesTable.createdAt));
    return result.map(this.mapInvoice);
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const result = await db.select().from(schema.invoicesTable).where(eq(schema.invoicesTable.id, id));
    if (result.length === 0) return undefined;
    return this.mapInvoice(result[0]);
  }

  private mapInvoice(row: typeof schema.invoicesTable.$inferSelect): Invoice {
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      customerType: (row.customerType as any) || "customer",
      customerId: row.customerId,
      vendorId: row.vendorId,
      items: (row.items as any[]) || [],
      subtotal: row.subtotal || 0,
      discountPercent: row.discountPercent || 0,
      discountAmount: row.discountAmount || 0,
      total: row.total || 0,
      vendorCost: row.vendorCost || 0,
      paymentMethod: row.paymentMethod as any,
      useCustomerDeposit: row.useCustomerDeposit || false,
      depositUsed: row.depositUsed || 0,
      useAgentCredit: row.useAgentCredit || false,
      agentCreditUsed: row.agentCreditUsed || 0,
      useVendorBalance: (row.useVendorBalance as any) || "none",
      vendorBalanceDeducted: row.vendorBalanceDeducted || 0,
      notes: row.notes || "",
      issuedBy: row.issuedBy,
      createdByName: row.createdByName || "",
      status: (row.status as any) || "issued",
      paidAmount: row.paidAmount || 0,
      createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    this.invoiceCounter++;
    const invoiceNumber = `INV-${this.invoiceCounter}`;
    const result = await db.insert(schema.invoicesTable).values({
      invoiceNumber,
      customerType: invoice.customerType || "customer",
      customerId: invoice.customerId,
      vendorId: invoice.vendorId,
      items: invoice.items,
      subtotal: invoice.subtotal,
      discountPercent: invoice.discountPercent || 0,
      discountAmount: invoice.discountAmount || 0,
      total: invoice.total,
      vendorCost: invoice.vendorCost || 0,
      paymentMethod: invoice.paymentMethod,
      useCustomerDeposit: invoice.useCustomerDeposit || false,
      depositUsed: invoice.depositUsed || 0,
      useAgentCredit: invoice.useAgentCredit || false,
      agentCreditUsed: invoice.agentCreditUsed || 0,
      useVendorBalance: invoice.useVendorBalance || "none",
      vendorBalanceDeducted: invoice.vendorBalanceDeducted || 0,
      notes: invoice.notes || "",
      issuedBy: invoice.issuedBy,
      createdByName: invoice.createdByName || "",
      status: "issued",
      paidAmount: 0,
    }).returning();
    
    const createdInvoice = this.mapInvoice(result[0]);
    
    // Record deposit deduction transaction for customer or agent
    if (invoice.useCustomerDeposit && invoice.depositUsed && invoice.depositUsed > 0) {
      const customerType = invoice.customerType || "customer";
      
      if (customerType === "customer") {
        // Get current customer balance
        const customer = await this.getCustomer(invoice.customerId);
        if (customer) {
          const newBalance = customer.depositBalance - invoice.depositUsed;
          // Update customer balance
          await db.update(schema.customersTable)
            .set({ depositBalance: newBalance })
            .where(eq(schema.customersTable.id, invoice.customerId));
          
          // Create deposit transaction record
          await db.insert(schema.depositTransactionsTable).values({
            customerId: invoice.customerId,
            type: "debit",
            amount: invoice.depositUsed,
            description: `Invoice ${invoiceNumber} - Deposit used for payment`,
            referenceId: createdInvoice.id,
            referenceType: "invoice",
            balanceAfter: newBalance,
          });
        }
      } else if (customerType === "agent") {
        // Get current agent balance
        const agent = await this.getAgent(invoice.customerId);
        if (agent) {
          const newBalance = agent.depositBalance - invoice.depositUsed;
          // Update agent balance
          await db.update(schema.agentsTable)
            .set({ depositBalance: newBalance })
            .where(eq(schema.agentsTable.id, invoice.customerId));
          
          // Create agent transaction record
          await db.insert(schema.agentTransactionsTable).values({
            agentId: invoice.customerId,
            type: "debit",
            transactionType: "deposit",
            amount: invoice.depositUsed,
            description: `Invoice ${invoiceNumber} - Deposit used for payment`,
            paymentMethod: "cash",
            referenceId: createdInvoice.id,
            referenceType: "invoice",
            balanceAfter: newBalance,
          });
        }
      }
    }
    
    // Record vendor balance deduction transaction
    if (invoice.useVendorBalance && invoice.useVendorBalance !== "none" && invoice.vendorBalanceDeducted && invoice.vendorBalanceDeducted > 0) {
      const vendor = await this.getVendor(invoice.vendorId);
      if (vendor) {
        let newBalance: number;
        const transactionType = invoice.useVendorBalance as "credit" | "deposit";
        
        if (transactionType === "credit") {
          newBalance = vendor.creditBalance - invoice.vendorBalanceDeducted;
          await db.update(schema.vendorsTable)
            .set({ creditBalance: newBalance })
            .where(eq(schema.vendorsTable.id, invoice.vendorId));
        } else {
          newBalance = vendor.depositBalance - invoice.vendorBalanceDeducted;
          await db.update(schema.vendorsTable)
            .set({ depositBalance: newBalance })
            .where(eq(schema.vendorsTable.id, invoice.vendorId));
        }
        
        // Create vendor transaction record
        await db.insert(schema.vendorTransactionsTable).values({
          vendorId: invoice.vendorId,
          type: "debit",
          transactionType: transactionType,
          amount: invoice.vendorBalanceDeducted,
          description: `Invoice ${invoiceNumber} - ${transactionType === "credit" ? "Credit" : "Deposit"} used for vendor payment`,
          paymentMethod: "cash",
          referenceId: createdInvoice.id,
          referenceType: "invoice",
          balanceAfter: newBalance,
        });
      }
    }
    
    // Record agent credit deduction transaction (separate toggle, not tied to payment method)
    if (invoice.useAgentCredit && invoice.agentCreditUsed && invoice.agentCreditUsed > 0 && invoice.customerType === "agent") {
      const agent = await this.getAgent(invoice.customerId);
      if (agent) {
        const newCreditBalance = agent.creditBalance - invoice.agentCreditUsed;
        // Update agent credit balance
        await db.update(schema.agentsTable)
          .set({ creditBalance: newCreditBalance })
          .where(eq(schema.agentsTable.id, invoice.customerId));
        
        // Create agent transaction record for the credit usage
        await db.insert(schema.agentTransactionsTable).values({
          agentId: invoice.customerId,
          type: "debit",
          transactionType: "credit",
          amount: invoice.agentCreditUsed,
          description: `Invoice ${invoiceNumber} - Credit used for payment`,
          paymentMethod: invoice.paymentMethod,
          referenceId: createdInvoice.id,
          referenceType: "invoice",
          balanceAfter: newCreditBalance,
        });
      }
    }
    
    return createdInvoice;
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const { createdAt, ...dbUpdates } = updates;
    const result = await db.update(schema.invoicesTable).set(dbUpdates).where(eq(schema.invoicesTable.id, id)).returning();
    if (result.length === 0) return undefined;
    return this.mapInvoice(result[0]);
  }

  // Tickets
  async getTickets(): Promise<Ticket[]> {
    const result = await db.select().from(schema.ticketsTable).orderBy(desc(schema.ticketsTable.createdAt));
    return result.map(this.mapTicket);
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const result = await db.select().from(schema.ticketsTable).where(eq(schema.ticketsTable.id, id));
    if (result.length === 0) return undefined;
    return this.mapTicket(result[0]);
  }

  private mapTicket(row: typeof schema.ticketsTable.$inferSelect): Ticket {
    return {
      id: row.id,
      ticketNumber: row.ticketNumber,
      customerType: (row.customerType as any) || "customer",
      customerId: row.customerId,
      vendorId: row.vendorId,
      invoiceId: row.invoiceId || undefined,
      tripType: (row.tripType as any) || "one_way",
      ticketType: (row.ticketType as any) || "economy",
      route: row.route,
      airlines: row.airlines,
      flightNumber: row.flightNumber,
      flightTime: row.flightTime,
      travelDate: row.travelDate,
      returnDate: row.returnDate || undefined,
      passengerName: row.passengerName,
      faceValue: row.faceValue || 0,
      vendorCost: row.vendorCost || 0,
      additionalCost: row.additionalCost || 0,
      deductFromDeposit: row.deductFromDeposit || false,
      depositDeducted: row.depositDeducted || 0,
      useAgentBalance: (row.useAgentBalance as any) || "none",
      agentBalanceDeducted: row.agentBalanceDeducted || 0,
      useVendorBalance: (row.useVendorBalance as any) || "none",
      vendorBalanceDeducted: row.vendorBalanceDeducted || 0,
      issuedBy: row.issuedBy,
      createdByName: row.createdByName || "",
      status: (row.status as any) || "issued",
      createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    this.ticketCounter++;
    const ticketNumber = `TKT-${this.ticketCounter}`;
    const result = await db.insert(schema.ticketsTable).values({
      ticketNumber,
      customerType: ticket.customerType || "customer",
      customerId: ticket.customerId,
      vendorId: ticket.vendorId,
      invoiceId: ticket.invoiceId,
      tripType: ticket.tripType || "one_way",
      ticketType: ticket.ticketType,
      route: ticket.route,
      airlines: ticket.airlines,
      flightNumber: ticket.flightNumber,
      flightTime: ticket.flightTime,
      travelDate: ticket.travelDate,
      returnDate: ticket.returnDate,
      passengerName: ticket.passengerName,
      faceValue: ticket.faceValue,
      vendorCost: ticket.vendorCost || 0,
      additionalCost: ticket.additionalCost || 0,
      deductFromDeposit: ticket.deductFromDeposit || false,
      depositDeducted: ticket.depositDeducted || 0,
      useAgentBalance: ticket.useAgentBalance || "none",
      agentBalanceDeducted: ticket.agentBalanceDeducted || 0,
      useVendorBalance: ticket.useVendorBalance || "none",
      vendorBalanceDeducted: ticket.vendorBalanceDeducted || 0,
      issuedBy: ticket.issuedBy,
      createdByName: ticket.createdByName || "",
      status: "issued",
    }).returning();
    
    const createdTicket = this.mapTicket(result[0]);
    
    // Handle vendor balance based on useVendorBalance choice
    if (ticket.vendorCost && ticket.vendorCost > 0) {
      const vendor = await this.getVendor(ticket.vendorId);
      if (vendor) {
        const useVendorBalance = ticket.useVendorBalance || "none";
        const vendorBalanceDeducted = ticket.vendorBalanceDeducted || 0;
        
        if (useVendorBalance === "none") {
          // Add vendor cost to credit balance (what we owe the vendor)
          const newCreditBalance = vendor.creditBalance + ticket.vendorCost;
          await db.update(schema.vendorsTable)
            .set({ creditBalance: newCreditBalance })
            .where(eq(schema.vendorsTable.id, ticket.vendorId));
          
          await db.insert(schema.vendorTransactionsTable).values({
            vendorId: ticket.vendorId,
            type: "credit",
            transactionType: "credit",
            amount: ticket.vendorCost,
            description: `Ticket ${ticketNumber} - ${ticket.passengerName} - Vendor cost (added to credit owed)`,
            paymentMethod: "cash",
            referenceId: createdTicket.id,
            referenceType: "ticket",
            balanceAfter: newCreditBalance,
          });
        } else if (useVendorBalance === "credit" && vendorBalanceDeducted > 0) {
          // Deduct from vendor credit balance
          const newCreditBalance = vendor.creditBalance - vendorBalanceDeducted;
          await db.update(schema.vendorsTable)
            .set({ creditBalance: newCreditBalance })
            .where(eq(schema.vendorsTable.id, ticket.vendorId));
          
          await db.insert(schema.vendorTransactionsTable).values({
            vendorId: ticket.vendorId,
            type: "debit",
            transactionType: "debit",
            amount: vendorBalanceDeducted,
            description: `Ticket ${ticketNumber} - ${ticket.passengerName} - Deducted from vendor credit`,
            paymentMethod: "cash",
            referenceId: createdTicket.id,
            referenceType: "ticket",
            balanceAfter: newCreditBalance,
          });
        } else if (useVendorBalance === "deposit" && vendorBalanceDeducted > 0) {
          // Deduct from our deposit with vendor
          const newDepositBalance = vendor.depositBalance - vendorBalanceDeducted;
          await db.update(schema.vendorsTable)
            .set({ depositBalance: newDepositBalance })
            .where(eq(schema.vendorsTable.id, ticket.vendorId));
          
          await db.insert(schema.vendorTransactionsTable).values({
            vendorId: ticket.vendorId,
            type: "deposit_debit",
            transactionType: "deposit_debit",
            amount: vendorBalanceDeducted,
            description: `Ticket ${ticketNumber} - ${ticket.passengerName} - Deducted from deposit with vendor`,
            paymentMethod: "cash",
            referenceId: createdTicket.id,
            referenceType: "ticket",
            balanceAfter: newDepositBalance,
          });
        }
      }
    }
    
    // Record deposit deduction transaction for customer (only for individual customers)
    if (ticket.customerType === "customer" && ticket.deductFromDeposit && ticket.depositDeducted && ticket.depositDeducted > 0) {
      const customer = await this.getCustomer(ticket.customerId);
      if (customer) {
        const newBalance = customer.depositBalance - ticket.depositDeducted;
        // Update customer balance
        await db.update(schema.customersTable)
          .set({ depositBalance: newBalance })
          .where(eq(schema.customersTable.id, ticket.customerId));
        
        // Create deposit transaction record
        await db.insert(schema.depositTransactionsTable).values({
          customerId: ticket.customerId,
          type: "debit",
          amount: ticket.depositDeducted,
          description: `Ticket ${ticketNumber} - ${ticket.passengerName} - Deposit used for ticket`,
          referenceId: createdTicket.id,
          referenceType: "ticket",
          balanceAfter: newBalance,
        });
      }
    }
    
    // Record agent balance deduction transaction (for agent customers)
    if (ticket.customerType === "agent" && ticket.useAgentBalance && ticket.useAgentBalance !== "none" && ticket.agentBalanceDeducted && ticket.agentBalanceDeducted > 0) {
      const agent = await this.getAgent(ticket.customerId);
      if (agent) {
        let newBalance: number;
        const transactionType = ticket.useAgentBalance as "credit" | "deposit";
        
        if (transactionType === "credit") {
          newBalance = agent.creditBalance - ticket.agentBalanceDeducted;
          await db.update(schema.agentsTable)
            .set({ creditBalance: newBalance })
            .where(eq(schema.agentsTable.id, ticket.customerId));
        } else {
          newBalance = agent.depositBalance - ticket.agentBalanceDeducted;
          await db.update(schema.agentsTable)
            .set({ depositBalance: newBalance })
            .where(eq(schema.agentsTable.id, ticket.customerId));
        }
        
        // Create agent transaction record
        await db.insert(schema.agentTransactionsTable).values({
          agentId: ticket.customerId,
          type: "debit",
          transactionType: transactionType,
          amount: ticket.agentBalanceDeducted,
          description: `Ticket ${ticketNumber} - ${ticket.passengerName} - ${transactionType === "credit" ? "Credit" : "Deposit"} used for ticket`,
          paymentMethod: "cash",
          referenceId: createdTicket.id,
          referenceType: "ticket",
          balanceAfter: newBalance,
        });
      }
    }
    
    // Record vendor balance deduction transaction
    if (ticket.useVendorBalance && ticket.useVendorBalance !== "none" && ticket.vendorBalanceDeducted && ticket.vendorBalanceDeducted > 0) {
      const vendor = await this.getVendor(ticket.vendorId);
      if (vendor) {
        let newBalance: number;
        const transactionType = ticket.useVendorBalance as "credit" | "deposit";
        
        if (transactionType === "credit") {
          newBalance = vendor.creditBalance - ticket.vendorBalanceDeducted;
          await db.update(schema.vendorsTable)
            .set({ creditBalance: newBalance })
            .where(eq(schema.vendorsTable.id, ticket.vendorId));
        } else {
          newBalance = vendor.depositBalance - ticket.vendorBalanceDeducted;
          await db.update(schema.vendorsTable)
            .set({ depositBalance: newBalance })
            .where(eq(schema.vendorsTable.id, ticket.vendorId));
        }
        
        // Create vendor transaction record
        await db.insert(schema.vendorTransactionsTable).values({
          vendorId: ticket.vendorId,
          type: "debit",
          transactionType: transactionType,
          amount: ticket.vendorBalanceDeducted,
          description: `Ticket ${ticketNumber} - ${ticket.passengerName} - ${transactionType === "credit" ? "Credit" : "Deposit"} used for ticket`,
          paymentMethod: "cash",
          referenceId: createdTicket.id,
          referenceType: "ticket",
          balanceAfter: newBalance,
        });
      }
    }
    
    return createdTicket;
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const { createdAt, ...dbUpdates } = updates;
    const result = await db.update(schema.ticketsTable).set(dbUpdates).where(eq(schema.ticketsTable.id, id)).returning();
    if (result.length === 0) return undefined;
    return this.mapTicket(result[0]);
  }

  // Deposit Transactions
  async getDepositTransactions(): Promise<DepositTransaction[]> {
    const result = await db.select().from(schema.depositTransactionsTable).orderBy(desc(schema.depositTransactionsTable.createdAt));
    return result.map(this.mapDepositTransaction);
  }

  async getCustomerDepositTransactions(customerId: string): Promise<DepositTransaction[]> {
    const result = await db.select().from(schema.depositTransactionsTable)
      .where(eq(schema.depositTransactionsTable.customerId, customerId))
      .orderBy(desc(schema.depositTransactionsTable.createdAt));
    return result.map(this.mapDepositTransaction);
  }

  private mapDepositTransaction(row: typeof schema.depositTransactionsTable.$inferSelect): DepositTransaction {
    return {
      id: row.id,
      customerId: row.customerId,
      type: row.type as any,
      amount: row.amount,
      description: row.description,
      referenceId: row.referenceId || undefined,
      referenceType: row.referenceType || undefined,
      balanceAfter: row.balanceAfter || 0,
      createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  async createDepositTransaction(tx: InsertDepositTransaction): Promise<DepositTransaction> {
    const customer = await this.getCustomer(tx.customerId);
    let balanceAfter = 0;
    if (customer) {
      if (tx.type === "credit") {
        balanceAfter = customer.depositBalance + tx.amount;
      } else {
        balanceAfter = customer.depositBalance - tx.amount;
      }
      await this.updateCustomer(tx.customerId, { depositBalance: balanceAfter });
    }

    const result = await db.insert(schema.depositTransactionsTable).values({
      customerId: tx.customerId,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      referenceId: tx.referenceId,
      referenceType: tx.referenceType,
      balanceAfter,
    }).returning();
    return this.mapDepositTransaction(result[0]);
  }

  // Vendor Transactions
  async getVendorTransactions(): Promise<VendorTransaction[]> {
    const result = await db.select().from(schema.vendorTransactionsTable).orderBy(desc(schema.vendorTransactionsTable.createdAt));
    return result.map(this.mapVendorTransaction);
  }

  async getVendorTransactionsByVendor(vendorId: string): Promise<VendorTransaction[]> {
    const result = await db.select().from(schema.vendorTransactionsTable)
      .where(eq(schema.vendorTransactionsTable.vendorId, vendorId))
      .orderBy(desc(schema.vendorTransactionsTable.createdAt));
    return result.map(this.mapVendorTransaction);
  }

  private mapVendorTransaction(row: typeof schema.vendorTransactionsTable.$inferSelect): VendorTransaction {
    return {
      id: row.id,
      vendorId: row.vendorId,
      type: row.type as any,
      transactionType: row.transactionType as any,
      amount: row.amount,
      description: row.description,
      paymentMethod: (row.paymentMethod as any) || "cash",
      referenceId: row.referenceId || undefined,
      referenceType: row.referenceType || undefined,
      balanceAfter: row.balanceAfter || 0,
      createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  async createVendorTransaction(tx: InsertVendorTransaction): Promise<VendorTransaction> {
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

    const result = await db.insert(schema.vendorTransactionsTable).values({
      vendorId: tx.vendorId,
      type: tx.type,
      transactionType: tx.transactionType,
      amount: tx.amount,
      description: tx.description,
      paymentMethod: tx.paymentMethod || "cash",
      referenceId: tx.referenceId,
      referenceType: tx.referenceType,
      balanceAfter,
    }).returning();
    return this.mapVendorTransaction(result[0]);
  }

  // Agent Transactions
  async getAgentTransactions(): Promise<AgentTransaction[]> {
    const result = await db.select().from(schema.agentTransactionsTable).orderBy(desc(schema.agentTransactionsTable.createdAt));
    return result.map(this.mapAgentTransaction);
  }

  async getAgentTransactionsByAgent(agentId: string): Promise<AgentTransaction[]> {
    const result = await db.select().from(schema.agentTransactionsTable)
      .where(eq(schema.agentTransactionsTable.agentId, agentId))
      .orderBy(desc(schema.agentTransactionsTable.createdAt));
    return result.map(this.mapAgentTransaction);
  }

  private mapAgentTransaction(row: typeof schema.agentTransactionsTable.$inferSelect): AgentTransaction {
    return {
      id: row.id,
      agentId: row.agentId,
      type: row.type as any,
      transactionType: row.transactionType as any,
      amount: row.amount,
      description: row.description,
      paymentMethod: (row.paymentMethod as any) || "cash",
      referenceId: row.referenceId || undefined,
      referenceType: row.referenceType || undefined,
      balanceAfter: row.balanceAfter || 0,
      createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  async createAgentTransaction(tx: InsertAgentTransaction): Promise<AgentTransaction> {
    const agent = await this.getAgent(tx.agentId);
    let balanceAfter = 0;

    if (agent) {
      if (tx.transactionType === "credit") {
        if (tx.type === "credit") {
          balanceAfter = agent.creditBalance + tx.amount;
          await this.updateAgent(tx.agentId, { creditBalance: balanceAfter });
        } else {
          balanceAfter = agent.creditBalance - tx.amount;
          await this.updateAgent(tx.agentId, { creditBalance: balanceAfter });
        }
      } else {
        if (tx.type === "credit") {
          balanceAfter = agent.depositBalance + tx.amount;
          await this.updateAgent(tx.agentId, { depositBalance: balanceAfter });
        } else {
          balanceAfter = agent.depositBalance - tx.amount;
          await this.updateAgent(tx.agentId, { depositBalance: balanceAfter });
        }
      }
    }

    const result = await db.insert(schema.agentTransactionsTable).values({
      agentId: tx.agentId,
      type: tx.type,
      transactionType: tx.transactionType,
      amount: tx.amount,
      description: tx.description,
      paymentMethod: tx.paymentMethod || "cash",
      referenceId: tx.referenceId,
      referenceType: tx.referenceType,
      balanceAfter,
    }).returning();
    return this.mapAgentTransaction(result[0]);
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

  // Cash Receipts
  async getCashReceipts(): Promise<CashReceipt[]> {
    const results = await db.select().from(schema.cashReceiptsTable).orderBy(desc(schema.cashReceiptsTable.createdAt));
    return results.map(r => ({
      ...r,
      sourceType: r.sourceType || "flight",
      pnr: r.pnr || "",
      serviceName: r.serviceName || "",
      description: r.description || "",
      referenceNumber: r.referenceNumber || "",
      status: r.status || "issued",
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    })) as CashReceipt[];
  }

  async getCashReceipt(id: string): Promise<CashReceipt | undefined> {
    const [result] = await db.select().from(schema.cashReceiptsTable).where(eq(schema.cashReceiptsTable.id, id));
    if (!result) return undefined;
    return {
      ...result,
      sourceType: result.sourceType || "flight",
      pnr: result.pnr || "",
      serviceName: result.serviceName || "",
      description: result.description || "",
      referenceNumber: result.referenceNumber || "",
      status: result.status || "issued",
      createdAt: result.createdAt ? result.createdAt.toISOString() : new Date().toISOString(),
    } as CashReceipt;
  }

  async createCashReceipt(receipt: InsertCashReceipt): Promise<CashReceipt> {
    this.receiptCounter++;
    const receiptNumber = `RCT-${this.receiptCounter}`;
    const id = crypto.randomUUID();
    const [result] = await db.insert(schema.cashReceiptsTable).values({
      id,
      receiptNumber,
      partyType: receipt.partyType,
      partyId: receipt.partyId,
      sourceType: receipt.sourceType || "flight",
      pnr: receipt.pnr || "",
      serviceName: receipt.serviceName || "",
      amount: receipt.amount,
      paymentMethod: receipt.paymentMethod,
      description: receipt.description || "",
      referenceNumber: receipt.referenceNumber || "",
      issuedBy: receipt.issuedBy,
      createdByName: receipt.createdByName || "",
      status: "issued",
    }).returning();

    return {
      ...result,
      sourceType: result.sourceType || "flight",
      pnr: result.pnr || "",
      serviceName: result.serviceName || "",
      description: result.description || "",
      referenceNumber: result.referenceNumber || "",
      status: result.status || "issued",
      createdAt: result.createdAt ? result.createdAt.toISOString() : new Date().toISOString(),
    } as CashReceipt;
  }

  // Admin Operations
  async resetFinanceData(): Promise<void> {
    // Delete all transactions
    await db.delete(schema.depositTransactionsTable);
    await db.delete(schema.vendorTransactionsTable);
    await db.delete(schema.agentTransactionsTable);
    
    // Reset all customer balances
    await db.update(schema.customersTable).set({ depositBalance: 0 });
    
    // Reset all agent balances
    await db.update(schema.agentsTable).set({ creditBalance: 0, depositBalance: 0 });
    
    // Reset all vendor balances
    await db.update(schema.vendorsTable).set({ creditBalance: 0, depositBalance: 0 });
  }

  async resetInvoices(): Promise<void> {
    await db.delete(schema.invoicesTable);
    this.invoiceCounter = 1000;
  }

  async resetTickets(): Promise<void> {
    await db.delete(schema.ticketsTable);
    this.ticketCounter = 1000;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    // Delete associated deposit transactions first
    await db.delete(schema.depositTransactionsTable).where(eq(schema.depositTransactionsTable.customerId, id));
    const result = await db.delete(schema.customersTable).where(eq(schema.customersTable.id, id)).returning();
    return result.length > 0;
  }

  async deleteAgent(id: string): Promise<boolean> {
    // Delete associated agent transactions first
    await db.delete(schema.agentTransactionsTable).where(eq(schema.agentTransactionsTable.agentId, id));
    const result = await db.delete(schema.agentsTable).where(eq(schema.agentsTable.id, id)).returning();
    return result.length > 0;
  }

  async deleteVendor(id: string): Promise<boolean> {
    await db.delete(schema.vendorTransactionsTable).where(eq(schema.vendorTransactionsTable.vendorId, id));
    const result = await db.delete(schema.vendorsTable).where(eq(schema.vendorsTable.id, id)).returning();
    return result.length > 0;
  }

  async cleanupAllData(): Promise<void> {
    await db.delete(schema.ticketsTable);
    await db.delete(schema.invoicesTable);
    await db.delete(schema.depositTransactionsTable);
    await db.delete(schema.vendorTransactionsTable);
    await db.delete(schema.agentTransactionsTable);
    await db.delete(schema.customersTable);
    await db.delete(schema.agentsTable);
    await db.delete(schema.vendorsTable);
  }
}
