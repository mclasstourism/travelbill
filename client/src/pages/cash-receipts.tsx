import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Receipt, Search, Loader2, Eye, Printer, Calendar, Download } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";
import { z } from "zod";
import type { Customer, Agent, Vendor, CashReceipt } from "@shared/schema";
import { SidebarTrigger } from "@/components/ui/sidebar";

type DateRange = "all" | "today" | "this_month" | "this_year" | "custom";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

const createReceiptSchema = z.object({
  partyType: z.enum(["customer", "agent", "vendor"]),
  partyId: z.string().min(1, "Party is required"),
  sourceType: z.enum(["flight", "other"]),
  pnr: z.string().optional().or(z.literal("")),
  serviceName: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  paymentMethod: z.enum(["cash", "card", "cheque", "bank_transfer"]),
  description: z.string().optional().or(z.literal("")),
  referenceNumber: z.string().optional().or(z.literal("")),
});

type CreateReceiptForm = z.infer<typeof createReceiptSchema>;

export default function CashReceiptsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<CashReceipt | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: receipts = [], isLoading: isLoadingReceipts } = useQuery<CashReceipt[]>({
    queryKey: ["/api/cash-receipts"],
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

  const form = useForm<CreateReceiptForm>({
    resolver: zodResolver(createReceiptSchema),
    defaultValues: {
      partyType: "customer",
      partyId: "",
      sourceType: "flight",
      pnr: "",
      serviceName: "",
      amount: 0,
      paymentMethod: "cash",
      description: "",
      referenceNumber: "",
    },
  });

  const selectedPartyType = form.watch("partyType");
  const selectedSourceType = form.watch("sourceType");

  const partyOptions = useMemo(() => {
    switch (selectedPartyType) {
      case "customer":
        return customers.map(c => ({ id: c.id, name: c.name }));
      case "agent":
        return agents.map(a => ({ id: a.id, name: a.name }));
      case "vendor":
        return vendors.map(v => ({ id: v.id, name: v.name }));
      default:
        return [];
    }
  }, [selectedPartyType, customers, agents, vendors]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateReceiptForm) => {
      const res = await apiRequest("POST", "/api/cash-receipts", {
        ...data,
        issuedBy: user?.id || "",
      });
      return res.json();
    },
    onSuccess: (receipt) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-receipts"] });
      toast({ title: "Receipt Created", description: `Receipt ${receipt.receiptNumber} has been created.` });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create receipt.", variant: "destructive" });
    },
  });

  const onSubmit = (data: CreateReceiptForm) => {
    createMutation.mutate(data);
  };

  const getPartyName = (receipt: CashReceipt) => {
    switch (receipt.partyType) {
      case "customer":
        return customers.find(c => c.id === receipt.partyId)?.name || "Unknown";
      case "agent":
        return agents.find(a => a.id === receipt.partyId)?.name || "Unknown";
      case "vendor":
        return vendors.find(v => v.id === receipt.partyId)?.name || "Unknown";
      default:
        return "Unknown";
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Cash",
      card: "Card",
      cheque: "Cheque",
      bank_transfer: "Bank Transfer",
    };
    return labels[method] || method;
  };

  const filteredReceipts = useMemo(() => {
    let filtered = receipts;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.receiptNumber.toLowerCase().includes(q) ||
        getPartyName(r).toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q)
      );
    }

    if (dateRange !== "all") {
      const now = new Date();
      filtered = filtered.filter(r => {
        const date = parseISO(r.createdAt);
        switch (dateRange) {
          case "today":
            return isWithinInterval(date, { start: startOfDay(now), end: endOfDay(now) });
          case "this_month":
            return isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) });
          case "this_year":
            return isWithinInterval(date, { start: startOfYear(now), end: endOfYear(now) });
          case "custom":
            if (customStartDate && customEndDate) {
              return isWithinInterval(date, {
                start: startOfDay(parseISO(customStartDate)),
                end: endOfDay(parseISO(customEndDate)),
              });
            }
            return true;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [receipts, searchQuery, dateRange, customStartDate, customEndDate, customers, agents, vendors]);

  const totalAmount = useMemo(() => {
    return filteredReceipts.reduce((sum, r) => sum + r.amount, 0);
  }, [filteredReceipts]);

  const getReceiptHtml = (receipt: CashReceipt) => {
    return `
      <div class="receipt-container">
        <div class="receipt-header">
          <h1>MCT - Tourism Organizers</h1>
          <h2>CASH RECEIPT</h2>
          <div class="receipt-number">${receipt.receiptNumber}</div>
        </div>
        <div class="receipt-body">
          <div class="receipt-row">
            <span class="label">Date</span>
            <span class="value">${format(parseISO(receipt.createdAt), "dd MMM yyyy, hh:mm a")}</span>
          </div>
          <div class="receipt-row">
            <span class="label">Received From (${receipt.partyType})</span>
            <span class="value">${getPartyName(receipt)}</span>
          </div>
          <div class="receipt-row">
            <span class="label">Source</span>
            <span class="value">${receipt.sourceType === "flight" ? "Flight Details" : "Other Service"}</span>
          </div>
          ${receipt.sourceType === "flight" && receipt.pnr ? `
            <div class="receipt-row">
              <span class="label">PNR</span>
              <span class="value">${receipt.pnr}</span>
            </div>
          ` : ""}
          ${receipt.sourceType === "other" && receipt.serviceName ? `
            <div class="receipt-row">
              <span class="label">Service</span>
              <span class="value">${receipt.serviceName}</span>
            </div>
          ` : ""}
          <div class="receipt-row">
            <span class="label">Payment Method</span>
            <span class="value">${getPaymentMethodLabel(receipt.paymentMethod)}</span>
          </div>
          ${receipt.description ? `
            <div class="receipt-row">
              <span class="label">Note</span>
              <span class="value">${receipt.description}</span>
            </div>
          ` : ""}
          ${receipt.referenceNumber ? `
            <div class="receipt-row">
              <span class="label">Reference</span>
              <span class="value">${receipt.referenceNumber}</span>
            </div>
          ` : ""}
          <div class="receipt-row amount-row">
            <span class="label">Amount Received</span>
            <span class="value">${formatCurrency(receipt.amount)}</span>
          </div>
        </div>
        <div class="stamp-line"></div>
        <div class="stamp-label">Authorized Signature / Stamp</div>
        <div class="receipt-footer">
          <p>This is a computer-generated receipt.</p>
          <p>Thank you for your payment.</p>
        </div>
      </div>
    `;
  };

  const receiptStyles = `
    @page { size: A5; margin: 10mm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
    .receipt-container { max-width: 400px; margin: 0 auto; }
    .receipt-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1a5632; padding-bottom: 15px; }
    .receipt-header h1 { font-size: 18px; color: #1a5632; margin: 0 0 5px 0; }
    .receipt-header h2 { font-size: 14px; margin: 0; color: #666; }
    .receipt-number { font-size: 16px; font-weight: bold; color: #1a5632; margin-top: 10px; }
    .receipt-body { margin: 20px 0; }
    .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .receipt-row .label { color: #666; font-size: 13px; }
    .receipt-row .value { font-weight: 500; font-size: 13px; text-align: right; }
    .amount-row { font-size: 18px; font-weight: bold; border-top: 2px solid #1a5632; border-bottom: 2px solid #1a5632; padding: 12px 0; margin: 15px 0; }
    .amount-row .value { color: #1a5632; }
    .receipt-footer { text-align: center; margin-top: 30px; font-size: 11px; color: #999; border-top: 1px dashed #ccc; padding-top: 15px; }
    .stamp-line { margin-top: 40px; border-top: 1px solid #333; width: 200px; margin-left: auto; margin-right: auto; }
    .stamp-label { text-align: center; font-size: 11px; color: #666; margin-top: 5px; }
  `;

  const handlePrint = (receipt: CashReceipt) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Cash Receipt - ${receipt.receiptNumber}</title>
          <style>${receiptStyles}</style>
        </head>
        <body>${getReceiptHtml(receipt)}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const handleDownload = (receipt: CashReceipt) => {
    const htmlContent = `
      <html>
        <head>
          <title>Cash Receipt - ${receipt.receiptNumber}</title>
          <style>${receiptStyles}</style>
        </head>
        <body>${getReceiptHtml(receipt)}</body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Receipt-${receipt.receiptNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
        <h1 className="text-xl font-bold" data-testid="text-page-title">Cash Receipts</h1>
        <div className="ml-auto">
          <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-receipt">
            <Plus className="w-4 h-4 mr-2" />
            New Receipt
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[hsl(var(--primary)/0.1)]">
                <Receipt className="w-4 h-4 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Receipts</p>
                <p className="text-xl font-bold" data-testid="text-total-receipts">{filteredReceipts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[hsl(var(--primary)/0.1)]">
                <Receipt className="w-4 h-4 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold font-mono text-[hsl(var(--primary))]" data-testid="text-total-amount">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5 pb-4 px-5">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search receipts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-receipts"
              />
            </div>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[180px]" data-testid="select-date-range">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRange === "custom" && (
            <div className="flex gap-3 mb-4">
              <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} data-testid="input-start-date" />
              <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} data-testid="input-end-date" />
            </div>
          )}

          {isLoadingReceipts ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-receipts">
              No receipts found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Received From</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id} data-testid={`row-receipt-${receipt.id}`}>
                      <TableCell className="font-mono font-medium" data-testid={`text-receipt-num-${receipt.id}`}>{receipt.receiptNumber}</TableCell>
                      <TableCell>{format(parseISO(receipt.createdAt), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{getPartyName(receipt)}</span>
                          <Badge variant="outline" className="w-fit mt-1">{receipt.partyType === "customer" ? "Customer" : receipt.partyType === "agent" ? "Agent" : "Vendor"}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{receipt.sourceType === "flight" ? "Flight" : "Other"}</span>
                          {receipt.sourceType === "flight" && receipt.pnr && (
                            <span className="text-xs font-mono text-muted-foreground">{receipt.pnr}</span>
                          )}
                          {receipt.sourceType === "other" && receipt.serviceName && (
                            <span className="text-xs text-muted-foreground">{receipt.serviceName}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getPaymentMethodLabel(receipt.paymentMethod)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-[hsl(var(--primary))]" data-testid={`text-amount-${receipt.id}`}>
                        {formatCurrency(receipt.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedReceipt(receipt)} data-testid={`button-view-receipt-${receipt.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(receipt)} data-testid={`button-download-receipt-${receipt.id}`}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReceipt} onOpenChange={(open) => { if (!open) setSelectedReceipt(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
            <DialogDescription>
              {selectedReceipt?.receiptNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Receipt Number</p>
                  <p className="font-mono font-bold text-lg" data-testid="text-receipt-number">{selectedReceipt.receiptNumber}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Date</p>
                  <p className="font-medium" data-testid="text-receipt-date">{format(parseISO(selectedReceipt.createdAt), "dd MMM yyyy, hh:mm a")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Received From</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium" data-testid="text-receipt-party-name">{getPartyName(selectedReceipt)}</p>
                    <Badge variant="outline" data-testid="text-receipt-party-type">{selectedReceipt.partyType === "customer" ? "Customer" : selectedReceipt.partyType === "agent" ? "Agent" : "Vendor"}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Source</p>
                  <p className="font-medium" data-testid="text-receipt-source-type">
                    {selectedReceipt.sourceType === "flight" ? "Flight" : "Other Service"}
                    {selectedReceipt.sourceType === "flight" && selectedReceipt.pnr && (
                      <span className="ml-2 font-mono text-muted-foreground text-sm">({selectedReceipt.pnr})</span>
                    )}
                    {selectedReceipt.sourceType === "other" && selectedReceipt.serviceName && (
                      <span className="ml-2 text-muted-foreground text-sm">({selectedReceipt.serviceName})</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment Method</p>
                  <Badge data-testid="text-receipt-payment-method">{getPaymentMethodLabel(selectedReceipt.paymentMethod)}</Badge>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount</p>
                  <p className="font-mono font-bold text-lg text-[hsl(var(--primary))]" data-testid="text-receipt-amount">{formatCurrency(selectedReceipt.amount)}</p>
                </div>
                {selectedReceipt.referenceNumber && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Reference</p>
                    <p className="font-mono font-medium">{selectedReceipt.referenceNumber}</p>
                  </div>
                )}
                {selectedReceipt.description && (
                  <div className="col-span-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Note</p>
                    <p className="text-muted-foreground" data-testid="text-receipt-description">{selectedReceipt.description}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button onClick={() => handlePrint(selectedReceipt)} data-testid="button-print-receipt">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" onClick={() => handleDownload(selectedReceipt)} data-testid="button-download-receipt">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Cash Receipt</DialogTitle>
            <DialogDescription>Record a payment received from a customer, agent, or vendor.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="partyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Received From</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue("partyId", "");
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-party-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="partyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{selectedPartyType === "customer" ? "Customer" : selectedPartyType === "agent" ? "Agent" : "Vendor"}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-party">
                          <SelectValue placeholder={`Select ${selectedPartyType}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {partyOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Source</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        if (v === "flight") {
                          form.setValue("serviceName", "");
                        } else {
                          form.setValue("pnr", "");
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-source-type">
                          <SelectValue placeholder="Select source type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="flight">Flight Details</SelectItem>
                        <SelectItem value="other">Any Other Service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedSourceType === "flight" && (
                <FormField
                  control={form.control}
                  name="pnr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PNR</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter PNR number" data-testid="input-pnr" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedSourceType === "other" && (
                <FormField
                  control={form.control}
                  name="serviceName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter service name" data-testid="input-service-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (AED)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" {...field} data-testid="input-amount" />
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
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Add a note..." className="resize-none" data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-receipt">
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Receipt className="w-4 h-4 mr-2" />
                )}
                Create Receipt
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
