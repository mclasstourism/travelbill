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
  type Airline,
  type InsertAirline,
  usersTable,
  customersTable,
  agentsTable,
  vendorsTable,
  invoicesTable,
  ticketsTable,
  depositTransactionsTable,
  vendorTransactionsTable,
  activityLogsTable,
  documentsTable,
  passwordResetTokensTable,
  billCreatorsTable,
  airlinesTable,
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: string, newPassword: string): Promise<boolean>;
  deleteUser(id: string): Promise<boolean>;
  verifyUserPassword(username: string, password: string): Promise<User | null>;
  getPasswordHint(username: string): Promise<string | null>;
  
  createPasswordResetToken(userId: string): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenUsed(tokenId: string): Promise<void>;

  getBillCreators(): Promise<BillCreator[]>;
  getBillCreator(id: string): Promise<BillCreator | undefined>;
  createBillCreator(creator: InsertBillCreator): Promise<BillCreator>;
  updateBillCreator(id: string, updates: Partial<BillCreator>): Promise<BillCreator | undefined>;
  verifyPin(creatorId: string, pin: string): Promise<BillCreator | undefined>;

  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  findDuplicateCustomer(name: string, phone: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;

  getAgents(): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  findDuplicateAgent(name: string, phone: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | undefined>;

  getVendors(): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  findDuplicateVendor(name: string, phone: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor | undefined>;

  getAirlines(): Promise<Airline[]>;
  getAirline(id: string): Promise<Airline | undefined>;
  createAirline(airline: InsertAirline): Promise<Airline>;
  updateAirline(id: string, updates: Partial<Airline>): Promise<Airline | undefined>;
  deleteAirline(id: string): Promise<boolean>;

  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined>;

  getTickets(): Promise<Ticket[]>;
  getTicketsByVendor(vendorId: string): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined>;

  getDepositTransactions(): Promise<DepositTransaction[]>;
  getCustomerDepositTransactions(customerId: string): Promise<DepositTransaction[]>;
  createDepositTransaction(tx: InsertDepositTransaction): Promise<DepositTransaction>;

  getVendorTransactions(): Promise<VendorTransaction[]>;
  getVendorTransactionsByVendor(vendorId: string): Promise<VendorTransaction[]>;
  createVendorTransaction(tx: InsertVendorTransaction): Promise<VendorTransaction>;

  getDashboardMetrics(): Promise<DashboardMetrics>;
  
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  getDocuments(entityType: string, entityId: string): Promise<DocumentAttachment[]>;
  createDocument(doc: InsertDocumentAttachment): Promise<DocumentAttachment>;
  deleteDocument(id: string): Promise<boolean>;
  
  getSalesAnalytics(startDate?: string, endDate?: string): Promise<SalesAnalytics>;
  
  getCurrencyRates(): Promise<CurrencyRate[]>;
  
  getUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  getInvoicesByCustomer(customerId: string): Promise<Invoice[]>;
  getInvoicesByAgent(agentId: string): Promise<Invoice[]>;
  
  resetUsers(): Promise<void>;
  resetAllData(): Promise<void>;
}

const currencyRates: CurrencyRate[] = [
  { code: "AED", name: "UAE Dirham", rate: 1, symbol: "د.إ" },
  { code: "USD", name: "US Dollar", rate: 3.67, symbol: "$" },
  { code: "EUR", name: "Euro", rate: 4.02, symbol: "€" },
  { code: "GBP", name: "British Pound", rate: 4.65, symbol: "£" },
  { code: "SAR", name: "Saudi Riyal", rate: 0.98, symbol: "﷼" },
  { code: "INR", name: "Indian Rupee", rate: 0.044, symbol: "₹" },
  { code: "PKR", name: "Pakistani Rupee", rate: 0.013, symbol: "Rs" },
];

export class DatabaseStorage implements IStorage {
  private invoiceCounter: number = 1000;
  private ticketCounter: number = 1000;
  private countersInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initializeCounters();
  }

  private async initializeCounters(): Promise<void> {
    if (this.countersInitialized) return;
    
    try {
      const invoices = await db.select().from(invoicesTable);
      const tickets = await db.select().from(ticketsTable);
      
      if (invoices.length > 0) {
        const maxInvoiceNum = Math.max(...invoices.map(i => {
          const num = parseInt(i.invoiceNumber.replace('INV-', ''));
          return isNaN(num) ? 0 : num;
        }));
        this.invoiceCounter = Math.max(this.invoiceCounter, maxInvoiceNum + 1);
      }
      
      if (tickets.length > 0) {
        const maxTicketNum = Math.max(...tickets.map(t => {
          const num = parseInt((t.ticketNumber || '').replace('TKT-', ''));
          return isNaN(num) ? 0 : num;
        }));
        this.ticketCounter = Math.max(this.ticketCounter, maxTicketNum + 1);
      }
      
      await this.seedDefaultData();
      this.countersInitialized = true;
    } catch (error) {
      console.error("Failed to initialize counters:", error);
    }
  }

  private async seedDefaultData(): Promise<void> {
    const existingUsers = await db.select().from(usersTable);
    if (existingUsers.length === 0) {
      const adminId = randomUUID();
      const hashedAdminPassword = bcrypt.hashSync("admin123", 10);
      await db.insert(usersTable).values({
        id: adminId,
        username: "admin",
        password: hashedAdminPassword,
        plainPassword: "admin123",
        name: "Administrator",
        email: "admin@example.com",
        passwordHint: "Default password is admin followed by 123",
        pin: "00000",
        active: true,
        role: "superadmin",
      });
      console.log("Default admin user created");

      const staffId = randomUUID();
      const hashedStaffPassword = bcrypt.hashSync("staff123", 10);
      await db.insert(usersTable).values({
        id: staffId,
        username: "staff1",
        password: hashedStaffPassword,
        plainPassword: "staff123",
        name: "Staff User",
        email: "staff@example.com",
        passwordHint: "Default password is staff followed by 123",
        pin: "11111",
        active: true,
        role: "staff",
      });
      console.log("Default staff user created");
    }

    const existingBillCreators = await db.select().from(billCreatorsTable);
    if (existingBillCreators.length === 0) {
      const creatorId = randomUUID();
      await db.insert(billCreatorsTable).values({
        id: creatorId,
        name: "Default",
        pin: "11111",
        active: true,
      });
      console.log("Default bill creator created");
    }
  }

  private async ensureCountersInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.countersInitialized) {
      await this.initializeCounters();
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return result[0] ? this.mapUser(result[0]) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.username, username));
    return result[0] ? this.mapUser(result[0]) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.email, email));
    return result[0] ? this.mapUser(result[0]) : undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    return result[0] ? this.mapUser(result[0]) : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = bcrypt.hashSync(user.password, 10);
    const result = await db.insert(usersTable).values({
      id,
      username: user.username,
      password: hashedPassword,
      plainPassword: user.password,
      name: user.name || user.username,
      email: user.email,
      phone: user.phone,
      passwordHint: user.passwordHint,
      pin: user.pin,
      active: user.active ?? true,
      role: "staff",
    }).returning();
    return this.mapUser(result[0]);
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await db.update(usersTable).set({ 
      password: hashedPassword,
      plainPassword: newPassword 
    }).where(eq(usersTable.id, userId));
    return true;
  }

  async deleteUser(id: string): Promise<boolean> {
    await db.delete(usersTable).where(eq(usersTable.id, id));
    return true;
  }

  async verifyUserPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    const valid = bcrypt.compareSync(password, user.password);
    return valid ? user : null;
  }

  async getPasswordHint(username: string): Promise<string | null> {
    const user = await this.getUserByUsername(username);
    return user?.passwordHint || null;
  }

  async createPasswordResetToken(userId: string): Promise<PasswordResetToken> {
    const token: PasswordResetToken = {
      id: randomUUID(),
      userId,
      token: randomUUID(),
      expiresAt: Date.now() + 3600000,
      used: false,
    };
    await db.insert(passwordResetTokensTable).values({
      id: token.id,
      userId: token.userId,
      token: token.token,
      expiresAt: new Date(token.expiresAt),
      used: false,
    });
    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const result = await db.select().from(passwordResetTokensTable).where(eq(passwordResetTokensTable.token, token));
    if (!result[0]) return undefined;
    return {
      id: result[0].id,
      userId: result[0].userId,
      token: result[0].token,
      expiresAt: result[0].expiresAt.getTime(),
      used: result[0].used ?? false,
    };
  }

  async markTokenUsed(tokenId: string): Promise<void> {
    await db.update(passwordResetTokensTable).set({ used: true }).where(eq(passwordResetTokensTable.id, tokenId));
  }

  // Bill Creators
  async getBillCreators(): Promise<BillCreator[]> {
    const result = await db.select().from(billCreatorsTable);
    return result.map(this.mapBillCreator);
  }

  async getBillCreator(id: string): Promise<BillCreator | undefined> {
    const result = await db.select().from(billCreatorsTable).where(eq(billCreatorsTable.id, id));
    return result[0] ? this.mapBillCreator(result[0]) : undefined;
  }

  async createBillCreator(creator: InsertBillCreator): Promise<BillCreator> {
    const id = randomUUID();
    const result = await db.insert(billCreatorsTable).values({
      id,
      name: creator.name,
      pin: creator.pin,
      active: true,
    }).returning();
    return this.mapBillCreator(result[0]);
  }

  async updateBillCreator(id: string, updates: Partial<BillCreator>): Promise<BillCreator | undefined> {
    const result = await db.update(billCreatorsTable).set({
      name: updates.name,
      pin: updates.pin,
      active: updates.active,
    }).where(eq(billCreatorsTable.id, id)).returning();
    return result[0] ? this.mapBillCreator(result[0]) : undefined;
  }

  async verifyPin(creatorId: string, pin: string): Promise<BillCreator | undefined> {
    const result = await db.select().from(billCreatorsTable).where(
      and(eq(billCreatorsTable.id, creatorId), eq(billCreatorsTable.pin, pin), eq(billCreatorsTable.active, true))
    );
    return result[0] ? this.mapBillCreator(result[0]) : undefined;
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const result = await db.select().from(customersTable).orderBy(desc(customersTable.createdAt));
    return result.map(this.mapCustomer);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const result = await db.select().from(customersTable).where(eq(customersTable.id, id));
    return result[0] ? this.mapCustomer(result[0]) : undefined;
  }

  async findDuplicateCustomer(name: string, phone: string): Promise<Customer | undefined> {
    const result = await db.select().from(customersTable).where(
      and(eq(customersTable.name, name), eq(customersTable.phone, phone))
    );
    return result[0] ? this.mapCustomer(result[0]) : undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const result = await db.insert(customersTable).values({
      id,
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
    const result = await db.update(customersTable).set({
      name: updates.name,
      phone: updates.phone,
      company: updates.company,
      address: updates.address,
      email: updates.email,
      depositBalance: updates.depositBalance,
    }).where(eq(customersTable.id, id)).returning();
    return result[0] ? this.mapCustomer(result[0]) : undefined;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    await db.delete(customersTable).where(eq(customersTable.id, id));
    return true;
  }

  // Agents
  async getAgents(): Promise<Agent[]> {
    const result = await db.select().from(agentsTable).orderBy(desc(agentsTable.createdAt));
    return result.map(this.mapAgent);
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    const result = await db.select().from(agentsTable).where(eq(agentsTable.id, id));
    return result[0] ? this.mapAgent(result[0]) : undefined;
  }

  async findDuplicateAgent(name: string, phone: string): Promise<Agent | undefined> {
    const result = await db.select().from(agentsTable).where(
      and(eq(agentsTable.name, name), eq(agentsTable.phone, phone))
    );
    return result[0] ? this.mapAgent(result[0]) : undefined;
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const id = randomUUID();
    const result = await db.insert(agentsTable).values({
      id,
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
    const result = await db.update(agentsTable).set({
      name: updates.name,
      phone: updates.phone,
      company: updates.company,
      address: updates.address,
      email: updates.email,
      creditBalance: updates.creditBalance,
      depositBalance: updates.depositBalance,
    }).where(eq(agentsTable.id, id)).returning();
    return result[0] ? this.mapAgent(result[0]) : undefined;
  }

  // Vendors
  async getVendors(): Promise<Vendor[]> {
    const result = await db.select().from(vendorsTable).orderBy(desc(vendorsTable.createdAt));
    return result.map(this.mapVendor);
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const result = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id));
    return result[0] ? this.mapVendor(result[0]) : undefined;
  }

  async findDuplicateVendor(name: string, phone: string): Promise<Vendor | undefined> {
    const result = await db.select().from(vendorsTable).where(
      and(eq(vendorsTable.name, name), eq(vendorsTable.phone, phone))
    );
    return result[0] ? this.mapVendor(result[0]) : undefined;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const id = randomUUID();
    const result = await db.insert(vendorsTable).values({
      id,
      name: vendor.name,
      email: vendor.email || "",
      phone: vendor.phone,
      telephone: vendor.telephone || "",
      address: vendor.address || "",
      logo: vendor.logo || "",
      creditBalance: vendor.creditBalance || 0,
      depositBalance: vendor.depositBalance || 0,
      airlines: vendor.airlines || [],
    }).returning();
    return this.mapVendor(result[0]);
  }

  async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor | undefined> {
    const result = await db.update(vendorsTable).set({
      name: updates.name,
      email: updates.email,
      phone: updates.phone,
      telephone: updates.telephone,
      address: updates.address,
      logo: updates.logo,
      creditBalance: updates.creditBalance,
      depositBalance: updates.depositBalance,
      airlines: updates.airlines,
    }).where(eq(vendorsTable.id, id)).returning();
    return result[0] ? this.mapVendor(result[0]) : undefined;
  }

  // Airlines (master list)
  async getAirlines(): Promise<Airline[]> {
    const result = await db.select().from(airlinesTable).orderBy(airlinesTable.name);
    return result;
  }

  async getAirline(id: string): Promise<Airline | undefined> {
    const result = await db.select().from(airlinesTable).where(eq(airlinesTable.id, id));
    return result[0];
  }

  async createAirline(airline: InsertAirline): Promise<Airline> {
    const id = randomUUID();
    const result = await db.insert(airlinesTable).values({
      id,
      name: airline.name,
      code: airline.code.toUpperCase(),
      logo: airline.logo || "",
      active: airline.active ?? true,
    }).returning();
    return result[0];
  }

  async updateAirline(id: string, updates: Partial<Airline>): Promise<Airline | undefined> {
    const result = await db.update(airlinesTable).set({
      name: updates.name,
      code: updates.code?.toUpperCase(),
      logo: updates.logo,
      active: updates.active,
    }).where(eq(airlinesTable.id, id)).returning();
    return result[0];
  }

  async deleteAirline(id: string): Promise<boolean> {
    const result = await db.delete(airlinesTable).where(eq(airlinesTable.id, id)).returning();
    return result.length > 0;
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    const result = await db.select().from(invoicesTable).orderBy(desc(invoicesTable.createdAt));
    return result.map(this.mapInvoice);
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const result = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
    return result[0] ? this.mapInvoice(result[0]) : undefined;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    await this.ensureCountersInitialized();
    const id = randomUUID();
    const invoiceNumber = `INV-${this.invoiceCounter++}`;
    const result = await db.insert(invoicesTable).values({
      id,
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
      useVendorBalance: invoice.useVendorBalance || "none",
      vendorBalanceDeducted: invoice.vendorBalanceDeducted || 0,
      notes: invoice.notes || "",
      issuedBy: invoice.issuedBy,
      status: "issued",
      paidAmount: 0,
    }).returning();
    return this.mapInvoice(result[0]);
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const result = await db.update(invoicesTable).set({
      status: updates.status,
      paidAmount: updates.paidAmount,
      notes: updates.notes,
    }).where(eq(invoicesTable.id, id)).returning();
    return result[0] ? this.mapInvoice(result[0]) : undefined;
  }

  async getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
    const result = await db.select().from(invoicesTable).where(
      and(eq(invoicesTable.customerId, customerId), eq(invoicesTable.customerType, "customer"))
    ).orderBy(desc(invoicesTable.createdAt));
    return result.map(this.mapInvoice);
  }

  async getInvoicesByAgent(agentId: string): Promise<Invoice[]> {
    const result = await db.select().from(invoicesTable).where(
      and(eq(invoicesTable.customerId, agentId), eq(invoicesTable.customerType, "agent"))
    ).orderBy(desc(invoicesTable.createdAt));
    return result.map(this.mapInvoice);
  }

  // Tickets
  async getTickets(): Promise<Ticket[]> {
    const result = await db.select().from(ticketsTable).orderBy(desc(ticketsTable.createdAt));
    return result.map(this.mapTicket);
  }

  async getTicketsByVendor(vendorId: string): Promise<Ticket[]> {
    const result = await db.select().from(ticketsTable).where(eq(ticketsTable.vendorId, vendorId)).orderBy(desc(ticketsTable.createdAt));
    return result.map(this.mapTicket);
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const result = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id));
    return result[0] ? this.mapTicket(result[0]) : undefined;
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const id = randomUUID();
    const result = await db.insert(ticketsTable).values({
      id,
      ticketNumber: ticket.ticketNumber || null,
      pnr: ticket.pnr || null,
      passportNumber: ticket.passportNumber,
      customerId: ticket.customerId,
      vendorId: ticket.vendorId || null,
      invoiceId: ticket.invoiceId || null,
      tripType: ticket.tripType || "one_way",
      ticketType: ticket.ticketType,
      seatClass: ticket.seatClass || "economy",
      route: ticket.route,
      airlines: ticket.airlines,
      flightNumber: ticket.flightNumber || null,
      flightTime: ticket.flightTime || null,
      travelDate: ticket.travelDate,
      returnDate: ticket.returnDate || null,
      passengerName: ticket.passengerName,
      passengerNames: ticket.passengerNames || null,
      passengerCount: ticket.passengerCount || 1,
      ticketNumbers: ticket.ticketNumbers || null,
      baggageAllowance: ticket.baggageAllowance || null,
      faceValue: ticket.faceValue,
      deductFromDeposit: ticket.deductFromDeposit || false,
      depositDeducted: ticket.depositDeducted || 0,
      eticketImage: ticket.eticketImage || null,
      eticketFiles: ticket.eticketFiles || null,
      issuedBy: ticket.issuedBy,
      status: "pending",
    }).returning();
    return this.mapTicket(result[0]);
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const updateData: Record<string, any> = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.eticketImage !== undefined) updateData.eticketImage = updates.eticketImage;
    if (updates.ticketNumber !== undefined) updateData.ticketNumber = updates.ticketNumber;
    if (updates.pnr !== undefined) updateData.pnr = updates.pnr;
    if (updates.seatClass !== undefined) updateData.seatClass = updates.seatClass;
    if (updates.baggageAllowance !== undefined) updateData.baggageAllowance = updates.baggageAllowance;
    if (updates.flightNumber !== undefined) updateData.flightNumber = updates.flightNumber;
    if (updates.flightTime !== undefined) updateData.flightTime = updates.flightTime;
    if (updates.route !== undefined) updateData.route = updates.route;
    if (updates.travelDate !== undefined) updateData.travelDate = updates.travelDate;
    if (updates.returnDate !== undefined) updateData.returnDate = updates.returnDate;
    if (updates.passengerName !== undefined) updateData.passengerName = updates.passengerName;
    if (updates.faceValue !== undefined) updateData.faceValue = updates.faceValue;
    if ((updates as any).isPaid !== undefined) updateData.isPaid = (updates as any).isPaid;
    if ((updates as any).paidAt !== undefined) updateData.paidAt = (updates as any).paidAt;
    if ((updates as any).paidBy !== undefined) updateData.paidBy = (updates as any).paidBy;
    
    if (Object.keys(updateData).length === 0) {
      return this.getTicket(id);
    }
    
    const result = await db.update(ticketsTable).set(updateData).where(eq(ticketsTable.id, id)).returning();
    return result[0] ? this.mapTicket(result[0]) : undefined;
  }

  // Deposit Transactions
  async getDepositTransactions(): Promise<DepositTransaction[]> {
    const result = await db.select().from(depositTransactionsTable).orderBy(desc(depositTransactionsTable.createdAt));
    return result.map(this.mapDepositTransaction);
  }

  async getCustomerDepositTransactions(customerId: string): Promise<DepositTransaction[]> {
    const result = await db.select().from(depositTransactionsTable).where(eq(depositTransactionsTable.customerId, customerId)).orderBy(desc(depositTransactionsTable.createdAt));
    return result.map(this.mapDepositTransaction);
  }

  async createDepositTransaction(tx: InsertDepositTransaction): Promise<DepositTransaction> {
    const id = randomUUID();
    const customer = await this.getCustomer(tx.customerId);
    const currentBalance = customer?.depositBalance || 0;
    const newBalance = tx.type === "credit" ? currentBalance + tx.amount : currentBalance - tx.amount;

    await this.updateCustomer(tx.customerId, { depositBalance: newBalance });

    const result = await db.insert(depositTransactionsTable).values({
      id,
      customerId: tx.customerId,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      referenceId: tx.referenceId || null,
      referenceType: tx.referenceType || null,
      balanceAfter: newBalance,
    }).returning();
    return this.mapDepositTransaction(result[0]);
  }

  // Vendor Transactions
  async getVendorTransactions(): Promise<VendorTransaction[]> {
    const result = await db.select().from(vendorTransactionsTable).orderBy(desc(vendorTransactionsTable.createdAt));
    return result.map(this.mapVendorTransaction);
  }

  async getVendorTransactionsByVendor(vendorId: string): Promise<VendorTransaction[]> {
    const result = await db.select().from(vendorTransactionsTable).where(eq(vendorTransactionsTable.vendorId, vendorId)).orderBy(desc(vendorTransactionsTable.createdAt));
    return result.map(this.mapVendorTransaction);
  }

  async createVendorTransaction(tx: InsertVendorTransaction): Promise<VendorTransaction> {
    const id = randomUUID();
    const vendor = await this.getVendor(tx.vendorId);
    if (!vendor) throw new Error("Vendor not found");

    let newBalance: number;
    if (tx.transactionType === "credit") {
      newBalance = tx.type === "credit" ? vendor.creditBalance + tx.amount : vendor.creditBalance - tx.amount;
      await this.updateVendor(tx.vendorId, { creditBalance: newBalance });
    } else {
      newBalance = tx.type === "credit" ? vendor.depositBalance + tx.amount : vendor.depositBalance - tx.amount;
      await this.updateVendor(tx.vendorId, { depositBalance: newBalance });
    }

    const result = await db.insert(vendorTransactionsTable).values({
      id,
      vendorId: tx.vendorId,
      type: tx.type,
      transactionType: tx.transactionType,
      amount: tx.amount,
      description: tx.description,
      paymentMethod: tx.paymentMethod || "cash",
      referenceId: tx.referenceId || null,
      referenceType: tx.referenceType || null,
      balanceAfter: newBalance,
    }).returning();
    return this.mapVendorTransaction(result[0]);
  }

  // Activity Logs
  async getActivityLogs(limit?: number): Promise<ActivityLog[]> {
    let query = db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt));
    if (limit) {
      query = query.limit(limit) as any;
    }
    const result = await query;
    return result.map(this.mapActivityLog);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = randomUUID();
    const result = await db.insert(activityLogsTable).values({
      id,
      userId: log.userId,
      userName: log.userName,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      entityName: log.entityName,
      details: log.details,
      ipAddress: log.ipAddress || null,
    }).returning();
    return this.mapActivityLog(result[0]);
  }

  // Documents
  async getDocuments(entityType: string, entityId: string): Promise<DocumentAttachment[]> {
    const result = await db.select().from(documentsTable).where(
      and(eq(documentsTable.entityType, entityType), eq(documentsTable.entityId, entityId))
    );
    return result.map(this.mapDocument);
  }

  async createDocument(doc: InsertDocumentAttachment): Promise<DocumentAttachment> {
    const id = randomUUID();
    const result = await db.insert(documentsTable).values({
      id,
      entityType: doc.entityType,
      entityId: doc.entityId,
      documentType: doc.documentType,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      uploadedBy: doc.uploadedBy,
    }).returning();
    return this.mapDocument(result[0]);
  }

  async deleteDocument(id: string): Promise<boolean> {
    await db.delete(documentsTable).where(eq(documentsTable.id, id));
    return true;
  }

  // Dashboard Metrics
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const customers = await this.getCustomers();
    const vendors = await this.getVendors();
    const invoices = await this.getInvoices();
    const tickets = await this.getTickets();

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const pendingPayments = invoices.filter(inv => inv.status !== "paid").reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0);
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

  // Sales Analytics
  async getSalesAnalytics(startDate?: string, endDate?: string): Promise<SalesAnalytics> {
    const invoices = await this.getInvoices();
    const tickets = await this.getTickets();
    const customers = await this.getCustomers();
    const agents = await this.getAgents();
    const vendors = await this.getVendors();

    const dailySales: { date: string; amount: number; count: number }[] = [];
    const invoicesByDate = new Map<string, { amount: number; count: number }>();
    
    for (const inv of invoices) {
      const date = inv.createdAt.split("T")[0];
      const existing = invoicesByDate.get(date) || { amount: 0, count: 0 };
      existing.amount += inv.total;
      existing.count += 1;
      invoicesByDate.set(date, existing);
    }
    
    for (const [date, data] of invoicesByDate) {
      dailySales.push({ date, ...data });
    }

    const topCustomers = customers.map(c => {
      const custInvoices = invoices.filter(i => i.customerId === c.id && i.customerType === "customer");
      return {
        id: c.id,
        name: c.name,
        totalSpent: custInvoices.reduce((sum, i) => sum + i.total, 0),
        invoiceCount: custInvoices.length,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

    const topAgents = agents.map(a => {
      const agentInvoices = invoices.filter(i => i.customerId === a.id && i.customerType === "agent");
      const agentTickets = tickets.filter(t => t.customerId === a.id);
      return {
        id: a.id,
        name: a.name,
        totalSales: agentInvoices.reduce((sum, i) => sum + i.total, 0),
        ticketCount: agentTickets.length,
      };
    }).sort((a, b) => b.totalSales - a.totalSales).slice(0, 10);

    const routeMap = new Map<string, { count: number; revenue: number }>();
    for (const t of tickets) {
      const existing = routeMap.get(t.route) || { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += t.faceValue;
      routeMap.set(t.route, existing);
    }
    const topRoutes = Array.from(routeMap.entries()).map(([route, data]) => ({
      route,
      ...data,
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    const vendorComparison = vendors.map(v => {
      const vendorTickets = tickets.filter(t => t.vendorId === v.id);
      const totalCost = vendorTickets.reduce((sum, t) => sum + t.faceValue, 0);
      return {
        id: v.id,
        name: v.name,
        totalCost,
        ticketCount: vendorTickets.length,
        avgCost: vendorTickets.length > 0 ? totalCost / vendorTickets.length : 0,
      };
    }).sort((a, b) => b.totalCost - a.totalCost);

    const profitByVendor = vendors.map(v => {
      const vendorInvoices = invoices.filter(i => i.vendorId === v.id);
      const revenue = vendorInvoices.reduce((sum, i) => sum + i.total, 0);
      const cost = vendorInvoices.reduce((sum, i) => sum + i.vendorCost, 0);
      const profit = revenue - cost;
      return {
        vendorId: v.id,
        vendorName: v.name,
        revenue,
        cost,
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      };
    }).sort((a, b) => b.profit - a.profit);

    return {
      dailySales,
      topCustomers,
      topAgents,
      topRoutes,
      vendorComparison,
      profitByVendor,
    };
  }

  async getCurrencyRates(): Promise<CurrencyRate[]> {
    return currencyRates;
  }

  async getUsers(): Promise<User[]> {
    const result = await db.select().from(usersTable);
    return result.map(this.mapUser);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.active !== undefined) updateData.active = updates.active;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.pin !== undefined) updateData.pin = updates.pin;
    if (updates.passwordHint !== undefined) updateData.passwordHint = updates.passwordHint;
    if (updates.password !== undefined) {
      updateData.password = bcrypt.hashSync(updates.password, 10);
      updateData.plainPassword = updates.password;
    }

    const result = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
    return result[0] ? this.mapUser(result[0]) : undefined;
  }

  async resetUsers(): Promise<void> {
    await db.delete(usersTable);
  }

  async resetAllData(): Promise<void> {
    // Reset ticket issuance data only - keep customers, vendors, agents, airlines
    // Delete tickets and invoices
    await db.delete(ticketsTable);
    await db.delete(invoicesTable);
    await db.delete(depositTransactionsTable);
    await db.delete(vendorTransactionsTable);
    await db.delete(activityLogsTable);
    await db.delete(documentsTable);
    
    // Reset customer deposit balances to 0
    await db.update(customersTable).set({ depositBalance: 0 });
    
    // Reset agent balances to 0
    await db.update(agentsTable).set({ creditBalance: 0, depositBalance: 0 });
    
    // Reset vendor balances to 0
    await db.update(vendorsTable).set({ creditBalance: 0, depositBalance: 0 });
    
    // Reset counters
    this.invoiceCounter = 1000;
    this.ticketCounter = 1000;
  }

  // Helper mapping functions
  private mapUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      plainPassword: row.plainPassword,
      name: row.name,
      email: row.email,
      phone: row.phone,
      passwordHint: row.passwordHint,
      pin: row.pin,
      active: row.active,
      role: row.role as "superadmin" | "staff",
      twoFactorEnabled: row.twoFactorEnabled,
      twoFactorSecret: row.twoFactorSecret,
    };
  }

  private mapBillCreator(row: any): BillCreator {
    return {
      id: row.id,
      name: row.name,
      pin: row.pin,
      active: row.active ?? true,
    };
  }

  private mapCustomer(row: any): Customer {
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

  private mapAgent(row: any): Agent {
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

  private mapVendor(row: any): Vendor {
    return {
      id: row.id,
      name: row.name,
      email: row.email || "",
      phone: row.phone || "",
      telephone: row.telephone || "",
      address: row.address || "",
      logo: row.logo || "",
      creditBalance: row.creditBalance || 0,
      depositBalance: row.depositBalance || 0,
      airlines: (row.airlines as any[]) || [],
    };
  }

  private mapInvoice(row: any): Invoice {
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      customerType: row.customerType as "customer" | "agent",
      customerId: row.customerId,
      vendorId: row.vendorId,
      items: (row.items as any[]) || [],
      subtotal: row.subtotal,
      discountPercent: row.discountPercent || 0,
      discountAmount: row.discountAmount || 0,
      total: row.total,
      vendorCost: row.vendorCost || 0,
      paymentMethod: row.paymentMethod as "cash" | "card" | "credit",
      useCustomerDeposit: row.useCustomerDeposit || false,
      depositUsed: row.depositUsed || 0,
      useVendorBalance: row.useVendorBalance as "none" | "credit" | "deposit",
      vendorBalanceDeducted: row.vendorBalanceDeducted || 0,
      notes: row.notes || "",
      issuedBy: row.issuedBy,
      status: row.status as "draft" | "issued" | "paid" | "partial" | "cancelled",
      paidAmount: row.paidAmount || 0,
      createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  private mapTicket(row: any): Ticket {
    return {
      id: row.id,
      ticketNumber: row.ticketNumber,
      pnr: row.pnr,
      passportNumber: row.passportNumber,
      customerId: row.customerId,
      vendorId: row.vendorId,
      invoiceId: row.invoiceId,
      tripType: row.tripType as "one_way" | "round_trip",
      ticketType: row.ticketType,
      seatClass: row.seatClass as "economy" | "business" | "first",
      route: row.route,
      airlines: row.airlines,
      flightNumber: row.flightNumber,
      flightTime: row.flightTime,
      travelDate: row.travelDate,
      returnDate: row.returnDate,
      passengerName: row.passengerName,
      passengerNames: row.passengerNames || null,
      passengerCount: row.passengerCount || 1,
      ticketNumbers: row.ticketNumbers || null,
      baggageAllowance: row.baggageAllowance,
      faceValue: row.faceValue,
      deductFromDeposit: row.deductFromDeposit || false,
      depositDeducted: row.depositDeducted || 0,
      eticketImage: row.eticketImage,
      eticketFiles: row.eticketFiles || null,
      issuedBy: row.issuedBy,
      status: row.status as "pending" | "processing" | "approved" | "issued" | "used" | "cancelled" | "refunded",
      isPaid: row.isPaid || false,
      paidAt: row.paidAt?.toISOString() || null,
      paidBy: row.paidBy || null,
      createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  private mapDepositTransaction(row: any): DepositTransaction {
    return {
      id: row.id,
      customerId: row.customerId,
      type: row.type as "credit" | "debit",
      amount: row.amount,
      description: row.description,
      referenceId: row.referenceId,
      referenceType: row.referenceType,
      balanceAfter: row.balanceAfter,
      createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  private mapVendorTransaction(row: any): VendorTransaction {
    return {
      id: row.id,
      vendorId: row.vendorId,
      type: row.type as "credit" | "debit",
      transactionType: row.transactionType as "credit" | "deposit",
      amount: row.amount,
      description: row.description,
      paymentMethod: row.paymentMethod as "cash" | "cheque" | "bank_transfer",
      referenceId: row.referenceId,
      referenceType: row.referenceType,
      balanceAfter: row.balanceAfter,
      createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  private mapActivityLog(row: any): ActivityLog {
    return {
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      action: row.action as any,
      entity: row.entity as any,
      entityId: row.entityId,
      entityName: row.entityName,
      details: row.details,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  private mapDocument(row: any): DocumentAttachment {
    return {
      id: row.id,
      entityType: row.entityType as any,
      entityId: row.entityId,
      documentType: row.documentType as any,
      fileName: row.fileName,
      fileUrl: row.fileUrl,
      uploadedBy: row.uploadedBy,
      uploadedAt: row.uploadedAt?.toISOString() || new Date().toISOString(),
    };
  }
}

export const storage = new DatabaseStorage();
