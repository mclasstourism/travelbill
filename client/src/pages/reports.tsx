import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Ticket as TicketIcon,
  Calendar,
  Download,
  Printer,
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import type { Invoice, Ticket, Customer, Vendor, Agent } from "@shared/schema";
import { numberToWords } from "@/lib/number-to-words";
import mcLogo from "@assets/final-logo_1771172687891.png";

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
    case "refunded":
      return "destructive";
    default:
      return "outline";
  }
}

type DateRange = "today" | "this_week" | "this_month" | "custom";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("invoices");

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: tickets = [], isLoading: isLoadingTickets } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const getPartyName = (invoice: Invoice) => {
    if (invoice.customerType === "agent") {
      return agents.find(a => a.id === invoice.customerId)?.name || "Unknown";
    }
    return customers.find(c => c.id === invoice.customerId)?.name || "Unknown";
  };
  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || "Unknown";
  const getVendorName = (id: string) => vendors.find(v => v.id === id)?.name || "Unknown";

  const dateFilter = useMemo(() => {
    const now = new Date();
    
    switch (dateRange) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "this_week":
        return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "custom":
        if (customStartDate && customEndDate) {
          return { 
            start: startOfDay(parseISO(customStartDate)), 
            end: endOfDay(parseISO(customEndDate)) 
          };
        }
        return null;
      default:
        return null;
    }
  }, [dateRange, customStartDate, customEndDate]);

  const filteredInvoices = useMemo(() => {
    if (!dateFilter) return invoices;
    return invoices.filter(invoice => {
      const createdAt = new Date(invoice.createdAt);
      return isWithinInterval(createdAt, { start: dateFilter.start, end: dateFilter.end });
    });
  }, [invoices, dateFilter]);

  const filteredTickets = useMemo(() => {
    if (!dateFilter) return tickets;
    return tickets.filter(ticket => {
      const createdAt = new Date(ticket.createdAt);
      return isWithinInterval(createdAt, { start: dateFilter.start, end: dateFilter.end });
    });
  }, [tickets, dateFilter]);

  const invoiceTotals = useMemo(() => {
    // Use subtotal - discountAmount to match displayed amount in the table
    const getInvoiceAmount = (inv: Invoice) => inv.subtotal - inv.discountAmount;
    return {
      count: filteredInvoices.length,
      total: filteredInvoices.reduce((sum, inv) => sum + getInvoiceAmount(inv), 0),
      paid: filteredInvoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + getInvoiceAmount(inv), 0),
      pending: filteredInvoices.filter(inv => inv.status !== "paid" && inv.status !== "cancelled").reduce((sum, inv) => sum + getInvoiceAmount(inv), 0),
    };
  }, [filteredInvoices]);

  const ticketTotals = useMemo(() => {
    return {
      count: filteredTickets.length,
      total: filteredTickets.reduce((sum, t) => sum + t.faceValue, 0),
    };
  }, [filteredTickets]);

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

  const handlePrint = async () => {
    const logoDataUrl = await toBase64(mcLogo);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const dateRangeText = dateFilter
      ? `${format(dateFilter.start, "MMM d, yyyy")} - ${format(dateFilter.end, "MMM d, yyyy")}`
      : "All Time";

    const invoiceRows = filteredInvoices.map(invoice => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${invoice.invoiceNumber}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${format(new Date(invoice.createdAt), "MMM d, yyyy")}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${getPartyName(invoice)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${formatCurrency(invoice.subtotal - invoice.discountAmount)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${invoice.status}</td>
      </tr>
    `).join("");

    const ticketRows = filteredTickets.map(ticket => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${ticket.ticketNumber}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${format(new Date(ticket.createdAt), "MMM d, yyyy")}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${ticket.passengerName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${ticket.route}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${formatCurrency(ticket.faceValue)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${ticket.status}</td>
      </tr>
    `).join("");

    const invoiceTotalWords = numberToWords(invoiceTotals.total);
    const ticketTotalWords = numberToWords(ticketTotals.total);
    const paidWords = numberToWords(invoiceTotals.paid);
    const pendingWords = numberToWords(invoiceTotals.pending);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Transaction Report - ${dateRangeText}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; color: #1e293b; }
            h2 { margin-top: 30px; border-bottom: 2px solid #333; padding-bottom: 8px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0; }
            .header-logo { flex-shrink: 0; }
            .header-logo img { height: 65px; }
            .header-info { text-align: right; }
            .header-info p { margin: 2px 0; font-size: 12px; color: #64748b; }
            .header-divider { height: 3px; background: linear-gradient(to right, #1a5632, #22c55e, #1a5632); margin: 14px 0 10px 0; border-radius: 2px; }
            .report-title { text-align: center; font-size: 22px; font-weight: 700; color: #1a5632; margin: 10px 0 4px 0; letter-spacing: 1px; }
            .date-range { text-align: center; color: #666; margin-bottom: 20px; font-size: 13px; }
            .summary-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .summary-label { font-weight: 500; }
            .summary-value { font-family: monospace; font-weight: bold; }
            .amount-words { font-size: 11px; color: #64748b; font-style: italic; font-family: 'Segoe UI', Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f3f4f6; padding: 10px 8px; text-align: left; border-bottom: 2px solid #d1d5db; font-weight: 600; }
            th.right { text-align: right; }
            .total-row { font-weight: bold; background: #f9fafb; }
            .total-row td { padding: 12px 8px; border-top: 2px solid #333; }
            .total-words { font-size: 11px; color: #64748b; font-style: italic; font-weight: normal; display: block; margin-top: 2px; }
            .no-data { text-align: center; padding: 20px; color: #666; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-logo">
              <img src="${logoDataUrl}" alt="MCT - Tourism Organizers" />
            </div>
            <div class="header-info">
              <p>Phone: 025 640 224 | 050 222 1042</p>
              <p>www.middleclass.ae | sales@middleclass.ae</p>
              <p>Shop 41, Al Dhannah Traditional Souq,</p>
              <p>Al Dhannah City, Abu Dhabi – UAE</p>
            </div>
          </div>
          <div class="header-divider"></div>
          <p class="report-title">TRANSACTION REPORT</p>
          <p class="date-range">${dateRangeText}</p>

          <div class="summary-box">
            <div class="summary-row">
              <span class="summary-label">Total Invoices:</span>
              <span>
                <span class="summary-value">${invoiceTotals.count} (${formatCurrency(invoiceTotals.total)})</span>
                <br/><span class="amount-words">${invoiceTotalWords}</span>
              </span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Paid Amount:</span>
              <span>
                <span class="summary-value" style="color: green;">${formatCurrency(invoiceTotals.paid)}</span>
                <br/><span class="amount-words">${paidWords}</span>
              </span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Pending Amount:</span>
              <span>
                <span class="summary-value" style="color: #d97706;">${formatCurrency(invoiceTotals.pending)}</span>
                <br/><span class="amount-words">${pendingWords}</span>
              </span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Total Tickets:</span>
              <span>
                <span class="summary-value">${ticketTotals.count} (${formatCurrency(ticketTotals.total)})</span>
                <br/><span class="amount-words">${ticketTotalWords}</span>
              </span>
            </div>
          </div>

          <h2>Invoices (${filteredInvoices.length})</h2>
          ${filteredInvoices.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th class="right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceRows}
                <tr class="total-row">
                  <td colspan="3">Total</td>
                  <td style="text-align: right; font-family: monospace;">
                    ${formatCurrency(invoiceTotals.total)}
                    <span class="total-words">${invoiceTotalWords}</span>
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          ` : '<p class="no-data">No invoices in this date range</p>'}

          <h2>Tickets (${filteredTickets.length})</h2>
          ${filteredTickets.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Date</th>
                  <th>Passenger</th>
                  <th>Route</th>
                  <th class="right">Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${ticketRows}
                <tr class="total-row">
                  <td colspan="4">Total</td>
                  <td style="text-align: right; font-family: monospace;">
                    ${formatCurrency(ticketTotals.total)}
                    <span class="total-words">${ticketTotalWords}</span>
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          ` : '<p class="no-data">No tickets in this date range</p>'}

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

  const isLoading = isLoadingInvoices || isLoadingTickets;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-reports-title">Reports</h1>
            <p className="text-sm text-muted-foreground">View and filter transaction records by date</p>
          </div>
        </div>
        <Button onClick={handlePrint} variant="outline" data-testid="button-print-report">
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
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
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{invoiceTotals.count}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(invoiceTotals.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600 dark:text-green-400 font-mono">
              {formatCurrency(invoiceTotals.paid)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400 font-mono">
              {formatCurrency(invoiceTotals.pending)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{ticketTotals.count}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(ticketTotals.total)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <FileText className="w-4 h-4 mr-2" />
            Invoices ({filteredInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="tickets" data-testid="tab-tickets">
            <TicketIcon className="w-4 h-4 mr-2" />
            Tickets ({filteredTickets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="pt-6">
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
                  <p className="text-sm">No invoices match the selected date range</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Amount in Words</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id} data-testid={`row-report-invoice-${invoice.id}`}>
                          <TableCell className="font-medium font-mono">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>{getPartyName(invoice)}</TableCell>
                          <TableCell>{getVendorName(invoice.vendorId)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(invoice.subtotal - invoice.discountAmount)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs">
                            {numberToWords(invoice.subtotal - invoice.discountAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TicketIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No tickets found</p>
                  <p className="text-sm">No tickets match the selected date range</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Passenger</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Amount in Words</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id} data-testid={`row-report-ticket-${ticket.id}`}>
                          <TableCell className="font-medium font-mono">
                            {ticket.ticketNumber}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>{ticket.passengerName}</TableCell>
                          <TableCell>{ticket.route}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(ticket.faceValue)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs">
                            {numberToWords(ticket.faceValue)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(ticket.status)}>
                              {ticket.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="print:block">
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Total Invoice Amount:</span>
            <span className="font-mono font-semibold">{formatCurrency(invoiceTotals.total)}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {numberToWords(invoiceTotals.total)}
          </div>
          <div className="flex justify-between pt-2">
            <span>Total Ticket Value:</span>
            <span className="font-mono font-semibold">{formatCurrency(ticketTotals.total)}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {numberToWords(ticketTotals.total)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
