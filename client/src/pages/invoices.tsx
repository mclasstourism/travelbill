import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import html2pdf from "html2pdf.js";
import mcLogo from "@assets/image_1769840649122.png";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.coerce.number().min(0, "Price must be positive"),
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

  const numberToArabicWords = (num: number): string => {
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    const thousands = ['', 'ألف', 'ألفان', 'ثلاثة آلاف', 'أربعة آلاف', 'خمسة آلاف', 'ستة آلاف', 'سبعة آلاف', 'ثمانية آلاف', 'تسعة آلاف'];

    if (num === 0) return 'صفر';

    const wholeNum = Math.floor(num);
    const decimal = Math.round((num - wholeNum) * 100);
    
    const parts: string[] = [];
    
    const thousandsPart = Math.floor(wholeNum / 1000);
    const hundredsPart = Math.floor((wholeNum % 1000) / 100);
    const tensPart = wholeNum % 100;

    if (thousandsPart > 0 && thousandsPart < 10) parts.push(thousands[thousandsPart]);
    else if (thousandsPart >= 10) parts.push(`${thousandsPart} ألف`);
    
    if (hundredsPart > 0) parts.push(hundreds[hundredsPart]);
    
    if (tensPart >= 10 && tensPart < 20) {
      parts.push(teens[tensPart - 10]);
    } else if (tensPart >= 20) {
      const onesDigit = tensPart % 10;
      if (onesDigit > 0) parts.push(`${ones[onesDigit]} و ${tens[Math.floor(tensPart / 10)]}`);
      else parts.push(tens[Math.floor(tensPart / 10)]);
    } else if (tensPart > 0) {
      parts.push(ones[tensPart]);
    }

    let result = parts.join(' و ') + ' درهم إماراتي';
    if (decimal > 0) result += ` و ${decimal} فلس`;
    return result;
  };

  const handleDownloadPdf = (invoice: Invoice) => {
    const partyName = getPartyName(invoice);
    const vendorName = getVendorName(invoice.vendorId);
    const items = invoice.items as { description: string; quantity: number; unitPrice: number }[];
    
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="max-width: 700px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; border-bottom: 2px solid #1a5632; padding-bottom: 16px; margin-bottom: 20px;">
          <img src="${mcLogo}" alt="Middle Class Tourism" style="height: 70px; margin: 0 auto 12px auto; display: block;" />
          <div style="font-size: 0.75rem; color: #6b7280; line-height: 1.8;">
            <p style="margin: 0;">Phone: 025 640 224 | 050 222 1042</p>
            <p style="margin: 0;">www.middleclass.ae | sales@middleclass.ae</p>
            <p style="margin: 0;">Address: Shop 41, Al Dhannah Traditional Souq, Al Dhannah City, Abu Dhabi \u2013 UAE</p>
          </div>
        </div>
        <div style="text-align: center; margin-bottom: 16px;">
          <span style="font-size: 0.75rem; color: #6b7280;">INVOICE NUMBER</span>
          <p style="font-family: monospace; font-size: 1.25rem; font-weight: bold; margin: 4px 0 0 0;">${invoice.invoiceNumber}</p>
          <p style="font-size: 0.75rem; color: #6b7280; margin-top: 4px;">Date: ${format(new Date(invoice.createdAt), "MMM d, yyyy")}</p>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div style="background-color: #f9fafb; padding: 12px; border-radius: 8px;">
            <span style="font-size: 0.75rem; color: #6b7280;">${invoice.customerType === 'agent' ? 'AGENT' : 'CUSTOMER'}</span>
            <p style="font-weight: 600; margin: 4px 0 0 0;">${partyName}</p>
          </div>
          <div style="background-color: #f9fafb; padding: 12px; border-radius: 8px;">
            <span style="font-size: 0.75rem; color: #6b7280;">VENDOR</span>
            <p style="font-weight: 600; margin: 4px 0 0 0;">${vendorName}</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="text-align: left; padding: 8px; border: 1px solid #e5e7eb; font-size: 0.75rem; color: #6b7280;">Description</th>
              <th style="text-align: center; padding: 8px; border: 1px solid #e5e7eb; font-size: 0.75rem; color: #6b7280;">Qty</th>
              <th style="text-align: right; padding: 8px; border: 1px solid #e5e7eb; font-size: 0.75rem; color: #6b7280;">Price</th>
              <th style="text-align: right; padding: 8px; border: 1px solid #e5e7eb; font-size: 0.75rem; color: #6b7280;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.description}</td>
                <td style="text-align: center; padding: 8px; border: 1px solid #e5e7eb;">${item.quantity}</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">AED ${item.unitPrice.toLocaleString("en-AE", { minimumFractionDigits: 2 })}</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">AED ${(item.quantity * item.unitPrice).toLocaleString("en-AE", { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Subtotal</span>
            <span style="font-family: monospace;">AED ${invoice.subtotal.toLocaleString("en-AE", { minimumFractionDigits: 2 })}</span>
          </div>
          ${invoice.discountAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #16a34a;">
            <span>Discount (${invoice.discountPercent}%)</span>
            <span style="font-family: monospace;">-AED ${invoice.discountAmount.toLocaleString("en-AE", { minimumFractionDigits: 2 })}</span>
          </div>
          ` : ''}
          ${invoice.depositUsed > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #2563eb;">
            <span>Deposit Used</span>
            <span style="font-family: monospace;">-AED ${invoice.depositUsed.toLocaleString("en-AE", { minimumFractionDigits: 2 })}</span>
          </div>
          ` : ''}
          ${invoice.agentCreditUsed > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #9333ea;">
            <span>Agent Credit Used</span>
            <span style="font-family: monospace;">-AED ${invoice.agentCreditUsed.toLocaleString("en-AE", { minimumFractionDigits: 2 })}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.25rem; border-top: 2px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
            <span>Total Due</span>
            <span style="font-family: monospace; color: #1a5632;">AED ${invoice.total.toLocaleString("en-AE", { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="text-align: right; font-size: 0.75rem; color: #6b7280; margin-top: 4px; direction: rtl; font-family: 'Arial', sans-serif;">
            ${numberToArabicWords(invoice.total)}
          </div>
        </div>
        <div style="margin-top: 16px; padding: 12px; background-color: #f9fafb; border-radius: 8px; font-size: 0.75rem; color: #6b7280;">
          <p style="margin: 0;">Payment Method: ${invoice.paymentMethod.charAt(0).toUpperCase() + invoice.paymentMethod.slice(1)}</p>
          <p style="margin: 4px 0 0 0;">Status: ${invoice.status}</p>
        </div>
        <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 0.8rem; color: #1a5632; font-weight: 500;">
          Thank you for choosing Middle Class Tourism
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
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
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
      return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
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

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateClick = () => {
    setIsCreateOpen(true);
  };

  const onSubmit = (data: CreateInvoiceForm) => {

    // Calculate values from submitted form data directly
    const subtotal = data.items.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
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
          <SidebarTrigger data-testid="button-sidebar-toggle" />
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
                      <FormLabel>Party Type *</FormLabel>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-invoice-customer">
                            <SelectValue placeholder={`Select ${watchCustomerType === "agent" ? "agent" : "customer"}`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-invoice-vendor">
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                    <div className="font-semibold text-blue-600 dark:text-blue-400" data-testid="text-vendor-credit">
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
                    onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
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
                      className="grid grid-cols-12 gap-2 items-start p-3 rounded-md bg-muted/50"
                    >
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  placeholder="Description"
                                  {...field}
                                  data-testid={`input-item-description-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="Qty"
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                  data-testid={`input-item-quantity-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="Price"
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                  data-testid={`input-item-price-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
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
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discountPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="input-discount-percent"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>

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
                    <FormLabel>Notes</FormLabel>
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
                      <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
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
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice {viewInvoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              View invoice details
            </DialogDescription>
          </DialogHeader>

          {viewInvoice && (
            <div className="space-y-6">
              <div className="text-center border-b-2 border-[#1a5632] pb-4">
                <img src={mcLogo} alt="Middle Class Tourism" className="h-16 mx-auto mb-3" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <p>Phone: 025 640 224 | 050 222 1042</p>
                  <p>www.middleclass.ae | sales@middleclass.ae</p>
                  <p>Address: Shop 41, Al Dhannah Traditional Souq, Al Dhannah City, Abu Dhabi {"\u2013"} UAE</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-1">
                      {viewInvoice.customerType === "agent" ? "Agent" : "Customer"}
                    </h3>
                    <p className="font-medium">{getPartyName(viewInvoice)}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-1">Vendor</h3>
                    <p className="font-medium">{getVendorName(viewInvoice.vendorId)}</p>
                  </div>
                </div>
                <div className="space-y-4 text-right">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-1">Date</h3>
                    <p className="font-medium">{format(new Date(viewInvoice.createdAt), "PPP")}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-1">Status</h3>
                    <Badge variant={getStatusBadgeVariant(viewInvoice.status)} className="capitalize">
                      {viewInvoice.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewInvoice.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-mono font-medium">{formatCurrency(viewInvoice.subtotal)}</span>
                  </div>
                  {viewInvoice.discountAmount > 0 && (
                    <div className="flex justify-between py-1 border-b text-green-600 dark:text-green-400">
                      <span>Discount ({viewInvoice.discountPercent}%):</span>
                      <span className="font-mono">-{formatCurrency(viewInvoice.discountAmount)}</span>
                    </div>
                  )}
                  {viewInvoice.depositUsed > 0 && (
                    <div className="flex justify-between py-1 border-b text-blue-600 dark:text-blue-400">
                      <span>Deposit Applied:</span>
                      <span className="font-mono">-{formatCurrency(viewInvoice.depositUsed)}</span>
                    </div>
                  )}
                  {viewInvoice.agentCreditUsed > 0 && (
                    <div className="flex justify-between py-1 border-b text-purple-600 dark:text-purple-400">
                      <span>Agent Credit Applied:</span>
                      <span className="font-mono">-{formatCurrency(viewInvoice.agentCreditUsed)}</span>
                    </div>
                  )}
                  {viewInvoice.vendorBalanceDeducted > 0 && (
                    <div className="flex justify-between py-1 border-b text-orange-600 dark:text-orange-400">
                      <span>Vendor {viewInvoice.useVendorBalance === "credit" ? "Credit" : "Deposit"} Applied:</span>
                      <span className="font-mono">-{formatCurrency(viewInvoice.vendorBalanceDeducted)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b-2 text-lg font-bold">
                    <span>Total Due:</span>
                    <span className="font-mono">{formatCurrency(viewInvoice.total)}</span>
                  </div>
                  <div className="text-right text-xs text-muted-foreground mt-1" style={{ direction: "rtl" }}>
                    {numberToArabicWords(viewInvoice.total)}
                  </div>
                  <div className="flex justify-between py-2 bg-muted/50 px-2 rounded text-lg font-bold">
                    <span>Grand Total:</span>
                    <span className="font-mono">{formatCurrency(viewInvoice.subtotal - viewInvoice.discountAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  <span className="capitalize">Payment: {viewInvoice.paymentMethod}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setViewInvoice(null)}>
                    Close
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-4 border-t text-sm text-[#1a5632] font-medium">
                Thank you for choosing Middle Class Tourism
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
