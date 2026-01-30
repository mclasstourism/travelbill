import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Plane,
  Briefcase,
  Building2,
  Eye,
  FileText,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Wallet,
  CreditCard,
  Banknote,
  ArrowDownCircle,
} from "lucide-react";
import type { Ticket, Invoice, Customer, Vendor, Agent } from "@shared/schema";

export default function SalesMonitor() {
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
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

  const getInvoice = (invoiceId: string | null) => {
    if (!invoiceId) return null;
    return invoices.find((inv) => inv.id === invoiceId);
  };

  const isAgent = (customerId: string) => {
    return agents.some((a) => a.id === customerId);
  };

  // Vendor sales = customer sales only (not agents)
  const vendorTickets = tickets.filter((t) => !isAgent(t.customerId));
  // Agent sales = tickets sold to agents
  const agentSales = tickets.filter((t) => isAgent(t.customerId));

  const calculateTotals = (ticketList: Ticket[]) => {
    return ticketList.reduce(
      (acc, t) => ({
        count: acc.count + 1,
        vendorCost: acc.vendorCost + (t.vendorPrice || 0),
        airlineCost: acc.airlineCost + (t.airlinePrice || 0),
        mcAddition: acc.mcAddition + (t.middleClassPrice || 0),
        faceValue: acc.faceValue + (t.faceValue || 0),
        profit: acc.profit + (t.middleClassPrice || 0),
        depositUsed: acc.depositUsed + (t.depositDeducted || 0),
      }),
      { count: 0, vendorCost: 0, airlineCost: 0, mcAddition: 0, faceValue: 0, profit: 0, depositUsed: 0 }
    );
  };

  const getPaymentMethod = (invoice: Invoice | null | undefined) => {
    if (!invoice) return null;
    return invoice.paymentMethod;
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

  const vendorTotals = calculateTotals(vendorTickets);
  const agentTotals = calculateTotals(agentSales);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (ticketsLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const TicketRow = ({ ticket, showSource = false, showDeposit = false, hideClientType = false }: { ticket: Ticket; showSource?: boolean; showDeposit?: boolean; hideClientType?: boolean }) => {
    const invoice = getInvoice(ticket.invoiceId || null);
    const isAgentSale = isAgent(ticket.customerId);
    const isDirect = ticket.vendorId === "direct" || !ticket.vendorId;
    const vendorName = getVendorName(ticket.vendorId || null);
    const paymentMethod = getPaymentMethod(invoice);
    const depositUsed = ticket.depositDeducted || 0;
    
    return (
      <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
        <TableCell className="font-mono text-sm">
          {ticket.ticketNumber || "-"}
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium">{ticket.passengerName}</span>
            <span className="text-xs text-muted-foreground">{ticket.route}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-muted-foreground" />
            <span>{ticket.airlines}</span>
          </div>
        </TableCell>
        <TableCell>{formatDate(ticket.travelDate)}</TableCell>
        {showSource && (
          <TableCell>
            <Badge variant={isDirect ? "default" : "secondary"}>
              {isDirect ? (
                <><Plane className="w-3 h-3 mr-1" /> Airlines</>
              ) : (
                <><Building2 className="w-3 h-3 mr-1" /> {vendorName}</>
              )}
            </Badge>
          </TableCell>
        )}
        {!hideClientType && (
          <TableCell>
            <Badge variant={isAgentSale ? "outline" : "secondary"}>
              {isAgentSale ? (
                <><Briefcase className="w-3 h-3 mr-1" /> Agent</>
              ) : (
                <><Users className="w-3 h-3 mr-1" /> Customer</>
              )}
            </Badge>
          </TableCell>
        )}
        <TableCell>{getCustomerName(ticket.customerId)}</TableCell>
        <TableCell className="text-right font-mono">
          {isDirect
            ? formatCurrency(ticket.airlinePrice || 0)
            : formatCurrency(ticket.vendorPrice || 0)}
        </TableCell>
        <TableCell className="text-right font-mono text-primary">
          {formatCurrency(ticket.middleClassPrice || 0)}
        </TableCell>
        <TableCell className="text-right font-mono font-semibold">
          {formatCurrency(ticket.faceValue)}
        </TableCell>
        {showDeposit && (
          <TableCell className="text-right">
            {depositUsed > 0 ? (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-mono">
                <ArrowDownCircle className="w-3 h-3 mr-1" />
                {formatCurrency(depositUsed)}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-sm">-</span>
            )}
          </TableCell>
        )}
        <TableCell>
          {invoice ? (
            <div className="flex flex-col gap-1">
              <Badge variant="outline" className="font-mono">
                <FileText className="w-3 h-3 mr-1" />
                {invoice.invoiceNumber}
              </Badge>
              {paymentMethod && (
                <Badge variant="secondary" className="text-xs">
                  {getPaymentIcon(paymentMethod)}
                  <span className="ml-1 capitalize">{paymentMethod}</span>
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">No invoice</span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  const SummaryCards = ({
    totals,
    type,
  }: {
    totals: { count: number; vendorCost: number; airlineCost: number; mcAddition: number; faceValue: number; profit: number; depositUsed: number };
    type: "direct" | "vendor" | "agent";
  }) => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <FileText className="w-4 h-4" />
            Total Sales
          </div>
          <div className="text-2xl font-bold">{totals.count}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            {type === "direct" ? "Airline Cost" : type === "vendor" ? "Vendor Cost" : "Source Cost"}
          </div>
          <div className="text-2xl font-bold font-mono">
            {formatCurrency(type === "direct" ? totals.airlineCost : (totals.vendorCost + totals.airlineCost))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            MC Addition
          </div>
          <div className="text-2xl font-bold font-mono text-primary">
            {formatCurrency(totals.mcAddition)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            {type === "agent" ? "Price to Agent" : "Total Revenue"}
          </div>
          <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
            {formatCurrency(totals.faceValue)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Wallet className="w-4 h-4" />
            Deposit Used
          </div>
          <div className="text-2xl font-bold font-mono text-orange-600 dark:text-orange-400">
            {formatCurrency(totals.depositUsed)}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-page-title">
          Sales Monitor
        </h1>
        <p className="text-muted-foreground">
          Track all ticket sales with pricing breakdowns and invoices
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Client Sales</div>
                <div className="text-xl font-bold">{agentSales.length} Sales</div>
                <div className="text-sm font-mono text-purple-600 dark:text-purple-400">
                  {formatCurrency(agentTotals.faceValue)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Building2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Vendor Sales</div>
                <div className="text-xl font-bold">{vendorTickets.length} Sales</div>
                <div className="text-sm font-mono text-orange-600 dark:text-orange-400">
                  {formatCurrency(vendorTotals.faceValue)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clients" data-testid="tab-clients">
            <Users className="w-4 h-4 mr-2" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="vendors" data-testid="tab-vendors">
            <Building2 className="w-4 h-4 mr-2" />
            Vendors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Client Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SummaryCards totals={agentTotals} type="agent" />
              
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Passenger</TableHead>
                      <TableHead>Airlines</TableHead>
                      <TableHead>Travel Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Client Type</TableHead>
                      <TableHead>Agent Name</TableHead>
                      <TableHead className="text-right">Source Cost</TableHead>
                      <TableHead className="text-right">MC Addition</TableHead>
                      <TableHead className="text-right">Price to Agent</TableHead>
                      <TableHead className="text-right">Deposit Used</TableHead>
                      <TableHead>Invoice / Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                          No agent sales yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      agentSales.map((ticket) => (
                        <TicketRow key={ticket.id} ticket={ticket} showSource showDeposit />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Vendor Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SummaryCards totals={vendorTotals} type="vendor" />
              
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Passenger</TableHead>
                      <TableHead>Airlines</TableHead>
                      <TableHead>Travel Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead className="text-right">Source Cost</TableHead>
                      <TableHead className="text-right">MC Addition</TableHead>
                      <TableHead className="text-right">Face Value</TableHead>
                      <TableHead className="text-right">Deposit Used</TableHead>
                      <TableHead>Invoice / Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          No customer sales yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      vendorTickets.map((ticket) => (
                        <TicketRow key={ticket.id} ticket={ticket} showSource showDeposit hideClientType />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
