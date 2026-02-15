import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import html2pdf from "html2pdf.js";
import mcLogo from "@assets/image_1769840649122.png";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Plus,
  FileText,
  Search,
  Loader2,
  Trash2,
  Banknote,
  CreditCard,
  Wallet,
  Download,
  Eye,
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { z } from "zod";
import {
  insertInvoiceSchema,
  type Invoice,
  type Customer,
  type Agent,
  type Vendor,
  type InsertInvoice,
  paymentMethods,
} from "@shared/schema";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "paid":
      return "default";
    case "issued":
    case "partial":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

const paymentMethodIcons = {
  cash: Banknote,
  card: CreditCard,
  credit: Wallet,
};

const createInvoiceFormSchema = z.object({
  customerType: z.enum(["customer", "agent"]).default("customer"),
  customerId: z.string().min(1, "Customer/Agent is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  items: z.array(z.object({
    sector: z.string().min(1, "Sector is required"),
    travelDate: z.string().default(""),
    airlinesFlightNo: z.string().default(""),
    pnr: z.string().default(""),
    tktNo: z.string().default(""),
    amount: z.coerce.number().min(0, "Amount must be positive"),
    basicFare: z.coerce.number().min(0).default(0),
    tax: z.coerce.number().min(0).default(0),
  })).min(1, "At least one item is required"),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  vendorCost: z.coerce.number().min(0, "Vendor cost must be positive").default(0),
  paymentMethod: z.enum(paymentMethods),
  useCustomerDeposit: z.boolean().default(false),
  useAgentCredit: z.boolean().default(false),
  useVendorBalance: z.enum(["none", "credit", "deposit"]).default("none"),
  notes: z.string().optional(),
});

type CreateInvoiceForm = z.infer<typeof createInvoiceFormSchema>;

