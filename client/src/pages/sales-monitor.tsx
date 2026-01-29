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

  const directAirlineTickets = tickets.filter((t) => t.vendorId === "direct" || !t.vendorId);
  const vendorTickets = tickets.filter((t) => t.vendorId && t.vendorId !== "direct");
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
      }),
      { count: 0, vendorCost: 0, airlineCost: 0, mcAddition: 0, faceValue: 0, profit: 0 }
    );
  };

  const directTotals = calculateTotals(directAirlineTickets);
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

  const TicketRow = ({ ticket, showSource = false }: { ticket: Ticket; showSource?: boolean }) => {
    const invoice = getInvoice(ticket.invoiceId || null);
    const isAgentSale = isAgent(ticket.customerId);
    const source = ticket.vendorId === "direct" || !ticket.vendorId ? "Direct" : "Vendor";
    
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
            <Badge variant={source === "Direct" ? "default" : "secondary"}>
              {source === "Direct" ? (
                <><Plane className="w-3 h-3 mr-1" /> Airlines</>
              ) : (
                <><Building2 className="w-3 h-3 mr-1" /> Vendor</>
              )}
            </Badge>
          </TableCell>
        )}
        <TableCell>
          <Badge variant={isAgentSale ? "outline" : "secondary"}>
            {isAgentSale ? (
              <><Briefcase className="w-3 h-3 mr-1" /> Agent</>
            ) : (
              <><Users className="w-3 h-3 mr-1" /> Customer</>
            )}
          </Badge>
        </TableCell>
        <TableCell>{getCustomerName(ticket.customerId)}</TableCell>
        <TableCell className="text-right font-mono">
          {ticket.vendorId === "direct" || !ticket.vendorId
            ? formatCurrency(ticket.airlinePrice || 0)
            : formatCurrency(ticket.vendorPrice || 0)}
        </TableCell>
        <TableCell className="text-right font-mono text-primary">
          {formatCurrency(ticket.middleClassPrice || 0)}
        </TableCell>
        <TableCell className="text-right font-mono font-semibold">
          {formatCurrency(ticket.faceValue)}
        </TableCell>
        <TableCell>
          {invoice ? (
            <Link href={`/invoices?view=${invoice.id}`}>
              <Button variant="ghost" size="sm" data-testid={`button-view-invoice-${ticket.id}`}>
                <FileText className="w-4 h-4 mr-1" />
                {invoice.invoiceNumber}
              </Button>
            </Link>
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
    totals: { count: number; vendorCost: number; airlineCost: number; mcAddition: number; faceValue: number; profit: number };
    type: "direct" | "vendor" | "agent";
  }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
            {type === "direct" ? "Airline Cost" : type === "vendor" ? "Vendor Cost" : "Our Price"}
          </div>
          <div className="text-2xl font-bold font-mono">
            {formatCurrency(type === "direct" ? totals.airlineCost : totals.vendorCost || totals.faceValue - totals.mcAddition)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            {type === "agent" ? "Agent Markup" : "MC Addition"}
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
            Total Revenue
          </div>
          <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
            {formatCurrency(totals.faceValue)}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Plane className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Direct Airlines</div>
                <div className="text-xl font-bold">{directAirlineTickets.length} Sales</div>
                <div className="text-sm font-mono text-blue-600 dark:text-blue-400">
                  {formatCurrency(directTotals.faceValue)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Agent Sales</div>
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

      <Tabs defaultValue="direct" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="direct" data-testid="tab-direct-airlines">
            <Plane className="w-4 h-4 mr-2" />
            Direct Airlines
          </TabsTrigger>
          <TabsTrigger value="agents" data-testid="tab-agents">
            <Briefcase className="w-4 h-4 mr-2" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="vendors" data-testid="tab-vendors">
            <Building2 className="w-4 h-4 mr-2" />
            Vendors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="w-5 h-5" />
                Direct Airlines Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SummaryCards totals={directTotals} type="direct" />
              
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Passenger</TableHead>
                      <TableHead>Airlines</TableHead>
                      <TableHead>Travel Date</TableHead>
                      <TableHead>Client Type</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead className="text-right">Airline Price</TableHead>
                      <TableHead className="text-right">MC Addition</TableHead>
                      <TableHead className="text-right">Face Value</TableHead>
                      <TableHead>Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {directAirlineTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No direct airline sales yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      directAirlineTickets.map((ticket) => (
                        <TicketRow key={ticket.id} ticket={ticket} />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Agent Sales
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
                      <TableHead className="text-right">Our Price</TableHead>
                      <TableHead className="text-right">Agent Markup</TableHead>
                      <TableHead className="text-right">Customer Price</TableHead>
                      <TableHead>Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          No agent sales yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      agentSales.map((ticket) => (
                        <TicketRow key={ticket.id} ticket={ticket} showSource />
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
                      <TableHead>Client Type</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead className="text-right">Vendor Price</TableHead>
                      <TableHead className="text-right">MC Addition</TableHead>
                      <TableHead className="text-right">Face Value</TableHead>
                      <TableHead>Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No vendor sales yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      vendorTickets.map((ticket) => (
                        <TicketRow key={ticket.id} ticket={ticket} />
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
