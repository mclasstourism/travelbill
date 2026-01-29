import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePin } from "@/lib/pin-context";
import { PinModal } from "@/components/pin-modal";
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
  Lock,
  Printer,
  Eye,
  Mail,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { numberToWords } from "@/lib/number-to-words";
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
  useVendorBalance: z.enum(["none", "credit", "deposit"]).default("none"),
  notes: z.string().optional(),
});

type CreateInvoiceForm = z.infer<typeof createInvoiceFormSchema>;

export default function InvoicesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const { toast } = useToast();
  const { isAuthenticated, session } = usePin();

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
  
  const getPartyEmail = (invoice: Invoice): string | undefined => {
    if (invoice.customerType === "agent") {
      return agents.find(a => a.id === invoice.customerId)?.email;
    }
    return customers.find(c => c.id === invoice.customerId)?.email;
  };
  
  const emailInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, email }: { invoiceId: string; email: string }) => {
      const res = await apiRequest("POST", `/api/invoices/${invoiceId}/email`, { email });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice sent successfully", description: "The invoice has been emailed." });
    },
    onError: () => {
      toast({ title: "Failed to send invoice", variant: "destructive" });
    },
  });

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
    let depositUsed = 0;
    if (watchUseDeposit && selectedParty) {
      depositUsed = Math.min(selectedParty.depositBalance, afterDiscount);
    }
    let afterCustomerDeposit = afterDiscount - depositUsed;
    
    // Vendor balance deduction is based on vendor cost, not invoice total
    const vendorCostAmount = Number(watchVendorCost) || 0;
    let vendorBalanceDeducted = 0;
    if (watchUseVendorBalance && watchUseVendorBalance !== "none" && selectedVendor && vendorCostAmount > 0) {
      const vendorBalance = watchUseVendorBalance === "credit" 
        ? selectedVendor.creditBalance 
        : selectedVendor.depositBalance;
      vendorBalanceDeducted = Math.min(vendorBalance, vendorCostAmount);
    }
    
    const total = afterCustomerDeposit;
    return { subtotal, discountAmount, afterDiscount, depositUsed, vendorBalanceDeducted, vendorCost: vendorCostAmount, total };
  }, [watchItems, watchDiscountPercent, watchUseDeposit, selectedParty, watchUseVendorBalance, selectedVendor, watchVendorCost]);

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
    if (!isAuthenticated) {
      setIsPinModalOpen(true);
    } else {
      setIsCreateOpen(true);
    }
  };

  const onSubmit = (data: CreateInvoiceForm) => {
    if (!isAuthenticated || !session) {
      toast({
        title: "Authentication required",
        description: "Please authenticate with PIN first",
        variant: "destructive",
      });
      return;
    }

    // Calculate values from submitted form data directly
    const subtotal = data.items.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    }, 0);
    const discountAmount = subtotal * ((Number(data.discountPercent) || 0) / 100);
    const afterDiscount = subtotal - discountAmount;
    
    let depositUsed = 0;
    if (data.useCustomerDeposit && selectedParty) {
      depositUsed = Math.min(selectedParty.depositBalance, afterDiscount);
    }
    const total = afterDiscount - depositUsed;

    // Calculate vendor balance deduction based on vendor cost
    const vendorCostAmount = Number(data.vendorCost) || 0;
    let vendorBalanceDeducted = 0;
    if (data.useVendorBalance && data.useVendorBalance !== "none" && selectedVendor && vendorCostAmount > 0) {
      const vendorBalance = data.useVendorBalance === "credit" 
        ? selectedVendor.creditBalance 
        : selectedVendor.depositBalance;
      vendorBalanceDeducted = Math.min(vendorBalance, vendorCostAmount);
    }

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
      useVendorBalance: data.useVendorBalance,
      vendorBalanceDeducted,
      notes: data.notes || "",
      issuedBy: session.billCreatorId,
    };

    createMutation.mutate(invoiceData);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="lg:hidden" data-testid="button-sidebar-toggle" />
          <div>
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-invoices-title">Invoices</h1>
            <p className="text-sm text-muted-foreground">Manage billing and payments</p>
          </div>
        </div>
        <Button onClick={handleCreateClick} className="w-full sm:w-auto" data-testid="button-create-invoice">
          {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 sm:max-w-sm">
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
                          {formatCurrency(invoice.total)}
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
                              onClick={() => {
                                setViewInvoice(invoice);
                                setTimeout(() => window.print(), 100);
                              }}
                              data-testid={`button-print-invoice-${invoice.id}`}
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const email = getPartyEmail(invoice);
                                if (!email) {
                                  toast({ title: "No email address", description: "This customer/agent has no email on file.", variant: "destructive" });
                                  return;
                                }
                                emailInvoiceMutation.mutate({ invoiceId: invoice.id, email });
                              }}
                              disabled={emailInvoiceMutation.isPending}
                              data-testid={`button-email-invoice-${invoice.id}`}
                              title="Email invoice"
                            >
                              {emailInvoiceMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Mail className="w-4 h-4" />
                              )}
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

      <PinModal
        open={isPinModalOpen}
        onOpenChange={setIsPinModalOpen}
        onSuccess={() => setIsCreateOpen(true)}
      />

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
                                  {...field}
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
                                  {...field}
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
                          {...field}
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
                        {...field}
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
                        <span>Customer Deposit Applied</span>
                        <span className="font-mono">-{formatCurrency(calculations.depositUsed)}</span>
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
    </div>
  );
}
