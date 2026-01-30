import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText,
  Search,
  Loader2,
  Banknote,
  CreditCard,
  Wallet,
  Eye,
  Printer,
  Users,
  Briefcase,
  Building2,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { format } from "date-fns";
import {
  type Invoice,
  type Customer,
  type Agent,
  type Vendor,
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

type FilterType = "client" | "agent" | "vendor";

export default function BillsPage() {
  const [activeTab, setActiveTab] = useState<FilterType>("client");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [selectedPartyId, setSelectedPartyId] = useState<string>("all");
  const { toast } = useToast();

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

  const markAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, { 
        status: "paid",
        paidAmount: invoices.find(i => i.id === invoiceId)?.total || 0
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice marked as paid",
        description: "The invoice status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  const getPartyName = (invoice: Invoice) => {
    if (invoice.customerType === "agent") {
      return agents.find(a => a.id === invoice.customerId)?.name || "Unknown Agent";
    }
    return customers.find(c => c.id === invoice.customerId)?.name || "Unknown Client";
  };

  const getVendorName = (id: string) => vendors.find(v => v.id === id)?.name || "Unknown";

  const partyList = useMemo(() => {
    switch (activeTab) {
      case "client":
        return customers.map(c => ({ id: c.id, name: c.name }));
      case "agent":
        return agents.map(a => ({ id: a.id, name: a.name }));
      case "vendor":
        return vendors.map(v => ({ id: v.id, name: v.name }));
      default:
        return [];
    }
  }, [activeTab, customers, agents, vendors]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" 
        || (statusFilter === "paid" && invoice.status === "paid")
        || (statusFilter === "unpaid" && invoice.status !== "paid" && invoice.status !== "cancelled");

      let matchesParty = true;
      if (activeTab === "client") {
        matchesParty = invoice.customerType === "customer";
        if (selectedPartyId !== "all") {
          matchesParty = matchesParty && invoice.customerId === selectedPartyId;
        }
      } else if (activeTab === "agent") {
        matchesParty = invoice.customerType === "agent";
        if (selectedPartyId !== "all") {
          matchesParty = matchesParty && invoice.customerId === selectedPartyId;
        }
      } else if (activeTab === "vendor") {
        if (selectedPartyId !== "all") {
          matchesParty = invoice.vendorId === selectedPartyId;
        }
      }

      return matchesSearch && matchesStatus && matchesParty;
    });
  }, [invoices, searchQuery, statusFilter, activeTab, selectedPartyId]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as FilterType);
    setSelectedPartyId("all");
  };

  const renderBillsTable = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-bills"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            data-testid="button-filter-all"
          >
            All
          </Button>
          <Button
            variant={statusFilter === "unpaid" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("unpaid")}
            data-testid="button-filter-unpaid"
          >
            Unpaid
          </Button>
          <Button
            variant={statusFilter === "paid" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("paid")}
            data-testid="button-filter-paid"
          >
            Paid
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter by {activeTab}:</span>
        <Select value={selectedPartyId} onValueChange={setSelectedPartyId}>
          <SelectTrigger className="w-[200px]" data-testid="select-party-filter">
            <SelectValue placeholder={`Select ${activeTab}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {activeTab}s</SelectItem>
            {partyList.map((party) => (
              <SelectItem key={party.id} value={party.id}>
                {party.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No bills found</p>
          <p className="text-sm">No invoices match the current filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>{activeTab === "vendor" ? "Client/Agent" : "Vendor"}</TableHead>
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
                  <TableRow key={invoice.id} data-testid={`row-bill-${invoice.id}`}>
                    <TableCell className="font-medium font-mono">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {activeTab === "vendor" ? getPartyName(invoice) : getVendorName(invoice.vendorId)}
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
                        {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => markAsPaidMutation.mutate(invoice.id)}
                            disabled={markAsPaidMutation.isPending}
                            data-testid={`button-pay-bill-${invoice.id}`}
                          >
                            {markAsPaidMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Pay Now"
                            )}
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(`/print-invoice/${invoice.id}`, '_blank')}
                          data-testid={`button-view-bill-${invoice.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            window.open(`/print-invoice/${invoice.id}`, '_blank');
                          }}
                          data-testid={`button-print-bill-${invoice.id}`}
                        >
                          <Printer className="w-4 h-4" />
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
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="lg:hidden" data-testid="button-sidebar-toggle" />
          <div>
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-bills-title">Bills</h1>
            <p className="text-sm text-muted-foreground">View and manage bills by party type</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="client" className="flex items-center gap-2" data-testid="tab-by-client">
                <Users className="w-4 h-4" />
                By Client
              </TabsTrigger>
              <TabsTrigger value="agent" className="flex items-center gap-2" data-testid="tab-by-agent">
                <Briefcase className="w-4 h-4" />
                By Agent
              </TabsTrigger>
              <TabsTrigger value="vendor" className="flex items-center gap-2" data-testid="tab-by-vendor">
                <Building2 className="w-4 h-4" />
                By Vendor
              </TabsTrigger>
            </TabsList>

            <TabsContent value="client">
              {renderBillsTable()}
            </TabsContent>
            <TabsContent value="agent">
              {renderBillsTable()}
            </TabsContent>
            <TabsContent value="vendor">
              {renderBillsTable()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
