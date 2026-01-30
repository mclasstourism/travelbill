import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useRoute } from "wouter";
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

interface BillsPageProps {
  filterType: FilterType;
}

export default function BillsPage({ filterType }: BillsPageProps) {
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

  // Get the list of parties based on filter type
  const partyList = useMemo(() => {
    switch (filterType) {
      case "client":
        return customers.map(c => ({ id: c.id, name: c.name }));
      case "agent":
        return agents.map(a => ({ id: a.id, name: a.name }));
      case "vendor":
        return vendors.map(v => ({ id: v.id, name: v.name }));
      default:
        return [];
    }
  }, [filterType, customers, agents, vendors]);

  // Filter invoices based on filter type and selected party
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Filter by search
      const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by status
      const matchesStatus = statusFilter === "all" 
        || (statusFilter === "paid" && invoice.status === "paid")
        || (statusFilter === "unpaid" && invoice.status !== "paid" && invoice.status !== "cancelled");

      // Filter by party type and selected party
      let matchesParty = true;
      if (filterType === "client") {
        matchesParty = invoice.customerType === "customer";
        if (selectedPartyId !== "all") {
          matchesParty = matchesParty && invoice.customerId === selectedPartyId;
        }
      } else if (filterType === "agent") {
        matchesParty = invoice.customerType === "agent";
        if (selectedPartyId !== "all") {
          matchesParty = matchesParty && invoice.customerId === selectedPartyId;
        }
      } else if (filterType === "vendor") {
        if (selectedPartyId !== "all") {
          matchesParty = invoice.vendorId === selectedPartyId;
        }
      }

      return matchesSearch && matchesStatus && matchesParty;
    });
  }, [invoices, searchQuery, statusFilter, filterType, selectedPartyId]);

  const pageTitle = useMemo(() => {
    switch (filterType) {
      case "client":
        return "Bills by Client";
      case "agent":
        return "Bills by Agent";
      case "vendor":
        return "Bills by Vendor";
      default:
        return "Bills";
    }
  }, [filterType]);

  const PageIcon = useMemo(() => {
    switch (filterType) {
      case "client":
        return Users;
      case "agent":
        return Briefcase;
      case "vendor":
        return Building2;
      default:
        return FileText;
    }
  }, [filterType]);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="lg:hidden" data-testid="button-sidebar-toggle" />
          <div className="flex items-center gap-2">
            <PageIcon className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-bills-title">{pageTitle}</h1>
              <p className="text-sm text-muted-foreground">View and manage invoices</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
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
              <span className="text-sm text-muted-foreground">Filter by {filterType}:</span>
              <Select value={selectedPartyId} onValueChange={setSelectedPartyId}>
                <SelectTrigger className="w-[200px]" data-testid="select-party-filter">
                  <SelectValue placeholder={`Select ${filterType}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {filterType}s</SelectItem>
                  {partyList.map((party) => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <TableHead>{filterType === "vendor" ? "Client/Agent" : "Vendor"}</TableHead>
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
                          {filterType === "vendor" ? getPartyName(invoice) : getVendorName(invoice.vendorId)}
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
                                setTimeout(() => window.print(), 500);
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
        </CardContent>
      </Card>
    </div>
  );
}

export function BillsByClient() {
  return <BillsPage filterType="client" />;
}

export function BillsByAgent() {
  return <BillsPage filterType="agent" />;
}

export function BillsByVendor() {
  return <BillsPage filterType="vendor" />;
}
