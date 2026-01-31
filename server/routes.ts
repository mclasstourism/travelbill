import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertCustomerSchema,
  insertAgentSchema,
  insertVendorSchema,
  insertInvoiceSchema,
  insertTicketSchema,
  insertDepositTransactionSchema,
  insertVendorTransactionSchema,
  insertAgentTransactionSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Staff Login Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
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
      const { password: _, ...safeUser } = user;
      res.json({ success: true, user: safeUser });
    } catch (error) {
      res.status(500).json({ success: false, error: "Login failed" });
    }
  });

  // Validate user session
  app.post("/api/auth/validate", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        res.status(400).json({ valid: false });
        return;
      }
      const user = await storage.getUser(userId);
      if (!user) {
        res.status(401).json({ valid: false });
        return;
      }
      const { password: _, ...safeUser } = user;
      res.json({ valid: true, user: safeUser });
    } catch (error) {
      res.status(500).json({ valid: false });
    }
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

  // Get all users (admin only - passwords excluded)
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Create new user (admin only)
  app.post("/api/users", async (req, res) => {
    try {
      const { username, password, email, role, pin } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: "Username and password are required" });
        return;
      }
      if (pin && (pin.length !== 8 || !/^\d{8}$/.test(pin))) {
        res.status(400).json({ error: "PIN must be 8 numeric digits" });
        return;
      }
      const user = await storage.createUser({
        username,
        password,
        email: email || undefined,
        role: role || "staff",
        pin: pin || undefined,
        active: true,
      });
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        res.status(400).json({ error: "Username already exists" });
      } else {
        res.status(500).json({ error: "Failed to create user" });
      }
    }
  });

  // Update user (admin only)
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, pin, active } = req.body;
      
      if (pin !== undefined && pin !== "" && (pin.length !== 8 || !/^\d{8}$/.test(pin))) {
        res.status(400).json({ error: "PIN must be 8 numeric digits" });
        return;
      }
      
      const updates: any = {};
      if (username !== undefined) updates.username = username;
      if (password !== undefined && password !== "") updates.password = password;
      if (pin !== undefined) updates.pin = pin === "" ? null : pin;
      if (active !== undefined) updates.active = active;
      
      const user = await storage.updateUser(id, updates);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        res.status(400).json({ error: "Username already exists" });
      } else {
        res.status(500).json({ error: "Failed to update user" });
      }
    }
  });

  // Delete user (admin only)
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
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

  // PIN Authentication (now uses user's PIN instead of separate bill creator)
  app.post("/api/auth/verify-pin", async (req, res) => {
    try {
      const { creatorId, pin } = req.body;
      if (!creatorId || !pin) {
        res.status(400).json({ error: "User ID and PIN are required" });
        return;
      }
      const verified = await storage.verifyUserPin(creatorId, pin);
      if (verified) {
        const { password: _, pin: __, ...sanitized } = verified;
        res.json({ success: true, billCreator: { id: sanitized.id, name: sanitized.username, active: sanitized.active } });
      } else {
        res.status(401).json({ success: false, error: "Invalid PIN" });
      }
    } catch (error) {
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Get users with PINs (for bill creator selection)
  app.get("/api/bill-creators-from-users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const billCreators = users
        .filter(u => u.pin && u.active)
        .map(u => ({ id: u.id, name: u.username, active: u.active }));
      res.json(billCreators);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bill creators" });
    }
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
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

  app.post("/api/customers", async (req, res) => {
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

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const existing = await storage.getCustomer(req.params.id);
      if (!existing) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }
      
      const updates = req.body;
      const customer = await storage.updateCustomer(req.params.id, updates);
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  // Agents
  app.get("/api/agents", async (req, res) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  app.get("/api/agents/:id", async (req, res) => {
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

  app.post("/api/agents", async (req, res) => {
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

  app.patch("/api/agents/:id", async (req, res) => {
    try {
      const existing = await storage.getAgent(req.params.id);
      if (!existing) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      
      const updates = req.body;
      const agent = await storage.updateAgent(req.params.id, updates);
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: "Failed to update agent" });
    }
  });

  // Vendors
  app.get("/api/vendors", async (req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", async (req, res) => {
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

  app.post("/api/vendors", async (req, res) => {
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

  app.patch("/api/vendors/:id", async (req, res) => {
    try {
      const existing = await storage.getVendor(req.params.id);
      if (!existing) {
        res.status(404).json({ error: "Vendor not found" });
        return;
      }
      
      const updates = req.body;
      const vendor = await storage.updateVendor(req.params.id, updates);
      res.json(vendor);
    } catch (error) {
      res.status(500).json({ error: "Failed to update vendor" });
    }
  });

  // Invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
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

  app.post("/api/invoices", async (req, res) => {
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

  app.patch("/api/invoices/:id", async (req, res) => {
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
  app.get("/api/tickets", async (req, res) => {
    try {
      const tickets = await storage.getTickets();
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  app.get("/api/tickets/:id", async (req, res) => {
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

  app.post("/api/tickets", async (req, res) => {
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

  app.patch("/api/tickets/:id", async (req, res) => {
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
  app.get("/api/deposit-transactions", async (req, res) => {
    try {
      const transactions = await storage.getDepositTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deposit transactions" });
    }
  });

  app.get("/api/customers/:id/deposits", async (req, res) => {
    try {
      const transactions = await storage.getCustomerDepositTransactions(req.params.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer deposits" });
    }
  });

  app.post("/api/deposit-transactions", async (req, res) => {
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
  app.get("/api/vendor-transactions", async (req, res) => {
    try {
      const transactions = await storage.getVendorTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor transactions" });
    }
  });

  app.get("/api/vendors/:id/transactions", async (req, res) => {
    try {
      const transactions = await storage.getVendorTransactionsByVendor(req.params.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor transactions" });
    }
  });

  app.post("/api/vendor-transactions", async (req, res) => {
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

  // Agent Transactions
  app.get("/api/agent-transactions", async (req, res) => {
    try {
      const transactions = await storage.getAgentTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agent transactions" });
    }
  });

  app.get("/api/agents/:id/transactions", async (req, res) => {
    try {
      const transactions = await storage.getAgentTransactionsByAgent(req.params.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agent transactions" });
    }
  });

  app.post("/api/agent-transactions", async (req, res) => {
    try {
      const data = insertAgentTransactionSchema.parse(req.body);
      const transaction = await storage.createAgentTransaction(data);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create agent transaction" });
      }
    }
  });

  // Dashboard Metrics
  app.get("/api/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  // Admin Reset Operations
  app.post("/api/admin/reset", async (req, res) => {
    try {
      const { type, password } = req.body;
      
      if (!type || !password) {
        res.status(400).json({ error: "Type and password are required" });
        return;
      }

      // Verify admin password
      const user = await storage.verifyUserPassword("admin", password);
      if (!user) {
        res.status(401).json({ error: "Invalid admin password" });
        return;
      }

      let message = "";
      switch (type) {
        case "finance":
          await storage.resetFinanceData();
          message = "All finance data has been reset. Transaction histories cleared and balances reset to zero.";
          break;
        case "invoices":
          await storage.resetInvoices();
          message = "All invoice records have been deleted.";
          break;
        case "tickets":
          await storage.resetTickets();
          message = "All ticket records have been deleted.";
          break;
        default:
          res.status(400).json({ error: "Invalid reset type" });
          return;
      }

      res.json({ success: true, message });
    } catch (error) {
      console.error("Admin reset error:", error);
      res.status(500).json({ error: "Failed to perform reset operation" });
    }
  });

  // Change Admin Password
  app.post("/api/admin/change-password", async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Current and new passwords are required" });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: "New password must be at least 6 characters" });
        return;
      }

      // Verify current password
      const user = await storage.verifyUserPassword("admin", currentPassword);
      if (!user) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      // Update password
      const success = await storage.updateUserPassword(user.id, newPassword);
      if (!success) {
        res.status(500).json({ error: "Failed to update password" });
        return;
      }

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // Change Bill Creator PIN
  app.post("/api/admin/change-pin", async (req, res) => {
    try {
      const { billCreatorId, currentPin, newPin } = req.body;
      
      if (!billCreatorId || !currentPin || !newPin) {
        res.status(400).json({ error: "Bill creator, current PIN, and new PIN are required" });
        return;
      }

      if (!/^\d{8}$/.test(newPin)) {
        res.status(400).json({ error: "New PIN must be exactly 8 digits" });
        return;
      }

      // Verify current PIN
      const billCreator = await storage.verifyPin(billCreatorId, currentPin);
      if (!billCreator) {
        res.status(401).json({ error: "Current PIN is incorrect" });
        return;
      }

      // Update PIN
      const updated = await storage.updateBillCreator(billCreatorId, { pin: newPin });
      if (!updated) {
        res.status(500).json({ error: "Failed to update PIN" });
        return;
      }

      res.json({ success: true, message: "PIN changed successfully" });
    } catch (error) {
      console.error("Change PIN error:", error);
      res.status(500).json({ error: "Failed to change PIN" });
    }
  });

  // Delete individual party with password verification
  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const { password } = req.body;
      if (!password) {
        res.status(400).json({ error: "Admin password is required" });
        return;
      }

      const user = await storage.verifyUserPassword("admin", password);
      if (!user) {
        res.status(401).json({ error: "Invalid admin password" });
        return;
      }

      const deleted = await storage.deleteCustomer(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }
      res.json({ success: true, message: "Customer deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  app.delete("/api/agents/:id", async (req, res) => {
    try {
      const { password } = req.body;
      if (!password) {
        res.status(400).json({ error: "Admin password is required" });
        return;
      }

      const user = await storage.verifyUserPassword("admin", password);
      if (!user) {
        res.status(401).json({ error: "Invalid admin password" });
        return;
      }

      const deleted = await storage.deleteAgent(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      res.json({ success: true, message: "Agent deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete agent" });
    }
  });

  app.delete("/api/vendors/:id", async (req, res) => {
    try {
      const { password } = req.body;
      if (!password) {
        res.status(400).json({ error: "Admin password is required" });
        return;
      }

      const user = await storage.verifyUserPassword("admin", password);
      if (!user) {
        res.status(401).json({ error: "Invalid admin password" });
        return;
      }

      const deleted = await storage.deleteVendor(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Vendor not found" });
        return;
      }
      res.json({ success: true, message: "Vendor deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  return httpServer;
}
