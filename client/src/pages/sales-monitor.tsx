import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Building2,
  FileText,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Wallet,
  CreditCard,
  Banknote,
  Printer,
  Activity,
  BarChart3,
  MapPin,
  User,
  Ticket as TicketIcon,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import type { Ticket, Invoice, Customer, Vendor, Agent, ActivityLog, SalesAnalytics } from "@shared/schema";
import { numberToWords } from "@/lib/number-to-words";

const entityIcons: Record<string, any> = {
  invoice: FileText,
  ticket: TicketIcon,
  customer: Users,
  agent: Users,
  vendor: Building2,
  deposit: Wallet,
  user: User,
  report: BarChart3,
};

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  login: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  logout: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  view: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  export: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  email: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

type DateRange = "today" | "this_week" | "this_month" | "custom";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

export default function SalesMonitor() {
  const [activeTab, setActiveTab] = useState("invoices");
  const [dateRange, setDateRange] = useState<DateRange>("this_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
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

  const { data: activityLogs = [], isLoading: logsLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<SalesAnalytics>({
    queryKey: ["/api/analytics"],
  });

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) return customer.name;
    const agent = agents.find((a) => a.id === customerId);
    if (agent) return agent.name;
    return "Unknown";
  };

  const getVendorName = (vendorId: string | null) => {
    if (!vendorId || vendorId === "direct") return "Direct Airlines";
    const vendor = vendors.find((v) => v.id === vendorId);
    return vendor?.name || "Unknown Vendor";
  };

  const isAgent = (customerId: string) => {
    return agents.some((a) => a.id === customerId);
  };

  const getPaymentIcon = (method: string | null) => {
    switch (method) {
      case "cash":
        return <Banknote className="w-3 h-3" />;
      case "card":
        return <CreditCard className="w-3 h-3" />;
      case "credit":
        return <Wallet className="w-3 h-3" />;
      default:
        return <DollarSign className="w-3 h-3" />;
    }
  };

  const invoiceTotals = invoices.reduce(
    (acc, inv) => ({
      count: acc.count + 1,
      totalAmount: acc.totalAmount + (inv.total || 0),
      paidAmount: acc.paidAmount + (inv.status === "paid" ? (inv.total || 0) : 0),
      depositUsed: acc.depositUsed + (inv.depositUsed || 0),
    }),
    { count: 0, totalAmount: 0, paidAmount: 0, depositUsed: 0 }
  );

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

  const reportInvoiceTotals = useMemo(() => {
    return {
      count: filteredInvoices.length,
      total: filteredInvoices.reduce((sum, inv) => sum + inv.total, 0),
      paid: filteredInvoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + inv.total, 0),
      pending: filteredInvoices.filter(inv => inv.status !== "paid" && inv.status !== "cancelled").reduce((sum, inv) => sum + inv.total, 0),
    };
  }, [filteredInvoices]);

  const reportTicketTotals = useMemo(() => {
    return {
      count: filteredTickets.length,
      total: filteredTickets.reduce((sum, t) => sum + t.faceValue, 0),
    };
  }, [filteredTickets]);

  const handlePrint = () => {
    window.print();
  };

  const isLoading = ticketsLoading || invoicesLoading;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full max-w-md" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="lg:hidden" data-testid="button-sidebar-toggle" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">
              Sales Monitor
            </h1>
            <p className="text-sm text-muted-foreground">
              Track invoices, reports, analytics and activity
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <FileText className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Invoices</span>
          </TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">
            <BarChart3 className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <TrendingUp className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">
            <Activity className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <FileText className="w-4 h-4" />
                  Total Invoices
                </div>
                <div className="text-2xl font-bold">{invoices.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="w-4 h-4" />
                  Total Amount
                </div>
                <div className="text-2xl font-bold font-mono text-primary">
                  {formatCurrency(invoiceTotals.totalAmount)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingUp className="w-4 h-4" />
                  Paid Amount
                </div>
                <div className="text-2xl font-bold font-mono text-green-600">
                  {formatCurrency(invoiceTotals.paidAmount)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Wallet className="w-4 h-4" />
                  Deposit Used
                </div>
                <div className="text-2xl font-bold font-mono text-orange-600">
                  {formatCurrency(invoiceTotals.depositUsed)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Client Type</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Vendor Price</TableHead>
                      <TableHead className="text-right">MC Addition</TableHead>
                      <TableHead className="text-right">Grand Total</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No invoices yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((invoice) => {
                        const clientName = getCustomerName(invoice.customerId);
                        const clientType = isAgent(invoice.customerId) ? "Agent" : "Customer";
                        const vendorName = getVendorName(invoice.vendorId || null);
                        const vendorPrice = invoice.vendorCost || 0;
                        const mcAddition = (invoice.total || 0) - vendorPrice;
                        return (
                          <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                            <TableCell className="font-mono font-medium">
                              {invoice.invoiceNumber}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(invoice.createdAt)}
                            </TableCell>
                            <TableCell className="font-medium">{clientName}</TableCell>
                            <TableCell>
                              <Badge variant={clientType === "Agent" ? "outline" : "secondary"}>
                                {clientType === "Agent" ? (
                                  <><Briefcase className="w-3 h-3 mr-1" /> Agent</>
                                ) : (
                                  <><Users className="w-3 h-3 mr-1" /> Customer</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{vendorName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(vendorPrice)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-primary">
                              {formatCurrency(mcAddition)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatCurrency(invoice.total || 0)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {getPaymentIcon(invoice.paymentMethod)}
                                <span className="capitalize text-sm">{invoice.paymentMethod}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={invoice.status === "paid" ? "default" : "destructive"}>
                                {invoice.status === "paid" ? "Paid" : "Unpaid"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <Card className="flex-1">
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

            <Button onClick={handlePrint} variant="outline" data-testid="button-print-report">
              <Printer className="w-4 h-4 mr-2" />
              Print Report
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{reportInvoiceTotals.count}</div>
                <p className="text-xs text-muted-foreground">{formatCurrency(reportInvoiceTotals.total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Paid Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-green-600 dark:text-green-400 font-mono">
                  {formatCurrency(reportInvoiceTotals.paid)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400 font-mono">
                  {formatCurrency(reportInvoiceTotals.pending)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{reportTicketTotals.count}</div>
                <p className="text-xs text-muted-foreground">{formatCurrency(reportTicketTotals.total)}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="report-invoices">
            <TabsList>
              <TabsTrigger value="report-invoices" data-testid="tab-report-invoices">
                <FileText className="w-4 h-4 mr-2" />
                Invoices ({filteredInvoices.length})
              </TabsTrigger>
              <TabsTrigger value="report-tickets" data-testid="tab-report-tickets">
                <TicketIcon className="w-4 h-4 mr-2" />
                Tickets ({filteredTickets.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="report-invoices" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {filteredInvoices.length === 0 ? (
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
                              <TableCell>{getCustomerName(invoice.customerId)}</TableCell>
                              <TableCell>{getVendorName(invoice.vendorId)}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                {formatCurrency(invoice.total)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-xs">
                                {numberToWords(invoice.total)}
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

            <TabsContent value="report-tickets" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {filteredTickets.length === 0 ? (
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
                <span className="font-mono font-semibold">{formatCurrency(reportInvoiceTotals.total)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {numberToWords(reportInvoiceTotals.total)}
              </div>
              <div className="flex justify-between pt-2">
                <span>Total Ticket Value:</span>
                <span className="font-mono font-semibold">{formatCurrency(reportTicketTotals.total)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {numberToWords(reportTicketTotals.total)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Top Customers</CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3">By total spending</CardDescription>
                  {analytics?.topCustomers?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics?.topCustomers?.slice(0, 5).map((customer, i) => (
                        <div key={customer.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                            <span className="text-sm font-medium truncate max-w-32">{customer.name}</span>
                          </div>
                          <span className="text-sm font-mono">AED {customer.totalSpent.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Top Agents</CardTitle>
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3">By total sales</CardDescription>
                  {analytics?.topAgents?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics?.topAgents?.slice(0, 5).map((agent, i) => (
                        <div key={agent.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                            <span className="text-sm font-medium truncate max-w-32">{agent.name}</span>
                          </div>
                          <span className="text-sm font-mono">AED {agent.totalSales.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Popular Routes</CardTitle>
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3">Most booked routes</CardDescription>
                  {analytics?.topRoutes?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics?.topRoutes?.slice(0, 5).map((route, i) => (
                        <div key={route.route} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                            <span className="text-sm font-medium truncate max-w-32">{route.route}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">{route.count} tickets</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Vendor Comparison</CardTitle>
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3">Cost analysis by vendor</CardDescription>
                  {analytics?.vendorComparison?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics?.vendorComparison?.slice(0, 5).map((vendor) => (
                        <div key={vendor.id} className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate max-w-32">{vendor.name}</span>
                          <div className="text-right">
                            <div className="text-sm font-mono">AED {vendor.avgCost.toFixed(0)}/avg</div>
                            <div className="text-xs text-muted-foreground">{vendor.ticketCount} tickets</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Profit by Vendor</CardTitle>
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3">Revenue, cost, and profit margins</CardDescription>
                  {analytics?.profitByVendor?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-medium">Vendor</th>
                            <th className="text-right py-2 font-medium">Revenue</th>
                            <th className="text-right py-2 font-medium">Cost</th>
                            <th className="text-right py-2 font-medium">Profit</th>
                            <th className="text-right py-2 font-medium">Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics?.profitByVendor?.map((vendor) => (
                            <tr key={vendor.vendorId} className="border-b last:border-0">
                              <td className="py-2">{vendor.vendorName}</td>
                              <td className="py-2 text-right font-mono">AED {vendor.revenue.toLocaleString()}</td>
                              <td className="py-2 text-right font-mono">AED {vendor.cost.toLocaleString()}</td>
                              <td className={`py-2 text-right font-mono ${vendor.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                AED {vendor.profit.toLocaleString()}
                              </td>
                              <td className="py-2 text-right">
                                <Badge variant={vendor.margin >= 10 ? "default" : "secondary"}>
                                  {vendor.margin.toFixed(1)}%
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Sales</CardTitle>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3">Sales trend over time</CardDescription>
                  {analytics?.dailySales?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sales data yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="flex gap-2 min-w-max pb-2">
                        {analytics?.dailySales?.slice(-14).map((day) => (
                          <div key={day.date} className="flex flex-col items-center min-w-16">
                            <div className="text-xs text-muted-foreground mb-1">
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="bg-primary/10 rounded-md p-2 text-center w-full">
                              <div className="text-sm font-mono">AED {day.amount.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">{day.count} inv</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 py-4 border-b last:border-0">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !activityLogs || activityLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No activity recorded yet</p>
                  <p className="text-sm mt-1">Actions will be logged as users interact with the system</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {activityLogs.map((log) => {
                    const Icon = entityIcons[log.entity] || Activity;
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-4 py-3 border-b last:border-0 hover-elevate rounded-md px-2 -mx-2"
                        data-testid={`activity-log-${log.id}`}
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{log.userName}</span>
                            <Badge className={`text-xs ${actionColors[log.action] || ''}`}>
                              {log.action}
                            </Badge>
                            <span className="text-muted-foreground">{log.entity}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
