import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePin } from "@/lib/pin-context";
import mcLogo from "@assets/image_1769840649122.png";
import html2pdf from "html2pdf.js";
import { PinModal } from "@/components/pin-modal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Ticket as TicketIcon, Search, Loader2, Lock, Calendar, Plane, Eye, Download } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { z } from "zod";
import type { Ticket, Customer, Vendor, Agent } from "@shared/schema";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "issued":
      return "default";
    case "used":
      return "secondary";
    case "cancelled":
    case "refunded":
      return "destructive";
    default:
      return "outline";
  }
}

const createTicketFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  tripType: z.enum(["one_way", "round_trip"]).default("one_way"),
  ticketType: z.string().min(1, "Ticket type is required"),
  route: z.string().min(1, "Route is required"),
  airlines: z.string().min(1, "Airlines is required"),
  flightNumber: z.string().min(1, "Flight number is required"),
  flightTime: z.string().min(1, "Flight time is required"),
  travelDate: z.string().min(1, "Travel date is required"),
  returnDate: z.string().optional(),
  passengerName: z.string().min(1, "Passenger name is required"),
  vendorCost: z.coerce.number().min(0, "Vendor cost is required"),
  mcAddition: z.coerce.number().min(0, "MC addition must be positive").default(0),
  deductFromDeposit: z.boolean().default(false),
  useVendorBalance: z.enum(["none", "credit", "deposit"]).default("none"),
});

type CreateTicketForm = z.infer<typeof createTicketFormSchema>;

