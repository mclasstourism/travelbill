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
  type DashboardMetrics,
  type PasswordResetToken,
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<{ username: string; password: string; active: boolean; email: string }>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  updateUserPassword(userId: string, newPassword: string): Promise<boolean>;
  verifyUserPassword(username: string, password: string): Promise<User | null>;
  getPasswordHint(username: string): Promise<string | null>;
  
  // Password Reset
  createPasswordResetToken(userId: string): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenUsed(tokenId: string): Promise<void>;

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

  // Agent Transactions
  getAgentTransactions(): Promise<AgentTransaction[]>;
  getAgentTransactionsByAgent(agentId: string): Promise<AgentTransaction[]>;
  createAgentTransaction(tx: InsertAgentTransaction): Promise<AgentTransaction>;

  // Metrics
  getDashboardMetrics(): Promise<DashboardMetrics>;

  // Admin Operations
  resetFinanceData(): Promise<void>;
  resetInvoices(): Promise<void>;
  resetTickets(): Promise<void>;
  deleteCustomer(id: string): Promise<boolean>;
  deleteAgent(id: string): Promise<boolean>;
  deleteVendor(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private passwordResetTokens: Map<string, PasswordResetToken>;
  private customers: Map<string, Customer>;
  private agents: Map<string, Agent>;
  private vendors: Map<string, Vendor>;
  private invoices: Map<string, Invoice>;
  private tickets: Map<string, Ticket>;
  private depositTransactions: Map<string, DepositTransaction>;
  private vendorTransactions: Map<string, VendorTransaction>;
  private agentTransactions: Map<string, AgentTransaction>;
  private invoiceCounter: number;
  private ticketCounter: number;

  constructor() {
    this.users = new Map();
    this.passwordResetTokens = new Map();
    this.customers = new Map();
    this.agents = new Map();
    this.vendors = new Map();
    this.invoices = new Map();
    this.tickets = new Map();
    this.depositTransactions = new Map();
    this.vendorTransactions = new Map();
    this.agentTransactions = new Map();
    this.invoiceCounter = 1000;
    this.ticketCounter = 1000;

    // Seed with a default staff user (password: admin123)
    const defaultUserId = randomUUID();
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    this.users.set(defaultUserId, {
      id: defaultUserId,
      username: "admin",
      password: hashedPassword,
      email: "admin@example.com",
      passwordHint: "Default password is admin followed by 123",
      role: "admin",
      active: true,
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

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = bcrypt.hashSync(insertUser.password, 10);
    const user: User = { 
      ...insertUser, 
      password: hashedPassword, 
      id,
      role: insertUser.role || "staff",
      active: insertUser.active ?? true,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<{ username: string; password: string; active: boolean; email: string }>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    if (updates.username !== undefined) user.username = updates.username;
    if (updates.password !== undefined) user.password = bcrypt.hashSync(updates.password, 10);
    if (updates.active !== undefined) user.active = updates.active;
    if (updates.email !== undefined) user.email = updates.email;
    this.users.set(id, user);
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
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

  // Agent Transactions
  async getAgentTransactions(): Promise<AgentTransaction[]> {
    return Array.from(this.agentTransactions.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getAgentTransactionsByAgent(agentId: string): Promise<AgentTransaction[]> {
    return Array.from(this.agentTransactions.values())
      .filter((tx) => tx.agentId === agentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createAgentTransaction(tx: InsertAgentTransaction): Promise<AgentTransaction> {
    const id = randomUUID();
    const agent = await this.getAgent(tx.agentId);
    let balanceAfter = 0;

    if (agent) {
      if (tx.transactionType === "credit") {
        // Credit given to agent
        if (tx.type === "credit") {
          balanceAfter = agent.creditBalance + tx.amount;
          await this.updateAgent(tx.agentId, { creditBalance: balanceAfter });
        } else {
          balanceAfter = agent.creditBalance - tx.amount;
          await this.updateAgent(tx.agentId, { creditBalance: balanceAfter });
        }
      } else {
        // Deposit received from agent
        if (tx.type === "credit") {
          balanceAfter = agent.depositBalance + tx.amount;
          await this.updateAgent(tx.agentId, { depositBalance: balanceAfter });
        } else {
          balanceAfter = agent.depositBalance - tx.amount;
          await this.updateAgent(tx.agentId, { depositBalance: balanceAfter });
        }
      }
    }

    const newTx: AgentTransaction = {
      ...tx,
      id,
      balanceAfter,
      paymentMethod: tx.paymentMethod || "cash",
      createdAt: new Date().toISOString(),
    };
    this.agentTransactions.set(id, newTx);
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

  // Admin Operations
  async resetFinanceData(): Promise<void> {
    this.depositTransactions.clear();
    this.vendorTransactions.clear();
    this.agentTransactions.clear();
    for (const [id, customer] of this.customers) {
      this.customers.set(id, { ...customer, depositBalance: 0 });
    }
    for (const [id, agent] of this.agents) {
      this.agents.set(id, { ...agent, creditBalance: 0, depositBalance: 0 });
    }
    for (const [id, vendor] of this.vendors) {
      this.vendors.set(id, { ...vendor, creditBalance: 0, depositBalance: 0 });
    }
  }

  async resetInvoices(): Promise<void> {
    this.invoices.clear();
    this.invoiceCounter = 1000;
  }

  async resetTickets(): Promise<void> {
    this.tickets.clear();
    this.ticketCounter = 1000;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    for (const [txId, tx] of this.depositTransactions) {
      if (tx.customerId === id) this.depositTransactions.delete(txId);
    }
    return this.customers.delete(id);
  }

  async deleteAgent(id: string): Promise<boolean> {
    for (const [txId, tx] of this.agentTransactions) {
      if (tx.agentId === id) this.agentTransactions.delete(txId);
    }
    return this.agents.delete(id);
  }

  async deleteVendor(id: string): Promise<boolean> {
    for (const [txId, tx] of this.vendorTransactions) {
      if (tx.vendorId === id) this.vendorTransactions.delete(txId);
    }
    return this.vendors.delete(id);
  }
}

import { PgStorage } from "./pg-storage";

export const storage = new PgStorage();
