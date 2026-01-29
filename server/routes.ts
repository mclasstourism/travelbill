import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertCustomerSchema,
  insertAgentSchema,
  insertVendorSchema,
  insertBillCreatorSchema,
  insertInvoiceSchema,
  insertTicketSchema,
  insertDepositTransactionSchema,
  insertVendorTransactionSchema,
  insertUserSchema,
} from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

// Server-side session store
const sessions = new Map<string, { userId: string; role: string; createdAt: number }>();
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (now - session.createdAt > SESSION_DURATION) {
      sessions.delete(token);
    }
  }
}

// Middleware to check authentication
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const session = sessions.get(token);
  if (!session || Date.now() - session.createdAt > SESSION_DURATION) {
    sessions.delete(token || "");
    res.status(401).json({ error: "Session expired" });
    return;
  }
  (req as any).session = session;
  next();
}

// Middleware to check role
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = (req as any).session;
    if (!session || !roles.includes(session.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Bill Creators (admin only)
  app.get("/api/bill-creators", requireAuth, requireRole("superadmin"), async (req, res) => {
    try {
      const creators = await storage.getBillCreators();
      // Don't expose PIN in response
      const sanitized = creators.map(({ pin, ...rest }) => rest);
      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bill creators" });
    }
  });

  app.post("/api/bill-creators", requireAuth, requireRole("superadmin"), async (req, res) => {
    try {
      const data = insertBillCreatorSchema.parse(req.body);
      const creator = await storage.createBillCreator(data);
      const { pin, ...sanitized } = creator;
      res.status(201).json(sanitized);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create bill creator" });
      }
    }
  });

  app.patch("/api/bill-creators/:id", requireAuth, requireRole("superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { active } = req.body;
      const updated = await storage.updateBillCreator(id, { active });
      if (!updated) {
        res.status(404).json({ error: "Bill creator not found" });
        return;
      }
      const { pin, ...sanitized } = updated;
      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ error: "Failed to update bill creator" });
    }
  });

  // Staff Login Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      cleanExpiredSessions();
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ success: false, error: "Username and password are required" });
        return;
      }
      const user = await storage.verifyUserPassword(username, password);
      if (!user) {
        res.status(401).json({ success: false, error: "Invalid credentials" });
        return;
      }
      // Generate server-side session token
      const token = generateSessionToken();
      sessions.set(token, { userId: user.id, role: user.role, createdAt: Date.now() });
      
      const { password: _, ...safeUser } = user;
      res.json({ success: true, user: safeUser, token });
    } catch (error) {
      res.status(500).json({ success: false, error: "Login failed" });
    }
  });

  // Validate user session using token
  app.post("/api/auth/validate", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "") || req.body.token;
      if (!token) {
        res.status(400).json({ valid: false });
        return;
      }
      const session = sessions.get(token);
      if (!session || Date.now() - session.createdAt > SESSION_DURATION) {
        sessions.delete(token);
        res.status(401).json({ valid: false });
        return;
      }
      const user = await storage.getUser(session.userId);
      if (!user) {
        sessions.delete(token);
        res.status(401).json({ valid: false });
        return;
      }
      const { password: _, ...safeUser } = user;
      res.json({ valid: true, user: safeUser });
    } catch (error) {
      res.status(500).json({ valid: false });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      sessions.delete(token);
    }
    res.json({ success: true });
  });

  // Get password hint for a username
  app.post("/api/auth/password-hint", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        res.status(400).json({ hint: null });
        return;
      }
      const hint = await storage.getPasswordHint(username);
      res.json({ hint });
    } catch (error) {
      res.status(500).json({ hint: null });
    }
  });

  // Request password reset (send code via email)
  app.post("/api/auth/request-reset", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, error: "Email is required" });
        return;
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists for security
        res.json({ success: true, message: "If an account exists with this email, a reset code will be sent" });
        return;
      }
      
      const resetToken = await storage.createPasswordResetToken(user.id);
      
      // Send email with reset code
      const { sendPasswordResetEmail } = await import("./lib/resend");
      const sent = await sendPasswordResetEmail(email, resetToken.token);
      
      if (sent) {
        res.json({ success: true, message: "Reset code sent to your email" });
      } else {
        res.status(500).json({ success: false, error: "Failed to send reset email" });
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ success: false, error: "Failed to process reset request" });
    }
  });

  // Verify reset code and set new password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { code, newPassword } = req.body;
      if (!code || !newPassword) {
        res.status(400).json({ success: false, error: "Code and new password are required" });
        return;
      }
      
      if (newPassword.length < 6) {
        res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
        return;
      }
      
      const resetToken = await storage.getPasswordResetToken(code);
      if (!resetToken) {
        res.status(400).json({ success: false, error: "Invalid or expired reset code" });
        return;
      }
      
      const success = await storage.updateUserPassword(resetToken.userId, newPassword);
      if (success) {
        await storage.markTokenUsed(resetToken.id);
        res.json({ success: true, message: "Password reset successfully" });
      } else {
        res.status(500).json({ success: false, error: "Failed to reset password" });
      }
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ success: false, error: "Failed to reset password" });
    }
  });

  // Change password (authenticated user)
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req as any).user?.id;
      
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Current and new password are required" });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: "New password must be at least 6 characters" });
        return;
      }

      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const bcrypt = await import("bcryptjs");
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updated = await storage.updateUser(userId, { password: hashedPassword });
      
      if (updated) {
        res.json({ success: true, message: "Password changed successfully" });
      } else {
        res.status(500).json({ error: "Failed to change password" });
      }
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // PIN Authentication
  app.post("/api/auth/verify-pin", async (req, res) => {
    try {
      const { creatorId, pin } = req.body;
      if (!creatorId || !pin) {
        res.status(400).json({ error: "Creator ID and PIN are required" });
        return;
      }
      const verified = await storage.verifyPin(creatorId, pin);
      if (verified) {
        const { pin: _, ...sanitized } = verified;
        res.json({ success: true, billCreator: sanitized });
      } else {
        res.status(401).json({ success: false, error: "Invalid PIN" });
      }
    } catch (error) {
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Customers
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", requireAuth, async (req, res) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      
      // Check for duplicate customer by name or phone
      const duplicate = await storage.findDuplicateCustomer(data.name, data.phone);
      if (duplicate) {
        res.status(409).json({ 
          error: `Customer already exists with matching ${duplicate.name.toLowerCase() === data.name.toLowerCase() ? 'name' : 'phone number'}` 
        });
        return;
      }
      
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create customer" });
      }
    }
  });

  // Agents
  app.get("/api/agents", requireAuth, async (req, res) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  app.get("/api/agents/:id", requireAuth, async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agent" });
    }
  });

  app.post("/api/agents", requireAuth, async (req, res) => {
    try {
      const data = insertAgentSchema.parse(req.body);
      
      // Check for duplicate agent by name or phone
      const duplicate = await storage.findDuplicateAgent(data.name, data.phone);
      if (duplicate) {
        res.status(409).json({ 
          error: `Agent already exists with matching ${duplicate.name.toLowerCase() === data.name.toLowerCase() ? 'name' : 'phone number'}` 
        });
        return;
      }
      
      const agent = await storage.createAgent(data);
      res.status(201).json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create agent" });
      }
    }
  });

  // Vendors
  app.get("/api/vendors", requireAuth, async (req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", requireAuth, async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        res.status(404).json({ error: "Vendor not found" });
        return;
      }
      res.json(vendor);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor" });
    }
  });

  app.post("/api/vendors", requireAuth, async (req, res) => {
    try {
      const data = insertVendorSchema.parse(req.body);
      
      // Check for duplicate vendor by name or phone
      const duplicate = await storage.findDuplicateVendor(data.name, data.phone);
      if (duplicate) {
        res.status(409).json({ 
          error: `Vendor already exists with matching ${duplicate.name.toLowerCase() === data.name.toLowerCase() ? 'name' : 'phone number'}` 
        });
        return;
      }
      
      const vendor = await storage.createVendor(data);
      res.status(201).json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create vendor" });
      }
    }
  });

  // Invoices
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", requireAuth, async (req, res) => {
    try {
      const data = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(data);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create invoice" });
      }
    }
  });

  app.patch("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateInvoice(id, req.body);
      if (!updated) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  // Tickets
  app.get("/api/tickets", requireAuth, async (req, res) => {
    try {
      const tickets = await storage.getTickets();
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  app.get("/api/tickets/:id", requireAuth, async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  app.post("/api/tickets", requireAuth, async (req, res) => {
    try {
      const data = insertTicketSchema.parse(req.body);
      const ticket = await storage.createTicket(data);
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create ticket" });
      }
    }
  });

  app.patch("/api/tickets/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateTicket(id, req.body);
      if (!updated) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  // Deposit Transactions
  app.get("/api/deposit-transactions", requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getDepositTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deposit transactions" });
    }
  });

  app.get("/api/customers/:id/deposits", requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getCustomerDepositTransactions(req.params.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer deposits" });
    }
  });

  app.post("/api/deposit-transactions", requireAuth, async (req, res) => {
    try {
      const data = insertDepositTransactionSchema.parse(req.body);
      const transaction = await storage.createDepositTransaction(data);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create deposit transaction" });
      }
    }
  });

  // Vendor Transactions
  app.get("/api/vendor-transactions", requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getVendorTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor transactions" });
    }
  });

  app.get("/api/vendors/:id/transactions", requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getVendorTransactionsByVendor(req.params.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor transactions" });
    }
  });

  app.post("/api/vendor-transactions", requireAuth, async (req, res) => {
    try {
      const data = insertVendorTransactionSchema.parse(req.body);
      const transaction = await storage.createVendorTransaction(data);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create vendor transaction" });
      }
    }
  });

  // Dashboard Metrics
  app.get("/api/metrics", requireAuth, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  // Activity Logs (superadmin and staff)
  app.get("/api/activity-logs", requireAuth, requireRole("superadmin", "staff"), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // Sales Analytics
  app.get("/api/analytics", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await storage.getSalesAnalytics(
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Currency Rates
  app.get("/api/currency-rates", requireAuth, async (req, res) => {
    try {
      const rates = await storage.getCurrencyRates();
      res.json(rates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch currency rates" });
    }
  });

  // Users Management (admin only)
  app.get("/api/users", requireAuth, requireRole("superadmin"), async (req, res) => {
    try {
      const users = await storage.getUsers();
      const safeUsers = users.map(({ password, twoFactorSecret, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id", requireAuth, requireRole("superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const { twoFactorSecret, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole("superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (user.role === "superadmin") {
        res.status(403).json({ error: "Cannot delete superadmin users" });
        return;
      }
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.post("/api/users", requireAuth, requireRole("superadmin"), async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByUsername(data.username);
      if (existing) {
        res.status(409).json({ error: "Username already exists" });
        return;
      }
      const user = await storage.createUser(data);
      const { password, twoFactorSecret, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create user" });
      }
    }
  });

  // Admin: Reset data
  app.post("/api/admin/reset-data", requireAuth, requireRole("superadmin"), async (req, res) => {
    try {
      const { type } = req.body;
      if (type === "users") {
        await storage.resetUsers();
        res.json({ success: true, message: "Users reset to defaults" });
      } else if (type === "all") {
        await storage.resetAllData();
        res.json({ success: true, message: "All data has been reset" });
      } else {
        res.status(400).json({ error: "Invalid reset type" });
      }
    } catch (error) {
      console.error("Reset data error:", error);
      res.status(500).json({ error: "Failed to reset data" });
    }
  });

  // Admin: Logout all users
  app.post("/api/admin/logout-all-users", requireAuth, requireRole("superadmin"), async (req, res) => {
    try {
      const currentUserId = (req as any).user?.id;
      // Clear all sessions except current user
      const sessionEntries = Array.from(sessions.entries());
      for (const [token, session] of sessionEntries) {
        if (session.userId !== currentUserId) {
          sessions.delete(token);
        }
      }
      res.json({ success: true, message: "All user sessions terminated" });
    } catch (error) {
      console.error("Logout all users error:", error);
      res.status(500).json({ error: "Failed to logout users" });
    }
  });

  // Admin: Send sales report
  app.post("/api/admin/send-report", requireAuth, requireRole("superadmin"), async (req, res) => {
    try {
      const { type } = req.body;
      const user = await storage.getUser((req as any).user?.id);
      
      if (!user?.email) {
        res.status(400).json({ error: "No email address configured for admin account" });
        return;
      }

      // Get report data based on type
      const now = new Date();
      let startDate: Date;
      let reportTitle: string;

      switch (type) {
        case "daily":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          reportTitle = "Daily Sales Report";
          break;
        case "weekly":
          const dayOfWeek = now.getDay();
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
          reportTitle = "Weekly Sales Report";
          break;
        case "monthly":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          reportTitle = "Monthly Sales Report";
          break;
        case "yearly":
          startDate = new Date(now.getFullYear(), 0, 1);
          reportTitle = "Yearly Sales Report";
          break;
        default:
          res.status(400).json({ error: "Invalid report type" });
          return;
      }

      // Get invoices and tickets for the period
      const invoices = await storage.getInvoices();
      const tickets = await storage.getTickets();
      
      const periodInvoices = invoices.filter(inv => new Date(inv.createdAt || "") >= startDate);
      const periodTickets = tickets.filter(t => new Date(t.createdAt || "") >= startDate);

      const totalRevenue = periodInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const ticketCount = periodTickets.length;
      const invoiceCount = periodInvoices.length;

      // Send email report
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: "Billing System <onboarding@resend.dev>",
        to: user.email,
        subject: `${reportTitle} - ${now.toLocaleDateString()}`,
        html: `
          <h1>${reportTitle}</h1>
          <p>Report generated on ${now.toLocaleString()}</p>
          <hr>
          <h2>Summary</h2>
          <ul>
            <li><strong>Total Revenue:</strong> AED ${totalRevenue.toLocaleString()}</li>
            <li><strong>Invoices Created:</strong> ${invoiceCount}</li>
            <li><strong>Tickets Issued:</strong> ${ticketCount}</li>
          </ul>
          <p>For detailed reports, please log in to the billing system.</p>
        `,
      });

      res.json({ success: true, message: `${reportTitle} sent to ${user.email}` });
    } catch (error) {
      console.error("Send report error:", error);
      res.status(500).json({ error: "Failed to send report" });
    }
  });

  // Documents
  app.get("/api/documents/:entityType/:entityId", requireAuth, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const documents = await storage.getDocuments(entityType, entityId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.delete("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteDocument(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Document not found" });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Customer Portal - Get invoices for a customer
  app.get("/api/customers/:id/invoices", requireAuth, async (req, res) => {
    try {
      const invoices = await storage.getInvoicesByCustomer(req.params.id);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer invoices" });
    }
  });

  // Agent invoices
  app.get("/api/agents/:id/invoices", requireAuth, async (req, res) => {
    try {
      const invoices = await storage.getInvoicesByAgent(req.params.id);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agent invoices" });
    }
  });

  // Email invoice
  app.post("/api/invoices/:id/email", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }
      
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      const { sendInvoiceEmail } = await import("./lib/resend");
      const sent = await sendInvoiceEmail(email, invoice);
      
      if (sent) {
        res.json({ success: true, message: "Invoice sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send invoice email" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to send invoice email" });
    }
  });

  // Bulk ticket import (requires authentication)
  app.post("/api/tickets/bulk-import", requireAuth, async (req, res) => {
    try {
      const { tickets } = req.body;
      if (!Array.isArray(tickets)) {
        res.status(400).json({ error: "Tickets must be an array" });
        return;
      }

      const results = { success: 0, failed: 0, errors: [] as { row: number; error: string }[] };
      
      for (let i = 0; i < tickets.length; i++) {
        try {
          const data = insertTicketSchema.parse(tickets[i]);
          await storage.createTicket(data);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            error: error instanceof z.ZodError ? error.errors[0].message : "Invalid ticket data",
          });
        }
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to import tickets" });
    }
  });

  return httpServer;
}