export default function TicketsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const { toast } = useToast();
  const { isAuthenticated, session } = usePin();

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
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

  const form = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketFormSchema),
    defaultValues: {
      customerId: "",
      vendorId: "",
      tripType: "one_way",
      ticketType: "",
      route: "",
      airlines: "",
      flightNumber: "",
      flightTime: "",
      travelDate: "",
      returnDate: "",
      passengerName: "",
      vendorCost: 0,
      mcAddition: 0,
      deductFromDeposit: false,
      useVendorBalance: "none",
    },
  });

  const watchTripType = form.watch("tripType");
  const watchVendorId = form.watch("vendorId");
  const watchCustomerId = form.watch("customerId");
  const watchDeductFromDeposit = form.watch("deductFromDeposit");
  const watchVendorCost = form.watch("vendorCost");
  const watchMcAddition = form.watch("mcAddition");
  const watchUseVendorBalance = form.watch("useVendorBalance");

  const selectedCustomer = customers.find((c) => c.id === watchCustomerId);
  const selectedVendor = vendors.find((v) => v.id === watchVendorId);
  const vendorAirlines = selectedVendor?.airlines || [];

  const calculations = useMemo(() => {
    const vendorCost = Number(watchVendorCost) || 0;
    const mcAddition = Number(watchMcAddition) || 0;
    const faceValue = vendorCost + mcAddition; // Customer Price = Vendor Cost + MC Addition
    
    let depositDeducted = 0;
    if (watchDeductFromDeposit && selectedCustomer) {
      depositDeducted = Math.min(selectedCustomer.depositBalance, faceValue);
    }
    
    // Calculate vendor balance deduction
    let vendorBalanceDeducted = 0;
    if (watchUseVendorBalance === "credit" && selectedVendor) {
      vendorBalanceDeducted = Math.min(selectedVendor.creditBalance, vendorCost);
    } else if (watchUseVendorBalance === "deposit" && selectedVendor) {
      vendorBalanceDeducted = Math.min(selectedVendor.depositBalance, vendorCost);
    }
    
    const amountDue = faceValue - depositDeducted;
    return { faceValue, vendorCost, mcAddition, depositDeducted, amountDue, vendorBalanceDeducted };
  }, [watchVendorCost, watchMcAddition, watchDeductFromDeposit, selectedCustomer, watchUseVendorBalance, selectedVendor]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/tickets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deposit-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Ticket issued",
        description: "The ticket has been issued successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to issue ticket",
        variant: "destructive",
      });
    },
  });

  const filteredTickets = tickets.filter((ticket) =>
    ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.route.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      setIsPinModalOpen(true);
    } else {
      setIsCreateOpen(true);
    }
  };

  const onSubmit = (data: CreateTicketForm) => {
    if (!isAuthenticated || !session) {
      toast({
        title: "Authentication required",
        description: "Please authenticate with PIN first",
        variant: "destructive",
      });
      return;
    }

    const vendorCost = Number(data.vendorCost) || 0;
    const mcAddition = Number(data.mcAddition) || 0;
    const faceValue = vendorCost + mcAddition; // Customer Price = Vendor Cost + MC Addition
    
    let depositDeducted = 0;
    if (data.deductFromDeposit && selectedCustomer) {
      depositDeducted = Math.min(selectedCustomer.depositBalance, faceValue);
    }

    // Calculate vendor balance deduction
    let vendorBalanceDeducted = 0;
    if (data.useVendorBalance === "credit" && selectedVendor) {
      vendorBalanceDeducted = Math.min(selectedVendor.creditBalance, vendorCost);
    } else if (data.useVendorBalance === "deposit" && selectedVendor) {
      vendorBalanceDeducted = Math.min(selectedVendor.depositBalance, vendorCost);
    }

    const ticketData = {
      ...data,
      faceValue,
      vendorCost,
      additionalCost: mcAddition,
      depositDeducted,
      useVendorBalance: data.useVendorBalance,
      vendorBalanceDeducted,
      issuedBy: session.billCreatorId,
    };

    createMutation.mutate(ticketData);
  };

  const handleDownloadPdf = (ticket: Ticket) => {
    const customerName = customers.find(c => c.id === ticket.customerId)?.name || 
                         agents.find(a => a.id === ticket.customerId)?.name || "N/A";
    
    // Create a temporary container for the PDF content
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 16px;">
          <img src="${mcLogo}" alt="MCT - Tourism Organizers" style="height: 64px; margin: 0 auto; display: block;" />
        </div>
        <div style="text-align: center; margin-bottom: 16px;">
          <span style="font-size: 0.75rem; color: #6b7280;">TICKET NUMBER</span>
          <p style="font-family: monospace; font-size: 1.25rem; font-weight: bold; margin: 4px 0 0 0;">${ticket.ticketNumber}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <span style="font-size: 0.75rem; color: #6b7280;">PASSENGER NAME</span>
              <p style="font-weight: 600; margin: 4px 0 0 0;">${ticket.passengerName}</p>
            </div>
            <div>
              <span style="font-size: 0.75rem; color: #6b7280;">TICKET TYPE</span>
              <p style="font-weight: 600; text-transform: capitalize; margin: 4px 0 0 0;">${ticket.ticketType || "Economy"}</p>
            </div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
            <span style="font-size: 0.75rem; color: #6b7280;">ROUTE</span>
            <p style="font-weight: 600; margin: 4px 0 0 0;">${ticket.route}</p>
          </div>
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
            <span style="font-size: 0.75rem; color: #6b7280;">TRAVEL DATE</span>
            <p style="font-weight: 600; margin: 4px 0 0 0;">${format(new Date(ticket.travelDate), "MMM d, yyyy")}</p>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; font-size: 0.875rem;">
          <div>
            <span style="font-size: 0.75rem; color: #6b7280;">CUSTOMER</span>
            <p style="margin: 4px 0 0 0;">${customerName}</p>
          </div>
        </div>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600;">Ticket Value</span>
            <span style="font-size: 1.5rem; font-weight: bold; color: #2563eb; font-family: monospace;">AED ${ticket.faceValue.toLocaleString("en-AE", { minimumFractionDigits: 2 })}</span>
          </div>
          ${ticket.depositDeducted > 0 ? `
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; color: #4b5563; margin-top: 8px;">
            <span>Customer Deposit Deducted</span>
            <span style="font-family: monospace;">AED ${ticket.depositDeducted.toLocaleString("en-AE", { minimumFractionDigits: 2 })}</span>
          </div>
          ` : ''}
        </div>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px; font-size: 0.75rem; color: #6b7280;">
          <div style="display: flex; justify-content: space-between;">
            <span>Issued: ${format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
            <span>Status: ${ticket.status}</span>
          </div>
        </div>
      </div>
    `;
    
    const options = {
      margin: 10,
      filename: `${ticket.ticketNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
    
    html2pdf().set(options).from(container).save();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-tickets-title">Tickets</h1>
            <p className="text-sm text-muted-foreground">Issue and manage travel tickets</p>
          </div>
        </div>
        <Button onClick={handleCreateClick} data-testid="button-issue-ticket">
          {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
          <Plus className="w-4 h-4 mr-2" />
          Issue Ticket
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-tickets"
              />
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
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TicketIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No tickets found</p>
              <p className="text-sm">Issue your first ticket to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Date Issued</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                      <TableCell className="font-medium font-mono">
                        {ticket.ticketNumber}
                      </TableCell>
                      <TableCell>{ticket.passengerName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-muted-foreground" />
                          {ticket.route}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(ticket.faceValue)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(ticket.status)}>
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewTicket(ticket)}
                            data-testid={`button-view-ticket-${ticket.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadPdf(ticket)}
                            data-testid={`button-download-ticket-${ticket.id}`}
                          >
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

      <PinModal
        open={isPinModalOpen}
        onOpenChange={setIsPinModalOpen}
        onSuccess={() => setIsCreateOpen(true)}
      />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue Ticket</DialogTitle>
            <DialogDescription>
              Enter ticket details. The amount can be deducted from customer deposit.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ticket-customer">
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
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
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ticket-vendor">
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="passengerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passenger Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Full name as on ID"
                        {...field}
                        data-testid="input-passenger-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tripType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-trip-type">
                            <SelectValue placeholder="Select trip type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="one_way">One Way</SelectItem>
                          <SelectItem value="round_trip">Round Trip</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ticketType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticket Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ticket-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="first_class">First Class</SelectItem>
                          <SelectItem value="business_class">Business Class</SelectItem>
                          <SelectItem value="economy">Economy</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="route"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Route *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., DXB - LHR"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        className="uppercase"
                        data-testid="input-route"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="airlines"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Airlines *</FormLabel>
                      {vendorAirlines.length > 0 ? (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-airlines">
                              <SelectValue placeholder="Select airline" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vendorAirlines.map((airline) => (
                              <SelectItem key={airline.id || airline.name} value={airline.name}>
                                {airline.code ? `${airline.name} (${airline.code})` : airline.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <FormControl>
                          <Input
                            placeholder="e.g., Emirates"
                            {...field}
                            data-testid="input-airlines"
                          />
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="flightNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flight Number *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., EK 203"
                          {...field}
                          data-testid="input-flight-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="travelDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Travel Date *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="date"
                            className="pl-9"
                            min={new Date().toISOString().split('T')[0]}
                            {...field}
                            data-testid="input-travel-date"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="flightTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flight Time (24hr) *</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          data-testid="input-flight-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {watchTripType === "round_trip" && (
                <FormField
                  control={form.control}
                  name="returnDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Date *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="date"
                            className="pl-9"
                            min={new Date().toISOString().split('T')[0]}
                            {...field}
                            data-testid="input-return-date"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vendorCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Cost (AED) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="input-vendor-cost"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">What we pay to vendor</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mcAddition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MC Addition (AED)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="input-mc-addition"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Middle Class markup</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Customer Price (auto-calculated) */}
              {calculations.faceValue > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Customer Price (Face Value)
                    </span>
                    <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-300">
                      {formatCurrency(calculations.faceValue)}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    = Vendor Cost ({formatCurrency(calculations.vendorCost)}) + MC Addition ({formatCurrency(calculations.mcAddition)})
                  </p>
                </div>
              )}

              {/* Customer deposit deduction */}
              {selectedCustomer && selectedCustomer.depositBalance > 0 && (
                <FormField
                  control={form.control}
                  name="deductFromDeposit"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Deduct from Customer Deposit</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Available: {formatCurrency(selectedCustomer.depositBalance)}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-deduct-deposit"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {calculations.depositDeducted > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Customer Price</span>
                        <span className="font-mono">{formatCurrency(calculations.faceValue)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                        <span>Customer Deposit Deducted</span>
                        <span className="font-mono">-{formatCurrency(calculations.depositDeducted)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold border-t pt-2">
                        <span>Amount Due</span>
                        <span className="font-mono">{formatCurrency(calculations.amountDue)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Vendor Balance Deduction Choice */}
              {calculations.vendorCost > 0 && selectedVendor && (
                <FormField
                  control={form.control}
                  name="useVendorBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deduct Vendor Cost From</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vendor-balance">
                            <SelectValue placeholder="Select deduction source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None - Add to Vendor Credit</SelectItem>
                          <SelectItem value="credit">
                            Vendor Credit (Available: {formatCurrency(selectedVendor.creditBalance)})
                          </SelectItem>
                          <SelectItem value="deposit">
                            My Deposit with Vendor (Available: {formatCurrency(selectedVendor.depositBalance)})
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Vendor cost summary */}
              {calculations.vendorCost > 0 && (
                <Card className="bg-orange-50 dark:bg-orange-900/20">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between text-sm text-orange-700 dark:text-orange-400">
                      <span>Vendor Cost</span>
                      <span className="font-mono">{formatCurrency(calculations.vendorCost)}</span>
                    </div>
                    {watchUseVendorBalance === "none" && (
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        This amount will be added to vendor credit when ticket is issued.
                      </p>
                    )}
                    {watchUseVendorBalance === "credit" && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {formatCurrency(calculations.vendorBalanceDeducted)} will be deducted from vendor credit.
                      </p>
                    )}
                    {watchUseVendorBalance === "deposit" && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {formatCurrency(calculations.vendorBalanceDeducted)} will be deducted from your deposit with vendor.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
                  data-testid="button-cancel-ticket"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-save-ticket"
                >
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Issue Ticket
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Ticket Dialog */}
      <Dialog open={!!viewTicket} onOpenChange={(open) => !open && setViewTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TicketIcon className="w-5 h-5" />
              Ticket Details
            </DialogTitle>
            <DialogDescription>
              View and print ticket information
            </DialogDescription>
          </DialogHeader>
          {viewTicket && (
            <div className="space-y-4">
              {/* Printable Ticket */}
              <div id="printable-ticket" className="bg-white text-black p-6 rounded-lg border">
                {/* Header with Logo */}
                <div className="text-center border-b pb-4 mb-4">
                  <img src={mcLogo} alt="MCT - Tourism Organizers" className="h-16 mx-auto" />
                </div>

                {/* Ticket Number */}
                <div className="text-center mb-4">
                  <span className="text-xs text-gray-500">TICKET NUMBER</span>
                  <p className="font-mono text-xl font-bold">{viewTicket.ticketNumber}</p>
                </div>

                {/* Passenger Info */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">PASSENGER NAME</span>
                      <p className="font-semibold">{viewTicket.passengerName}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">TICKET TYPE</span>
                      <p className="font-semibold capitalize">{viewTicket.ticketType || "Economy"}</p>
                    </div>
                  </div>
                </div>

                {/* Flight Details */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="border rounded-lg p-3">
                    <span className="text-xs text-gray-500">ROUTE</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Plane className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">{viewTicket.route}</span>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <span className="text-xs text-gray-500">TRAVEL DATE</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">{format(new Date(viewTicket.travelDate), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>

                {/* Customer info - visible on print */}
                <div className="mb-4 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">CUSTOMER</span>
                    <p>
                      {customers.find(c => c.id === viewTicket.customerId)?.name || "N/A"}
                    </p>
                  </div>
                </div>
                
                {/* Vendor info - internal only, NOT shown on print */}
                <div className="mb-4 text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded" data-no-print="true">
                  <span className="text-xs text-gray-500">VENDOR (Internal Only)</span>
                  <p>{vendors.find(v => v.id === viewTicket.vendorId)?.name || "N/A"}</p>
                </div>

                {/* Value - Customer sees face value */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Ticket Value ({viewTicket.customerType === "agent" ? "Agent" : "Customer"} Price)</span>
                    <span className="text-2xl font-bold text-blue-600 font-mono">
                      AED {viewTicket.faceValue.toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {viewTicket.depositDeducted > 0 && (
                    <div className="flex justify-between items-center text-sm text-gray-600 mt-2">
                      <span>Customer Deposit Deducted</span>
                      <span className="font-mono">
                        AED {viewTicket.depositDeducted.toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Cost Breakdown - Internal Use Only (Not printed) */}
                <div className="border-t pt-4 mt-4 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg" data-no-print="true">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-3">Cost Breakdown (Internal Use Only)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-700 dark:text-amber-300">Vendor Cost</span>
                      <span className="font-mono font-semibold text-amber-800 dark:text-amber-200">
                        AED {(viewTicket.vendorCost || 0).toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-amber-700 dark:text-amber-300">Customer Price (Face Value)</span>
                      <span className="font-mono font-semibold text-amber-800 dark:text-amber-200">
                        AED {viewTicket.faceValue.toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-amber-300 dark:border-amber-600 pt-2">
                      <span className="text-amber-700 dark:text-amber-300 font-semibold">Profit Margin</span>
                      <span className={`font-mono font-bold ${(viewTicket.faceValue - (viewTicket.vendorCost || 0)) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        AED {(viewTicket.faceValue - (viewTicket.vendorCost || 0)).toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Issue Details */}
                <div className="border-t pt-4 mt-4 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Issued: {format(new Date(viewTicket.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                    <span>Status: <Badge variant={getStatusBadgeVariant(viewTicket.status)} className="ml-1">{viewTicket.status}</Badge></span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewTicket(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
