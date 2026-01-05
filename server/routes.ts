import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertCustomerSchema,
  insertVendorSchema,
  insertBillCreatorSchema,
  insertInvoiceSchema,
  insertTicketSchema,
  insertDepositTransactionSchema,
  insertVendorTransactionSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Bill Creators
  app.get("/api/bill-creators", async (req, res) => {
    try {
      const creators = await storage.getBillCreators();
      // Don't expose PIN in response
      const sanitized = creators.map(({ pin, ...rest }) => rest);
      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bill creators" });
    }
  });

  app.post("/api/bill-creators", async (req, res) => {
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

  app.patch("/api/bill-creators/:id", async (req, res) => {
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

  // Dashboard Metrics
  app.get("/api/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  return httpServer;
}
