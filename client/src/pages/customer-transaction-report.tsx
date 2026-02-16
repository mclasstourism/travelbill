import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Download, Printer, Calendar, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";
import type { Customer, DepositTransaction } from "@shared/schema";
import mcLogo from "@assets/final-logo_1771172687891.png";

type DateRange = "all" | "today" | "this_month" | "this_year" | "custom";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

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

export default function CustomerTransactionReportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<DepositTransaction[]>({
    queryKey: ["/api/deposit-transactions"],
  });

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  const getCustomerName = (customerId: string) => {
    return customerMap.get(customerId)?.name || "Unknown";
  };

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

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((tx) => tx.description.toLowerCase().includes(q));
    }

    if (customerFilter !== "all") {
      filtered = filtered.filter((tx) => tx.customerId === customerFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter((tx) => {
        const txDate = new Date(tx.createdAt);
        return isWithinInterval(txDate, { start: dateFilter.start, end: dateFilter.end });
      });
    }

    return filtered;
  }, [transactions, searchQuery, customerFilter, dateFilter]);

  const summaryStats = useMemo(() => {
    const totalCredits = filteredTransactions
      .filter((tx) => tx.type === "credit")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalDebits = filteredTransactions
      .filter((tx) => tx.type === "debit")
      .reduce((sum, tx) => sum + tx.amount, 0);
    return {
      totalTransactions: filteredTransactions.length,
      totalCredits,
      totalDebits,
    };
  }, [filteredTransactions]);

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) return;

    const dateRangeText = dateFilter
      ? `${format(dateFilter.start, "yyyy-MM-dd")} to ${format(dateFilter.end, "yyyy-MM-dd")}`
      : "All Time";

    const headers = ["Date", "Customer Name", "Description", "Type", "Amount", "Balance After"];
    const rows = filteredTransactions.map((tx) => [
      format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm"),
      getCustomerName(tx.customerId),
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.type === "credit" ? "Deposit Added" : "Deposit Used",
      tx.type === "credit" ? tx.amount : -tx.amount,
      tx.balanceAfter,
    ]);

    const csvContent = [
      [`Customer Transaction Report`],
      [`Date Range: ${dateRangeText}`],
      [`Total Transactions: ${summaryStats.totalTransactions}`],
      [`Total Credits: ${summaryStats.totalCredits}`],
      [`Total Debits: ${summaryStats.totalDebits}`],
      [],
      headers,
      ...rows,
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `customer_transaction_report_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  const handlePrintPdf = async () => {
    const logoDataUrl = await toBase64(mcLogo);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const dateRangeText = dateFilter
      ? `${format(dateFilter.start, "MMM d, yyyy")} - ${format(dateFilter.end, "MMM d, yyyy")}`
      : "All Time";

    const rows = filteredTransactions
      .map(
        (tx) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${getCustomerName(tx.customerId)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.type === "credit" ? "Deposit Added" : "Deposit Used"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: ${tx.type === "credit" ? "green" : "red"};">
          ${tx.type === "credit" ? "+" : "-"}${formatCurrency(tx.amount)}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${formatCurrency(tx.balanceAfter)}</td>
      </tr>
    `
      )
      .join("");

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Transaction Report</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; color: #1e293b; }
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
          <p class="report-title">CUSTOMER TRANSACTION REPORT</p>
          <p class="date-range">${dateRangeText}</p>

          <div class="summary">
            <div class="summary-card">
              <div class="summary-label">Total Transactions</div>
              <div class="summary-value">${summaryStats.totalTransactions}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Credits (Deposits Added)</div>
              <div class="summary-value" style="color: #16a34a;">${formatCurrency(summaryStats.totalCredits)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Debits (Deposits Used)</div>
              <div class="summary-value" style="color: #dc2626;">${formatCurrency(summaryStats.totalDebits)}</div>
            </div>
          </div>

          ${
            filteredTransactions.length > 0
              ? `
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th class="right">Amount</th>
                  <th class="right">Balance After</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          `
              : '<p class="no-data">No transactions found</p>'
          }

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

  const isLoading = isLoadingCustomers || isLoadingTransactions;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-report-title">
            Customer Transaction Report
          </h1>
          <p className="text-sm text-muted-foreground">
            View all customer deposit transactions with filters and export
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={filteredTransactions.length === 0}
            data-testid="button-export-excel"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={handlePrintPdf} data-testid="button-print-pdf">
            <Printer className="w-4 h-4 mr-2" />
            Print PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-visible">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Total Transactions
                </p>
                <div className="text-xl font-bold font-mono" data-testid="text-total-transactions">
                  {summaryStats.totalTransactions}
                </div>
              </div>
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
                <Calendar className="h-4 w-4 text-[hsl(var(--primary))]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-visible">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Total Credits
                </p>
                <div
                  className="text-xl font-bold font-mono text-green-600 dark:text-green-400"
                  data-testid="text-total-credits"
                >
                  {formatCurrency(summaryStats.totalCredits)}
                </div>
              </div>
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-visible">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Total Debits
                </p>
                <div
                  className="text-xl font-bold font-mono text-red-600 dark:text-red-400"
                  data-testid="text-total-debits"
                >
                  {formatCurrency(summaryStats.totalDebits)}
                </div>
              </div>
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ArrowDownCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Search Description</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="w-48" data-testid="select-customer-filter">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
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
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
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
                Showing: {format(dateFilter.start, "MMM d, yyyy")} -{" "}
                {format(dateFilter.end, "MMM d, yyyy")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No transactions found</p>
              <p className="text-sm">Adjust filters or add deposit transactions</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {getCustomerName(tx.customerId)}
                      </TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell>
                        {tx.type === "credit" ? (
                          <Badge variant="default">
                            <ArrowUpCircle className="w-3 h-3 mr-1" />
                            Deposit Added
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <ArrowDownCircle className="w-3 h-3 mr-1" />
                            Deposit Used
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-semibold ${
                          tx.type === "credit"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {tx.type === "credit" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
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
