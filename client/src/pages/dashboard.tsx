import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Users,
  Building2,
  FileText,
  Ticket,
  DollarSign,
  Clock,
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { DashboardMetrics, Invoice, Ticket as TicketType } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendUp,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: typeof Users;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold font-mono">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trendUp ? (
              <ArrowUpRight className="h-3 w-3 text-green-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-500" />
            )}
            <span className={`text-xs ${trendUp ? "text-green-500" : "text-red-500"}`}>
              {trend}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-32 mt-2" />
      </CardContent>
    </Card>
  );
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

export default function Dashboard() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/metrics"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview of your travel agency billing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your travel agency billing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics?.totalRevenue || 0)}
          icon={DollarSign}
        />
        <MetricCard
          title="Pending Payments"
          value={formatCurrency(metrics?.pendingPayments || 0)}
          icon={Clock}
        />
        <MetricCard
          title="Customer Deposits"
          value={formatCurrency(metrics?.customerDepositsTotal || 0)}
          description="Total deposit balance"
          icon={Wallet}
        />
        <MetricCard
          title="Vendor Credits"
          value={formatCurrency(metrics?.vendorCreditsTotal || 0)}
          description="Total credit available"
          icon={CreditCard}
        />
        <MetricCard
          title="Total Customers"
          value={metrics?.totalCustomers || 0}
          icon={Users}
        />
        <MetricCard
          title="Total Vendors"
          value={metrics?.totalVendors || 0}
          icon={Building2}
        />
        <MetricCard
          title="Total Invoices"
          value={metrics?.totalInvoices || 0}
          icon={FileText}
        />
        <MetricCard
          title="Total Tickets"
          value={metrics?.totalTickets || 0}
          icon={Ticket}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Recent Invoices</CardTitle>
                <CardDescription>Latest billing activity</CardDescription>
              </div>
              <Link href="/invoices">
                <Badge variant="outline" className="cursor-pointer hover-elevate">
                  View All
                </Badge>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!metrics?.recentInvoices?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No invoices yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.recentInvoices.slice(0, 5).map((invoice: Invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                    data-testid={`invoice-item-${invoice.id}`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">
                        {invoice.invoiceNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold">
                        {formatCurrency(invoice.subtotal)}
                      </span>
                      <Badge variant={getStatusBadgeVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Recent Tickets</CardTitle>
                <CardDescription>Latest issued tickets</CardDescription>
              </div>
              <Link href="/tickets">
                <Badge variant="outline" className="cursor-pointer hover-elevate">
                  View All
                </Badge>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!metrics?.recentTickets?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tickets yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.recentTickets.slice(0, 5).map((ticket: TicketType) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                    data-testid={`ticket-item-${ticket.id}`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">
                        {ticket.ticketNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {ticket.route} - {ticket.passengerName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold">
                        {formatCurrency(ticket.faceValue)}
                      </span>
                      <Badge variant={getStatusBadgeVariant(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