export default function InvoicesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [quickCreateCustomer, setQuickCreateCustomer] = useState(false);
  const [quickCreateVendor, setQuickCreateVendor] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const getPartyName = (invoice: Invoice) => {
    if (invoice.customerType === "agent") {
      return agents.find(a => a.id === invoice.customerId)?.name || "Unknown Agent";
    }
    return customers.find(c => c.id === invoice.customerId)?.name || "Unknown Customer";
  };
  const getVendorName = (id: string) => vendors.find(v => v.id === id)?.name || "Unknown";

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero AED';

    const wholeNum = Math.floor(num);
    const decimal = Math.round((num - wholeNum) * 100);

    const convertChunk = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertChunk(n % 100) : '');
    };

    const parts: string[] = [];
    const million = Math.floor(wholeNum / 1000000);
    const thousand = Math.floor((wholeNum % 1000000) / 1000);
    const remainder = wholeNum % 1000;

    if (million > 0) parts.push(convertChunk(million) + ' Million');
    if (thousand > 0) parts.push(convertChunk(thousand) + ' Thousand');
    if (remainder > 0) parts.push(convertChunk(remainder));

    let result = parts.join(' ') + ' AED';
    if (decimal > 0) result += ' and ' + decimal + ' Fils';
    return result;
  };

  const handleDownloadPdf = (invoice: Invoice) => {
    const partyName = getPartyName(invoice);
    const vendorName = getVendorName(invoice.vendorId);
    const items = invoice.items as any[];
    const grandTotal = invoice.subtotal - invoice.discountAmount;
    
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="max-width: 700px; margin: 0 auto; padding: 30px 36px; font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0;">
          <div style="flex-shrink: 0;">
            <img src="${mcLogo}" alt="Middle Class Tourism" style="height: 65px;" />
          </div>
          <div style="text-align: right;">
            <div style="display: inline-block; background: #1a5632; color: white; font-size: 22px; font-weight: 700; letter-spacing: 3px; padding: 8px 24px; border-radius: 6px; line-height: 1; text-align: center;">INVOICE</div>
          </div>
        </div>
        <div style="height: 3px; background: linear-gradient(to right, #1a5632, #22c55e, #1a5632); margin: 14px 0 20px 0; border-radius: 2px;"></div>

        <!-- Company & Invoice Info Row -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 24px;">
          <div style="font-size: 12px; color: #374151; line-height: 1.9;">
            <p style="margin: 0;"><strong style="color: #64748b; min-width: 60px; display: inline-block;">Address</strong> : Shop 41, Al Dhannah Traditional</p>
            <p style="margin: 0; padding-left: 72px;">Souq, Al Dhannah City, Abu Dhabi - UAE</p>
            <p style="margin: 0;"><strong style="color: #64748b; min-width: 60px; display: inline-block;">Email</strong> : sales@middleclass.ae</p>
            <p style="margin: 0;"><strong style="color: #64748b; min-width: 60px; display: inline-block;">Phone</strong> : 025 640 224, 050 222 1042</p>
            <p style="margin: 0;"><strong style="color: #64748b; min-width: 60px; display: inline-block;">Website</strong> : www.middleclass.ae</p>
          </div>
          <div style="text-align: right; font-size: 13px;">
            <table style="border-collapse: collapse; margin-left: auto;">
              <tr>
                <td style="padding: 4px 12px 4px 0; color: #64748b; font-weight: 600;">Invoice No</td>
                <td style="padding: 4px 0; font-weight: 700;">: ${invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 4px 12px 4px 0; color: #64748b; font-weight: 600;">Date</td>
                <td style="padding: 4px 0; font-weight: 700;">: ${format(new Date(invoice.createdAt), "dd/MM/yyyy")}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Bill To / Vendor -->
        <div style="display: flex; gap: 0; margin-bottom: 24px;">
          <div style="flex: 1; background: #f0fdf4; border-left: 4px solid #1a5632; padding: 14px 16px;">
            <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: 700; color: #1a5632; text-transform: uppercase; letter-spacing: 1px;">${invoice.customerType === 'agent' ? 'BILL TO (Agent)' : 'BILL TO'}</p>
            <p style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b;">${partyName}</p>
          </div>
          <div style="flex: 1; border-left: 1px solid #e2e8f0; padding: 14px 16px;">
            <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">VENDOR / SUPPLIER</p>
            <p style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b;">${vendorName}</p>
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; border: 1px solid #e2e8f0;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 10px 8px; background: #1a5632; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">ITEM</th>
              <th style="text-align: center; padding: 10px 8px; background: #1a5632; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">DATE</th>
              <th style="text-align: center; padding: 10px 8px; background: #1a5632; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">FLIGHT</th>
              <th style="text-align: center; padding: 10px 8px; background: #1a5632; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">PNR</th>
              <th style="text-align: center; padding: 10px 8px; background: #1a5632; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">TKT NO</th>
              <th style="text-align: right; padding: 10px 8px; background: #1a5632; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">SUB TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any, i: number) => `
              <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">Flight Ticket (${item.sector || '-'})</td>
                <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">${item.travelDate || '-'}</td>
                <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">${item.airlinesFlightNo || '-'}</td>
                <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-family: 'Courier New', monospace;">${item.pnr || '-'}</td>
                <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-family: 'Courier New', monospace;">${item.tktNo || '-'}</td>
                <td style="text-align: right; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-family: 'Courier New', monospace; font-weight: 600;">${(item.amount || 0).toLocaleString("en-AE", { minimumFractionDigits: 2 })} <span style="font-size: 10px; color: #64748b;">\u062F.\u0625</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals Section -->
        <div style="display: flex; justify-content: center; margin-top: 10px;">
          <div style="width: 380px;">
            <div style="background: #1a5632; color: white; text-align: center; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 700; letter-spacing: 1px; line-height: 1; margin-bottom: 12px;">Invoice Summary</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 8px 10px; font-weight: 600;">Sub Total:</td>
                <td style="padding: 8px 10px; text-align: right; font-family: 'Courier New', monospace; font-weight: 600;">${invoice.subtotal.toLocaleString("en-AE", { minimumFractionDigits: 2 })} <span style="font-size: 10px; color: #64748b;">\u062F.\u0625</span></td>
              </tr>
              ${invoice.discountAmount > 0 ? `
              <tr>
                <td style="padding: 8px 10px; color: #16a34a; font-weight: 500;">Discount (${invoice.discountPercent}%):</td>
                <td style="padding: 8px 10px; text-align: right; font-family: 'Courier New', monospace; color: #16a34a;">-${invoice.discountAmount.toLocaleString("en-AE", { minimumFractionDigits: 2 })} <span style="font-size: 10px;">\u062F.\u0625</span></td>
              </tr>
              ` : ''}
              ${invoice.depositUsed > 0 ? `
              <tr>
                <td style="padding: 8px 10px; color: #2563eb; font-weight: 500;">Deposit Applied:</td>
                <td style="padding: 8px 10px; text-align: right; font-family: 'Courier New', monospace; color: #2563eb;">-${invoice.depositUsed.toLocaleString("en-AE", { minimumFractionDigits: 2 })} <span style="font-size: 10px;">\u062F.\u0625</span></td>
              </tr>
              ` : ''}
              ${invoice.agentCreditUsed > 0 ? `
              <tr>
                <td style="padding: 8px 10px; color: #7c3aed; font-weight: 500;">Agent Credit Applied:</td>
                <td style="padding: 8px 10px; text-align: right; font-family: 'Courier New', monospace; color: #7c3aed;">-${invoice.agentCreditUsed.toLocaleString("en-AE", { minimumFractionDigits: 2 })} <span style="font-size: 10px;">\u062F.\u0625</span></td>
              </tr>
              ` : ''}
              ${invoice.vendorBalanceDeducted > 0 ? `
              <tr>
                <td style="padding: 8px 10px; color: #ea580c; font-weight: 500;">Vendor ${invoice.useVendorBalance === "credit" ? "Credit" : "Deposit"} Applied:</td>
                <td style="padding: 8px 10px; text-align: right; font-family: 'Courier New', monospace; color: #ea580c;">-${invoice.vendorBalanceDeducted.toLocaleString("en-AE", { minimumFractionDigits: 2 })} <span style="font-size: 10px;">\u062F.\u0625</span></td>
              </tr>
              ` : ''}
              <tr>
                <td colspan="2" style="padding: 0;"><div style="height: 2px; background: #1a5632; margin: 6px 10px;"></div></td>
              </tr>
              <tr>
                <td style="padding: 8px 10px; font-weight: 700; font-size: 15px;">Total:</td>
                <td style="padding: 8px 10px; text-align: right; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 800;">${invoice.total.toLocaleString("en-AE", { minimumFractionDigits: 2 })} <span style="font-size: 11px; color: #64748b;">\u062F.\u0625</span></td>
              </tr>
            </table>
            <p style="text-align: center; font-size: 11px; color: #1a5632; margin: 4px 0 0 0; font-style: italic;">${numberToWords(invoice.total)}</p>
          </div>
        </div>

        <!-- Authorised Sign -->
        <div style="text-align: right; margin-top: 40px;">
          <div style="display: inline-block; text-align: center;">
            <div style="width: 180px; border-bottom: 1px solid #374151; margin-bottom: 6px;"></div>
            <p style="margin: 0; font-size: 12px; color: #64748b; font-style: italic;">Authorised Sign</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px;">
          <div style="background: #1a5632; color: white; text-align: center; padding: 10px 16px; border-radius: 6px; font-size: 15px; font-weight: 700; font-style: italic; letter-spacing: 1px; line-height: 1;">Thank You!</div>
        </div>
      </div>
    `;
    
    const options = {
      margin: 10,
      filename: `${invoice.invoiceNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
    
    html2pdf().set(options).from(container).save();
  };

  const getInvoiceCustomer = (invoice: Invoice) => {
    if (invoice.customerType === "customer") {
      return customers.find(c => c.id === invoice.customerId);
    }
    return undefined;
  };

  const getInvoiceAgent = (invoice: Invoice) => {
    if (invoice.customerType === "agent") {
      return agents.find(a => a.id === invoice.customerId);
    }
    return undefined;
  };

  const getInvoiceVendor = (invoice: Invoice) => {
    return vendors.find(v => v.id === invoice.vendorId);
  };

  const form = useForm<CreateInvoiceForm>({
    resolver: zodResolver(createInvoiceFormSchema),
    defaultValues: {
      customerType: "customer",
      customerId: "",
      vendorId: "",
      items: [{ sector: "", travelDate: "", airlinesFlightNo: "", pnr: "", tktNo: "", amount: 0, basicFare: 0, tax: 0 }],
      discountPercent: 0,
      vendorCost: 0,
      paymentMethod: "cash",
      useCustomerDeposit: false,
      useAgentCredit: false,
      useVendorBalance: "none",
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");
  const watchDiscountPercent = form.watch("discountPercent");
  const watchUseDeposit = form.watch("useCustomerDeposit");
  const watchUseAgentCredit = form.watch("useAgentCredit");
  const watchCustomerType = form.watch("customerType");
  const watchCustomerId = form.watch("customerId");
  const watchVendorId = form.watch("vendorId");
  const watchUseVendorBalance = form.watch("useVendorBalance");
  const watchVendorCost = form.watch("vendorCost");

  const selectedCustomer = watchCustomerType === "customer" 
    ? customers.find((c) => c.id === watchCustomerId)
    : null;
  const selectedAgent = watchCustomerType === "agent"
    ? agents.find((a) => a.id === watchCustomerId)
    : null;
  const selectedParty = selectedCustomer || selectedAgent;
  const selectedVendor = vendors.find((v) => v.id === watchVendorId);

  const calculations = useMemo(() => {
    const subtotal = watchItems.reduce((sum, item) => {
      return sum + (Number(item.amount) || 0);
    }, 0);
    const discountAmount = subtotal * ((Number(watchDiscountPercent) || 0) / 100);
    const afterDiscount = subtotal - discountAmount;
    
    // Customer/Agent deposit deduction
    let depositUsed = 0;
    if (watchUseDeposit && selectedParty) {
      depositUsed = Math.min(selectedParty.depositBalance, afterDiscount);
    }
    let afterCustomerDeposit = afterDiscount - depositUsed;
    
    // Agent credit deduction (separate from deposit)
    let agentCreditUsed = 0;
    if (watchUseAgentCredit && selectedAgent && selectedAgent.creditBalance > 0) {
      agentCreditUsed = Math.min(selectedAgent.creditBalance, afterCustomerDeposit);
    }
    let afterAgentCredit = afterCustomerDeposit - agentCreditUsed;
    
    // Vendor balance deduction is based on Vendor Cost (what you pay the vendor)
    const vendorCostAmount = Number(watchVendorCost) || 0;
    let vendorBalanceDeducted = 0;
    if (watchUseVendorBalance && watchUseVendorBalance !== "none" && selectedVendor && vendorCostAmount > 0) {
      const vendorBalance = watchUseVendorBalance === "credit" 
        ? selectedVendor.creditBalance 
        : selectedVendor.depositBalance;
      vendorBalanceDeducted = Math.min(vendorBalance, vendorCostAmount);
    }
    
    // Vendor balance deduction doesn't reduce customer invoice - it reduces what you owe vendor
    const total = afterAgentCredit;
    return { subtotal, discountAmount, afterDiscount, depositUsed, agentCreditUsed, vendorBalanceDeducted, vendorCost: vendorCostAmount, total };
  }, [watchItems, watchDiscountPercent, watchUseDeposit, watchUseAgentCredit, selectedParty, selectedAgent, watchUseVendorBalance, selectedVendor, watchVendorCost]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertInvoice) => {
      const res = await apiRequest("POST", "/api/invoices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deposit-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Invoice created",
        description: "The invoice has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const quickCreateCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const res = await apiRequest("POST", "/api/customers", { ...data, email: "", company: "", address: "" });
      return res.json();
    },
    onSuccess: (newCustomer: Customer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      form.setValue("customerId", newCustomer.id);
      setQuickCreateCustomer(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      toast({ title: "Customer created", description: `${newCustomer.name} has been added.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const quickCreateAgentMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const res = await apiRequest("POST", "/api/agents", { ...data, email: "", company: "", address: "" });
      return res.json();
    },
    onSuccess: (newAgent: Agent) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      form.setValue("customerId", newAgent.id);
      setQuickCreateCustomer(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      toast({ title: "Agent created", description: `${newAgent.name} has been added.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const quickCreateVendorMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const res = await apiRequest("POST", "/api/vendors", { ...data, email: "", address: "", airlines: [] });
      return res.json();
    },
    onSuccess: (newVendor: Vendor) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      form.setValue("vendorId", newVendor.id);
      setQuickCreateVendor(false);
      setNewVendorName("");
      setNewVendorPhone("");
      toast({ title: "Vendor created", description: `${newVendor.name} has been added.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateClick = () => {
    form.reset({
      customerType: "customer",
      customerId: "",
      vendorId: "",
      items: [{ sector: "", travelDate: "", airlinesFlightNo: "", pnr: "", tktNo: "", amount: 0, basicFare: 0, tax: 0 }],
      discountPercent: 0,
      vendorCost: 0,
      paymentMethod: "cash",
      useCustomerDeposit: false,
      useAgentCredit: false,
      useVendorBalance: "none",
      notes: "",
    });
    setIsCreateOpen(true);
  };

  const onSubmit = (data: CreateInvoiceForm) => {

    const subtotal = data.items.reduce((sum, item) => {
      return sum + (Number(item.amount) || 0);
    }, 0);
    const discountAmount = subtotal * ((Number(data.discountPercent) || 0) / 100);
    const afterDiscount = subtotal - discountAmount;
    
    // Customer/Agent deposit deduction
    let depositUsed = 0;
    if (data.useCustomerDeposit && selectedParty) {
      depositUsed = Math.min(selectedParty.depositBalance, afterDiscount);
    }
    const afterDeposit = afterDiscount - depositUsed;
    
    // Agent credit deduction (separate from deposit)
    let agentCreditUsed = 0;
    if (data.useAgentCredit && selectedAgent && selectedAgent.creditBalance > 0) {
      agentCreditUsed = Math.min(selectedAgent.creditBalance, afterDeposit);
    }
    const afterAgentCredit = afterDeposit - agentCreditUsed;

    // Calculate vendor balance deduction (based on vendor cost, reduces what you owe vendor)
    const vendorCostAmount = Number(data.vendorCost) || 0;
    let vendorBalanceDeducted = 0;
    if (data.useVendorBalance && data.useVendorBalance !== "none" && selectedVendor && vendorCostAmount > 0) {
      const vendorBalance = data.useVendorBalance === "credit" 
        ? selectedVendor.creditBalance 
        : selectedVendor.depositBalance;
      vendorBalanceDeducted = Math.min(vendorBalance, vendorCostAmount);
    }
    // Vendor balance deduction doesn't reduce customer invoice - it reduces what you owe vendor
    const total = afterAgentCredit;

    const invoiceData: InsertInvoice = {
      customerType: data.customerType,
      customerId: data.customerId,
      vendorId: data.vendorId,
      items: data.items,
      subtotal,
      discountPercent: data.discountPercent,
      discountAmount,
      total,
      vendorCost: vendorCostAmount,
      paymentMethod: data.paymentMethod,
      useCustomerDeposit: data.useCustomerDeposit,
      depositUsed,
      useAgentCredit: data.useAgentCredit,
      agentCreditUsed,
      useVendorBalance: data.useVendorBalance,
      vendorBalanceDeducted,
      notes: data.notes || "",
      issuedBy: user?.id || "",
    };

    createMutation.mutate(invoiceData);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-invoices-title">Invoices</h1>
            <p className="text-sm text-muted-foreground">Manage billing and payments</p>
          </div>
        </div>
        <Button onClick={handleCreateClick} data-testid="button-create-invoice">
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-invoices"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No invoices found</p>
              <p className="text-sm">Create your first invoice to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const PaymentIcon = paymentMethodIcons[invoice.paymentMethod as keyof typeof paymentMethodIcons];
                    return (
                      <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                        <TableCell className="font-medium font-mono">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PaymentIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="capitalize text-sm">{invoice.paymentMethod}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(invoice.subtotal - invoice.discountAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setViewInvoice(invoice)}
                              data-testid={`button-view-invoice-${invoice.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDownloadPdf(invoice)}
                              data-testid={`button-download-invoice-${invoice.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>
              Fill in the invoice details. Select customer, vendor, and add line items.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="customerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Type *</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("customerId", "");
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-customer-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="customer">Individual Customer</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{watchCustomerType === "agent" ? "Agent" : "Customer"} *</FormLabel>
                      <Select onValueChange={(val) => {
                        if (val === "__create_new__") {
                          setQuickCreateCustomer(true);
                          return;
                        }
                        field.onChange(val);
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-invoice-customer">
                            <SelectValue placeholder={`Select ${watchCustomerType === "agent" ? "agent" : "customer"}`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__create_new__">
                            <span className="flex items-center gap-1 text-[hsl(var(--primary))] font-medium">
                              <Plus className="w-3 h-3" /> Create New
                            </span>
                          </SelectItem>
                          {watchCustomerType === "agent" 
                            ? agents.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  {agent.name} {agent.company ? `(${agent.company})` : ""}
                                </SelectItem>
                              ))
                            : customers.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.name}
                                </SelectItem>
                              ))
                          }
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor/Supplier *</FormLabel>
                      <Select onValueChange={(val) => {
                        if (val === "__create_new__") {
                          setQuickCreateVendor(true);
                          return;
                        }
                        field.onChange(val);
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-invoice-vendor">
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__create_new__">
                            <span className="flex items-center gap-1 text-[hsl(var(--primary))] font-medium">
                              <Plus className="w-3 h-3" /> Create New
                            </span>
                          </SelectItem>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {quickCreateCustomer && (
                <div className="p-4 rounded-md border border-dashed border-[hsl(var(--primary))] bg-muted/30 space-y-3">
                  <h4 className="font-medium text-sm">Quick Create {watchCustomerType === "agent" ? "Agent" : "Customer"}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Name *</Label>
                      <Input
                        placeholder="Enter name"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        data-testid="input-quick-customer-name"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Phone *</Label>
                      <Input
                        placeholder="Enter phone"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        data-testid="input-quick-customer-phone"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setQuickCreateCustomer(false); setNewCustomerName(""); setNewCustomerPhone(""); }} data-testid="button-cancel-quick-customer">
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newCustomerName || !newCustomerPhone || quickCreateCustomerMutation.isPending || quickCreateAgentMutation.isPending}
                      onClick={() => {
                        if (watchCustomerType === "agent") {
                          quickCreateAgentMutation.mutate({ name: newCustomerName, phone: newCustomerPhone });
                        } else {
                          quickCreateCustomerMutation.mutate({ name: newCustomerName, phone: newCustomerPhone });
                        }
                      }}
                      data-testid="button-save-quick-customer"
                    >
                      {(quickCreateCustomerMutation.isPending || quickCreateAgentMutation.isPending) && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      Create
                    </Button>
                  </div>
                </div>
              )}

              {quickCreateVendor && (
                <div className="p-4 rounded-md border border-dashed border-[hsl(var(--primary))] bg-muted/30 space-y-3">
                  <h4 className="font-medium text-sm">Quick Create Vendor</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Name *</Label>
                      <Input
                        placeholder="Enter vendor name"
                        value={newVendorName}
                        onChange={(e) => setNewVendorName(e.target.value)}
                        data-testid="input-quick-vendor-name"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Phone *</Label>
                      <Input
                        placeholder="Enter phone"
                        value={newVendorPhone}
                        onChange={(e) => setNewVendorPhone(e.target.value)}
                        data-testid="input-quick-vendor-phone"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setQuickCreateVendor(false); setNewVendorName(""); setNewVendorPhone(""); }} data-testid="button-cancel-quick-vendor">
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newVendorName || !newVendorPhone || quickCreateVendorMutation.isPending}
                      onClick={() => quickCreateVendorMutation.mutate({ name: newVendorName, phone: newVendorPhone })}
                      data-testid="button-save-quick-vendor"
                    >
                      {quickCreateVendorMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      Create
                    </Button>
                  </div>
                </div>
              )}

              {selectedParty && (
                <div className="p-4 rounded-md bg-muted/50 space-y-2">
                  <h4 className="font-medium text-sm">{watchCustomerType === "agent" ? "Agent" : "Customer"} Details</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-muted-foreground">Name:</div>
                    <div data-testid="text-party-name">{selectedParty.name}</div>
                    <div className="text-muted-foreground">Phone:</div>
                    <div data-testid="text-party-phone">{selectedParty.phone || "-"}</div>
                    <div className="text-muted-foreground">Company:</div>
                    <div data-testid="text-party-company">{selectedParty.company || "-"}</div>
                    <div className="text-muted-foreground">Address:</div>
                    <div data-testid="text-party-address">{selectedParty.address || "-"}</div>
                    <div className="text-muted-foreground">Email:</div>
                    <div data-testid="text-party-email">{selectedParty.email || "-"}</div>
                    <div className="text-muted-foreground">Deposit Balance:</div>
                    <div className="font-semibold text-green-600 dark:text-green-400" data-testid="text-party-deposit">
                      {formatCurrency(selectedParty.depositBalance)}
                    </div>
                  </div>
                </div>
              )}

              {selectedVendor && (
                <div className="p-4 rounded-md bg-muted/50 space-y-2">
                  <h4 className="font-medium text-sm">Vendor Details</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-muted-foreground">Name:</div>
                    <div data-testid="text-vendor-name">{selectedVendor.name}</div>
                    <div className="text-muted-foreground">Phone:</div>
                    <div data-testid="text-vendor-phone">{selectedVendor.phone || "-"}</div>
                    <div className="text-muted-foreground">Credit Balance:</div>
                    <div className="font-semibold text-green-700 dark:text-green-400" data-testid="text-vendor-credit">
                      {formatCurrency(selectedVendor.creditBalance)}
                    </div>
                    <div className="text-muted-foreground">Deposit Balance:</div>
                    <div className="font-semibold text-green-600 dark:text-green-400" data-testid="text-vendor-deposit">
                      {formatCurrency(selectedVendor.depositBalance)}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Line Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ sector: "", travelDate: "", airlinesFlightNo: "", pnr: "", tktNo: "", amount: 0, basicFare: 0, tax: 0 })}
                    data-testid="button-add-item"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-3 rounded-md bg-muted/50 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => fields.length > 1 && remove(index)}
                          disabled={fields.length <= 1}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.sector`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Sector *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. DXB-LHR" value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} data-testid={`input-item-sector-${index}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.travelDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Travel Date</FormLabel>
                              <FormControl>
                                <Input type="date" value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} data-testid={`input-item-travel-date-${index}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.airlinesFlightNo`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Airlines/Flight No</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. EK202" value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} data-testid={`input-item-flight-${index}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.pnr`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">PNR</FormLabel>
                              <FormControl>
                                <Input placeholder="PNR" value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} data-testid={`input-item-pnr-${index}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.tktNo`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">TKT No</FormLabel>
                              <FormControl>
                                <Input placeholder="Ticket No" value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} data-testid={`input-item-tkt-${index}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.basicFare`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Basic Fare</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="0.00"
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                  data-testid={`input-item-basic-fare-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.tax`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Tax</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="0.00"
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                  data-testid={`input-item-tax-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Amount (AED) *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="0.00"
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                  data-testid={`input-item-amount-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-method">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">
                            <div className="flex items-center gap-2">
                              <Banknote className="w-4 h-4" />
                              Cash
                            </div>
                          </SelectItem>
                          <SelectItem value="card">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              Card
                            </div>
                          </SelectItem>
                          <SelectItem value="credit">
                            <div className="flex items-center gap-2">
                              <Wallet className="w-4 h-4" />
                              Credit
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendorCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Cost (Actual Cost) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Enter actual cost from vendor"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="input-vendor-cost"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {selectedCustomer && selectedCustomer.depositBalance > 0 && (
                <FormField
                  control={form.control}
                  name="useCustomerDeposit"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Use Customer Deposit</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Available: {formatCurrency(selectedCustomer.depositBalance)}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-use-deposit"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {selectedAgent && selectedAgent.depositBalance > 0 && (
                <FormField
                  control={form.control}
                  name="useCustomerDeposit"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Use Agent Deposit</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Available: {formatCurrency(selectedAgent.depositBalance)}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-use-agent-deposit"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {selectedAgent && selectedAgent.creditBalance > 0 && (
                <FormField
                  control={form.control}
                  name="useAgentCredit"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Use Agent Credit</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Available: {formatCurrency(selectedAgent.creditBalance)}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-use-agent-credit"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {selectedVendor && (selectedVendor.creditBalance > 0 || selectedVendor.depositBalance > 0) && (
                <FormField
                  control={form.control}
                  name="useVendorBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deduct from Vendor Balance</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vendor-balance">
                            <SelectValue placeholder="Select balance type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Deduction</SelectItem>
                          {selectedVendor.creditBalance > 0 && (
                            <SelectItem value="credit">
                              Credit Balance ({formatCurrency(selectedVendor.creditBalance)})
                            </SelectItem>
                          )}
                          {selectedVendor.depositBalance > 0 && (
                            <SelectItem value="deposit">
                              Deposit Balance ({formatCurrency(selectedVendor.depositBalance)})
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes..."
                        className="resize-none"
                        {...field}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span className="font-mono">{formatCurrency(calculations.subtotal)}</span>
                    </div>
                    {calculations.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                        <span>Discount ({watchDiscountPercent}%)</span>
                        <span className="font-mono">-{formatCurrency(calculations.discountAmount)}</span>
                      </div>
                    )}
                    {calculations.depositUsed > 0 && (
                      <div className="flex justify-between text-sm text-green-700 dark:text-green-400">
                        <span>{watchCustomerType === "agent" ? "Agent" : "Customer"} Deposit Applied</span>
                        <span className="font-mono">-{formatCurrency(calculations.depositUsed)}</span>
                      </div>
                    )}
                    {calculations.agentCreditUsed > 0 && (
                      <div className="flex justify-between text-sm text-purple-600 dark:text-purple-400">
                        <span>Agent Credit Applied</span>
                        <span className="font-mono">-{formatCurrency(calculations.agentCreditUsed)}</span>
                      </div>
                    )}
                    {calculations.vendorCost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Vendor Cost</span>
                        <span className="font-mono">{formatCurrency(calculations.vendorCost)}</span>
                      </div>
                    )}
                    {calculations.vendorBalanceDeducted > 0 && (
                      <div className="flex justify-between text-sm text-purple-600 dark:text-purple-400">
                        <span>Vendor Balance Deducted</span>
                        <span className="font-mono">-{formatCurrency(calculations.vendorBalanceDeducted)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold border-t pt-2">
                      <span>Total Due (Customer)</span>
                      <span className="font-mono">{formatCurrency(calculations.total)}</span>
                    </div>
                    {calculations.vendorCost > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Profit Margin</span>
                        <span className="font-mono">{formatCurrency(calculations.total - calculations.vendorCost)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
                  data-testid="button-cancel-invoice"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-save-invoice"
                >
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create Invoice
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={viewInvoice !== null} onOpenChange={(open) => !open && setViewInvoice(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Invoice {viewInvoice?.invoiceNumber}</DialogTitle>
            <DialogDescription>View invoice details</DialogDescription>
          </DialogHeader>

          {viewInvoice && (
            <div className="p-8">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex-shrink-0">
                  <img src={mcLogo} alt="Middle Class Tourism" className="h-14" />
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold tracking-widest text-[#1a5632]">INVOICE</h2>
                  <p className="text-sm text-muted-foreground mt-1">{viewInvoice.invoiceNumber}</p>
                </div>
              </div>
              <div className="h-[3px] bg-gradient-to-r from-[#1a5632] via-green-500 to-[#1a5632] rounded-full mt-3 mb-5" />

              {/* Company Info & Invoice Meta */}
              <div className="flex justify-between mb-6 gap-4">
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <p>Phone: 025 640 224 | 050 222 1042</p>
                  <p>www.middleclass.ae | sales@middleclass.ae</p>
                  <p>Shop 41, Al Dhannah Traditional Souq, Al Dhannah City, Abu Dhabi {"\u2013"} UAE</p>
                </div>
                <div className="text-right text-sm space-y-1">
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-muted-foreground text-xs font-medium">Date:</span>
                    <span className="font-semibold text-xs">{format(new Date(viewInvoice.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-muted-foreground text-xs font-medium">Status:</span>
                    <Badge variant={getStatusBadgeVariant(viewInvoice.status)} className="capitalize text-[10px]">
                      {viewInvoice.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-muted-foreground text-xs font-medium">Payment:</span>
                    <span className="font-semibold text-xs capitalize">{viewInvoice.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Bill To / Vendor */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-950/30 py-3 px-4">
                  <p className="text-[10px] font-bold text-[#1a5632] uppercase tracking-wider mb-1">
                    {viewInvoice.customerType === "agent" ? "Bill To (Agent)" : "Bill To"}
                  </p>
                  <p className="font-semibold text-sm">{getPartyName(viewInvoice)}</p>
                </div>
                <div className="bg-muted/50 py-3 px-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Vendor / Supplier</p>
                  <p className="font-semibold text-sm">{getVendorName(viewInvoice.vendorId)}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-md overflow-hidden border mb-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#1a5632] [&:hover]:bg-[#1a5632]" data-testid="invoice-table-header">
                      <TableHead className="text-white font-semibold text-[11px] uppercase tracking-wide w-8">#</TableHead>
                      <TableHead className="text-white font-semibold text-[11px] uppercase tracking-wide">Sector</TableHead>
                      <TableHead className="text-white font-semibold text-[11px] uppercase tracking-wide">Date</TableHead>
                      <TableHead className="text-white font-semibold text-[11px] uppercase tracking-wide">Flight</TableHead>
                      <TableHead className="text-white font-semibold text-[11px] uppercase tracking-wide">PNR</TableHead>
                      <TableHead className="text-white font-semibold text-[11px] uppercase tracking-wide">TKT No</TableHead>
                      <TableHead className="text-white font-semibold text-[11px] uppercase tracking-wide text-right">Basic Fare</TableHead>
                      <TableHead className="text-white font-semibold text-[11px] uppercase tracking-wide text-right">Tax</TableHead>
                      <TableHead className="text-white font-semibold text-[11px] uppercase tracking-wide text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewInvoice.items.map((item: any, idx: number) => (
                      <TableRow key={idx} className={idx % 2 === 0 ? "" : "bg-muted/30"}>
                        <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-sm">{item.sector}</TableCell>
                        <TableCell className="text-sm">{item.travelDate || "-"}</TableCell>
                        <TableCell className="text-sm">{item.airlinesFlightNo || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{item.pnr || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{item.tktNo || "-"}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(item.basicFare || 0)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(item.tax || 0)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-6">
                <div className="w-80">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-mono font-medium">{formatCurrency(viewInvoice.subtotal)}</span>
                    </div>
                    {viewInvoice.discountAmount > 0 && (
                      <div className="flex justify-between py-1 text-green-600 dark:text-green-400">
                        <span>Discount ({viewInvoice.discountPercent}%)</span>
                        <span className="font-mono">-{formatCurrency(viewInvoice.discountAmount)}</span>
                      </div>
                    )}
                    {viewInvoice.depositUsed > 0 && (
                      <div className="flex justify-between py-1 text-green-700 dark:text-green-400">
                        <span>Deposit Applied</span>
                        <span className="font-mono">-{formatCurrency(viewInvoice.depositUsed)}</span>
                      </div>
                    )}
                    {viewInvoice.agentCreditUsed > 0 && (
                      <div className="flex justify-between py-1 text-purple-600 dark:text-purple-400">
                        <span>Agent Credit Applied</span>
                        <span className="font-mono">-{formatCurrency(viewInvoice.agentCreditUsed)}</span>
                      </div>
                    )}
                    {viewInvoice.vendorBalanceDeducted > 0 && (
                      <div className="flex justify-between py-1 text-orange-600 dark:text-orange-400">
                        <span>Vendor {viewInvoice.useVendorBalance === "credit" ? "Credit" : "Deposit"} Applied</span>
                        <span className="font-mono">-{formatCurrency(viewInvoice.vendorBalanceDeducted)}</span>
                      </div>
                    )}
                  </div>
                  <div className="h-[2px] bg-gradient-to-r from-[#1a5632] to-green-400 rounded my-2" />
                  <div className="flex justify-between py-1 text-xs">
                    <span className="text-muted-foreground font-medium">Grand Total</span>
                    <span className="font-mono font-bold">{formatCurrency(viewInvoice.subtotal - viewInvoice.discountAmount)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-[#1a5632] font-bold text-base">Total Due</span>
                    <span className="font-mono font-extrabold text-lg text-[#1a5632]">{formatCurrency(viewInvoice.total)}</span>
                  </div>
                  <p className="text-right text-[11px] text-muted-foreground italic">{numberToWords(viewInvoice.total)}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t-2 pt-4 flex justify-between items-center">
                <div className="text-center flex-1">
                  <p className="text-sm text-[#1a5632] font-semibold">Thank you for choosing Middle Class Tourism</p>
                  <p className="text-[10px] text-muted-foreground mt-1">This is a computer-generated invoice.</p>
                </div>
              </div>

              <div className="flex justify-end mt-4 pt-3 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(viewInvoice)} data-testid="button-download-invoice-view">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setViewInvoice(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
