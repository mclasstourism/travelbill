import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import mcLogo from "@assets/final-logo_1771172687891.png";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Wallet, Search, Loader2, ArrowUpCircle, ArrowDownCircle, Eye, ArrowLeft, Download, Printer, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";
import { z } from "zod";
import type { Customer, DepositTransaction } from "@shared/schema";

type DateRange = "all" | "today" | "this_month" | "this_year" | "custom";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

const addDepositFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  description: z.string().optional(),
});

type AddDepositForm = z.infer<typeof addDepositFormSchema>;

export default function DepositsPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const { toast } = useToast();

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<DepositTransaction[]>({
    queryKey: ["/api/deposit-transactions"],
  });

  const form = useForm<AddDepositForm>({
    resolver: zodResolver(addDepositFormSchema),
    defaultValues: {
      customerId: "",
      amount: 0,
      description: "",
    },
  });

  const addDepositMutation = useMutation({
    mutationFn: async (data: AddDepositForm) => {
      const res = await apiRequest("POST", "/api/deposit-transactions", {
        ...data,
        type: "credit",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deposit-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setIsAddOpen(false);
      form.reset();
      toast({
        title: "Deposit added",
        description: "The deposit has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add deposit",
        variant: "destructive",
      });
    },
  });

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  );

  const dateFilter = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "this_year":
        return { start: startOfYear(now), end: endOfYear(now) };
      case "custom":
        if (customStartDate && customEndDate) {
          return { start: startOfDay(parseISO(customStartDate)), end: endOfDay(parseISO(customEndDate)) };
        }
        return null;
      default:
        return null;
    }
  }, [dateRange, customStartDate, customEndDate]);

  const customerTransactions = useMemo(() => {
    if (!selectedCustomer) return [];
    
    let filtered = transactions
      .filter(tx => tx.customerId === selectedCustomer.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (dateFilter) {
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.createdAt);
        return isWithinInterval(txDate, { start: dateFilter.start, end: dateFilter.end });
      });
    }
    
    return filtered;
  }, [selectedCustomer, transactions, dateFilter]);

  const totalDeposits = customers.reduce((sum, c) => sum + (c.depositBalance > 0 ? c.depositBalance : 0), 0);

  const handleExportExcel = () => {
    if (!selectedCustomer || customerTransactions.length === 0) return;
    
    const dateRangeText = dateFilter
      ? `${format(dateFilter.start, "yyyy-MM-dd")} to ${format(dateFilter.end, "yyyy-MM-dd")}`
      : "All Time";
    
    const headers = ["Date", "Description", "Type", "Amount", "Balance After"];
    const rows = customerTransactions.map(tx => [
      format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm"),
      tx.description,
      tx.type === "credit" ? "Deposit Added" : "Deposit Used",
      tx.type === "credit" ? tx.amount : -tx.amount,
      tx.balanceAfter
    ]);
    
    const csvContent = [
      [`Customer: ${selectedCustomer.name}`],
      [`Phone: ${selectedCustomer.phone || "N/A"}`],
      [`Date Range: ${dateRangeText}`],
      [],
      headers,
      ...rows
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `customer_${selectedCustomer.name.replace(/\s+/g, "_")}_deposits_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
    
    toast({ title: "Export successful", description: "Deposit history downloaded as Excel CSV" });
  };

  const toBase64 = (src: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  };

  const handlePrintPdf = async () => {
    if (!selectedCustomer) return;
    const logoDataUrl = await toBase64(mcLogo);
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const dateRangeText = dateFilter
      ? `${format(dateFilter.start, "MMM d, yyyy")} - ${format(dateFilter.end, "MMM d, yyyy")}`
      : "All Time";
    
    const rows = customerTransactions.map(tx => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.type === "credit" ? "Deposit Added" : "Deposit Used"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: ${tx.type === "credit" ? "green" : "red"};">
          ${tx.type === "credit" ? "+" : "-"}${formatCurrency(tx.amount)}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${formatCurrency(tx.balanceAfter)}</td>
      </tr>
    `).join("");
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Deposit History - ${selectedCustomer.name}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; color: #1e293b; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0; }
            .header-logo img { height: 65px; }
            .header-info { text-align: right; }
            .header-info p { margin: 2px 0; font-size: 12px; color: #64748b; }
            .header-divider { height: 3px; background: linear-gradient(to right, #1a5632, #22c55e, #1a5632); margin: 14px 0 10px 0; border-radius: 2px; }
            .report-title { text-align: center; font-size: 22px; font-weight: 700; color: #1a5632; margin: 10px 0 4px 0; letter-spacing: 1px; }
            .date-range { text-align: center; color: #666; margin-bottom: 20px; font-size: 13px; }
            .summary { display: flex; gap: 20px; margin-bottom: 20px; }
            .summary-card { flex: 1; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .summary-label { font-size: 12px; color: #666; }
            .summary-value { font-size: 20px; font-weight: bold; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f3f4f6; padding: 10px 8px; text-align: left; border-bottom: 2px solid #d1d5db; }
            th.right { text-align: right; }
            .no-data { text-align: center; padding: 40px; color: #666; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-logo">
              <img src="${logoDataUrl}" alt="Middle Class Tourism" />
            </div>
            <div class="header-info">
              <p>Phone: 025 640 224 | 050 222 1042</p>
              <p>www.middleclass.ae | sales@middleclass.ae</p>
              <p>Shop 41, Al Dhannah Traditional Souq,</p>
              <p>Al Dhannah City, Abu Dhabi – UAE</p>
            </div>
          </div>
          <div class="header-divider"></div>
          <p class="report-title">CUSTOMER DEPOSIT HISTORY</p>
          <h3 style="text-align: center; margin-top: 5px;">${selectedCustomer.name}</h3>
          <p style="text-align: center; color: #666;">Phone: ${selectedCustomer.phone || "N/A"}</p>
          <p class="date-range">${dateRangeText}</p>
          
          <div class="summary">
            <div class="summary-card">
              <div class="summary-label">Current Balance</div>
              <div class="summary-value" style="color: ${selectedCustomer.depositBalance >= 0 ? '#16a34a' : '#dc2626'};">${formatCurrency(selectedCustomer.depositBalance)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Transactions in Range</div>
              <div class="summary-value">${customerTransactions.length}</div>
            </div>
          </div>
          
          ${customerTransactions.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th class="right">Amount</th>
                  <th class="right">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          ` : '<p class="no-data">No transactions in this date range</p>'}
          
          <p style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const onSubmit = (data: AddDepositForm) => {
    addDepositMutation.mutate(data);
  };

  const handleViewHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  if (selectedCustomer) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedCustomer(null)} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold" data-testid="text-customer-history-title">
                {selectedCustomer.name} - Deposit History
              </h1>
              <p className="text-sm text-muted-foreground">
                Phone: {selectedCustomer.phone} | Current Balance: {formatCurrency(selectedCustomer.depositBalance)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportExcel} disabled={customerTransactions.length === 0} data-testid="button-export-excel">
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={handlePrintPdf} data-testid="button-print-pdf">
              <Printer className="w-4 h-4 mr-2" />
              Print PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Date Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
                  <SelectTrigger className="w-40" data-testid="select-date-range">
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
                <>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      data-testid="input-end-date"
                    />
                  </div>
                </>
              )}

              {dateFilter && (
                <div className="text-sm text-muted-foreground">
                  Showing: {format(dateFilter.start, "MMM d, yyyy")} - {format(dateFilter.end, "MMM d, yyyy")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="overflow-visible">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Current Balance</p>
                  <div className={`text-xl font-bold font-mono ${selectedCustomer.depositBalance >= 0 ? 'text-[hsl(var(--primary))]' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(selectedCustomer.depositBalance)}
                  </div>
                </div>
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-[hsl(var(--primary))]" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-visible">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Transactions in Range</p>
                  <div className="text-xl font-bold font-mono">{customerTransactions.length}</div>
                </div>
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
                  <ArrowUpCircle className="h-4 w-4 text-[hsl(var(--primary))]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {customerTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No transactions found</p>
                <p className="text-sm">Add a deposit to see transaction history</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerTransactions.map((tx) => (
                      <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell>
                          {tx.type === "credit" ? (
                            <Badge variant="default" className="bg-green-600">
                              <ArrowUpCircle className="w-3 h-3 mr-1" />
                              Credit
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <ArrowDownCircle className="w-3 h-3 mr-1" />
                              Debit
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${tx.type === "credit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(tx.balanceAfter)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-deposits-title">Customer Deposits</h1>
            <p className="text-sm text-muted-foreground">Track customer deposit balances and transactions</p>
          </div>
        </div>
        <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-deposit">
          <Plus className="w-4 h-4 mr-2" />
          Add Deposit
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-visible">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Total Customer Deposits</p>
                <div className="text-xl font-bold font-mono text-[hsl(var(--primary))]">
                  {formatCurrency(totalDeposits)}
                </div>
              </div>
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
                <Wallet className="h-4 w-4 text-[hsl(var(--primary))]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-visible">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Customers with Deposits</p>
                <div className="text-xl font-bold font-mono">{customers.filter(c => c.depositBalance > 0).length}</div>
              </div>
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
                <ArrowUpCircle className="h-4 w-4 text-[hsl(var(--primary))]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-customers"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingCustomers ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No customers found</p>
              <p className="text-sm">Add customers first to track deposits</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      data-testid={`row-customer-${customer.id}`}
                      className="cursor-pointer"
                      onClick={() => handleViewHistory(customer)}
                    >
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.phone || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.company || "-"}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${customer.depositBalance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {formatCurrency(customer.depositBalance)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); handleViewHistory(customer); }}
                          data-testid={`button-view-history-${customer.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer Deposit</DialogTitle>
            <DialogDescription>
              Record a new deposit for a customer.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-customer">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} ({formatCurrency(customer.depositBalance)})
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (AED) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Cash deposit"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAddOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addDepositMutation.isPending}
                  data-testid="button-save-deposit"
                >
                  {addDepositMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Add Deposit
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
