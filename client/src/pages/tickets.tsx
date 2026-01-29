import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePin } from "@/lib/pin-context";
import { PinModal } from "@/components/pin-modal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Plus, Ticket as TicketIcon, Search, Loader2, Lock, Calendar, Plane, Upload, Download, UserPlus, Building2, Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { z } from "zod";
import type { Ticket, Customer, Vendor } from "@shared/schema";
import { airlines } from "@/lib/airlines";

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
  vendorId: z.string().optional(), // Optional - "direct" means direct from airline
  tripType: z.enum(["one_way", "round_trip"]).default("one_way"),
  ticketType: z.string().min(1, "Ticket type is required"),
  routeFrom: z.string().min(1, "Origin is required").max(4, "Max 4 characters"),
  routeTo: z.string().min(1, "Destination is required").max(4, "Max 4 characters"),
  airlines: z.string().min(1, "Airlines is required"),
  flightNumber: z.string().min(1, "Flight number is required"),
  flightTime: z.string().min(1, "Flight time is required"),
  travelDate: z.string().min(1, "Travel date is required"),
  returnDate: z.string().optional(),
  passengerName: z.string().min(1, "Passenger name is required"),
  faceValue: z.coerce.number().min(0, "Face value must be positive"),
  deductFromDeposit: z.boolean().default(false),
});

type CreateTicketForm = z.infer<typeof createTicketFormSchema>;

export default function TicketsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importData, setImportData] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerSelectOpen, setCustomerSelectOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedCustomerOption, setSelectedCustomerOption] = useState<"walkin" | string>("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [ticketSource, setTicketSource] = useState<"direct" | "vendor">("direct");
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

  const form = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketFormSchema),
    defaultValues: {
      customerId: "",
      vendorId: "",
      tripType: "one_way",
      ticketType: "",
      routeFrom: "",
      routeTo: "",
      airlines: "",
      flightNumber: "",
      flightTime: "",
      travelDate: "",
      returnDate: "",
      passengerName: "",
      faceValue: 0,
      deductFromDeposit: false,
    },
  });

  const watchTripType = form.watch("tripType");
  const watchVendorId = form.watch("vendorId");

  const watchCustomerId = form.watch("customerId");
  const watchDeductFromDeposit = form.watch("deductFromDeposit");
  const watchFaceValue = form.watch("faceValue");

  const selectedCustomer = customers.find((c) => c.id === watchCustomerId);
  const selectedVendor = vendors.find((v) => v.id === watchVendorId);
  const vendorAirlines = selectedVendor?.airlines || [];

  // Filter customers based on search query
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery) return customers;
    const query = customerSearchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query)
    );
  }, [customers, customerSearchQuery]);

  // Auto-fill passenger name when existing customer is selected
  useEffect(() => {
    if (selectedCustomerOption && selectedCustomerOption !== "walkin" && selectedCustomer) {
      form.setValue("passengerName", selectedCustomer.name);
    }
  }, [watchCustomerId, selectedCustomer, selectedCustomerOption, form]);

  const calculations = useMemo(() => {
    const faceValue = Number(watchFaceValue) || 0;
    let depositDeducted = 0;
    if (watchDeductFromDeposit && selectedCustomer) {
      depositDeducted = Math.min(selectedCustomer.depositBalance, faceValue);
    }
    const amountDue = faceValue - depositDeducted;
    return { faceValue, depositDeducted, amountDue };
  }, [watchFaceValue, watchDeductFromDeposit, selectedCustomer]);

  // Quick add customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; address?: string; email?: string }) => {
      const res = await apiRequest("POST", "/api/customers", data);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to add customer" }));
        throw new Error(errorData.error || "Failed to add customer");
      }
      return res.json();
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      form.setValue("customerId", newCustomer.id);
      form.setValue("passengerName", newCustomer.name);
      setSelectedCustomerOption(newCustomer.id);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerAddress("");
      setNewCustomerEmail("");
      toast({
        title: "Customer added",
        description: `${newCustomer.name} has been added and selected.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add customer",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/tickets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
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

  const handleAddNewCustomer = () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      toast({
        title: "Error",
        description: "Please enter customer name and phone",
        variant: "destructive",
      });
      return;
    }
    createCustomerMutation.mutate({
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      address: newCustomerAddress.trim() || undefined,
      email: newCustomerEmail.trim() || undefined,
    });
  };

  const bulkImportMutation = useMutation({
    mutationFn: async (tickets: any[]) => {
      const res = await apiRequest("POST", "/api/tickets/bulk-import", { tickets });
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setIsImportOpen(false);
      setImportData("");
      toast({
        title: "Import completed",
        description: `${result.success} tickets imported successfully. ${result.failed} failed.`,
      });
    },
    onError: () => {
      toast({
        title: "Import failed",
        description: "Failed to import tickets",
        variant: "destructive",
      });
    },
  });

  const filteredTickets = tickets.filter((ticket) =>
    ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.route.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImport = () => {
    try {
      const lines = importData.trim().split('\n');
      if (lines.length < 2) {
        toast({ title: "Invalid CSV", description: "CSV must have header and at least one data row", variant: "destructive" });
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const tickets = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const ticket: any = {};
        headers.forEach((header, i) => {
          if (header === 'facevalue') ticket.faceValue = parseFloat(values[i]) || 0;
          else if (header === 'customerid') ticket.customerId = values[i];
          else if (header === 'vendorid') ticket.vendorId = values[i];
          else if (header === 'triptype') ticket.tripType = values[i] || 'one_way';
          else if (header === 'tickettype') ticket.ticketType = values[i];
          else if (header === 'route') ticket.route = values[i];
          else if (header === 'airlines') ticket.airlines = values[i];
          else if (header === 'flightnumber') ticket.flightNumber = values[i];
          else if (header === 'flighttime') ticket.flightTime = values[i];
          else if (header === 'traveldate') ticket.travelDate = values[i];
          else if (header === 'passengername') ticket.passengerName = values[i];
        });
        ticket.issuedBy = session?.staffId || '';
        ticket.deductFromDeposit = false;
        ticket.depositDeducted = 0;
        return ticket;
      });
      
      bulkImportMutation.mutate(tickets);
    } catch {
      toast({ title: "Parse error", description: "Failed to parse CSV data", variant: "destructive" });
    }
  };

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      setIsPinModalOpen(true);
    } else {
      setTicketSource("direct");
      form.setValue("vendorId", "direct");
      form.setValue("airlines", "");
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

    // Calculate deposit deduction from submitted form data directly
    const faceValue = Number(data.faceValue) || 0;
    let depositDeducted = 0;
    if (data.deductFromDeposit && selectedCustomer) {
      depositDeducted = Math.min(selectedCustomer.depositBalance, faceValue);
    }

    // Normalize vendorId - ticketSource "direct" or empty vendorId means no vendor (direct from airline)
    const vendorId = ticketSource === "direct" || !data.vendorId ? undefined : data.vendorId;

    // Combine route fields
    const route = `${data.routeFrom} - ${data.routeTo}`;

    const ticketData = {
      ...data,
      route, // Combined route
      vendorId, // Normalized - undefined means direct from airline
      faceValue,
      depositDeducted,
      issuedBy: session.staffId,
    };

    createMutation.mutate(ticketData);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-tickets-title">Tickets</h1>
          <p className="text-sm text-muted-foreground">Issue and manage travel tickets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)} data-testid="button-import-tickets">
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={handleCreateClick} data-testid="button-issue-ticket">
            {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
            <Plus className="w-4 h-4 mr-2" />
            Issue Ticket
          </Button>
        </div>
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
                    <TableHead>Travel Date</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
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
                        {format(new Date(ticket.travelDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(ticket.faceValue)}
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

      <PinModal
        open={isPinModalOpen}
        onOpenChange={setIsPinModalOpen}
        onSuccess={() => setIsCreateOpen(true)}
      />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue Ticket</DialogTitle>
            <DialogDescription>
              Enter ticket details. The amount can be deducted from customer deposit.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-3">
                <FormLabel>Select Client</FormLabel>
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <Popover open={customerSelectOpen} onOpenChange={setCustomerSelectOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={customerSelectOpen}
                              className="w-full justify-between font-normal"
                              data-testid="select-ticket-customer"
                            >
                              {selectedCustomerOption === "walkin" ? (
                                <span className="flex items-center gap-2">
                                  <UserPlus className="w-4 h-4 text-primary" />
                                  Walk-in Customer
                                </span>
                              ) : selectedCustomer ? (
                                <span>{selectedCustomer.name} - {selectedCustomer.phone}</span>
                              ) : (
                                <span className="text-muted-foreground">Search clients...</span>
                              )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search clients..."
                              value={customerSearchQuery}
                              onValueChange={setCustomerSearchQuery}
                              data-testid="input-search-customer"
                            />
                            <CommandList>
                              <CommandGroup>
                                <CommandItem
                                  value="walkin"
                                  onSelect={() => {
                                    setSelectedCustomerOption("walkin");
                                    field.onChange("");
                                    setCustomerSelectOpen(false);
                                    setCustomerSearchQuery("");
                                  }}
                                  className="gap-2"
                                  data-testid="option-walkin-customer"
                                >
                                  <Check
                                    className={`h-4 w-4 ${
                                      selectedCustomerOption === "walkin" ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <UserPlus className="w-4 h-4 text-primary" />
                                  Walk-in Customer
                                </CommandItem>
                              </CommandGroup>
                              <CommandSeparator />
                              {filteredCustomers.length === 0 ? (
                                <CommandEmpty>No customers found.</CommandEmpty>
                              ) : (
                                <CommandGroup heading="Existing Customers">
                                  {filteredCustomers.map((customer) => (
                                    <CommandItem
                                      key={customer.id}
                                      value={customer.id}
                                      onSelect={() => {
                                        setSelectedCustomerOption(customer.id);
                                        field.onChange(customer.id);
                                        setCustomerSelectOpen(false);
                                        setCustomerSearchQuery("");
                                      }}
                                      className="gap-2"
                                      data-testid={`option-customer-${customer.id}`}
                                    >
                                      <Check
                                        className={`h-4 w-4 ${
                                          selectedCustomerOption === customer.id ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      <span>{customer.name} - {customer.phone}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedCustomerOption === "walkin" && (
                  <div className="space-y-3 p-4 border rounded-md bg-muted/30">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Name (as per passport) *</label>
                        <Input
                          placeholder="Enter name..."
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          data-testid="input-walkin-name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Phone Number *</label>
                        <div className="flex mt-1">
                          <span className="inline-flex items-center px-3 text-sm border border-r-0 rounded-l-md bg-muted text-muted-foreground">
                            +971
                          </span>
                          <Input
                            placeholder="501234567"
                            value={newCustomerPhone}
                            onChange={(e) => setNewCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                            maxLength={9}
                            data-testid="input-walkin-phone"
                            className="rounded-l-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Address</label>
                        <Input
                          placeholder="Enter address..."
                          value={newCustomerAddress}
                          onChange={(e) => setNewCustomerAddress(e.target.value)}
                          data-testid="input-walkin-address"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input
                          placeholder="email@example.com"
                          type="email"
                          value={newCustomerEmail}
                          onChange={(e) => setNewCustomerEmail(e.target.value)}
                          data-testid="input-walkin-email"
                          className="mt-1"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddNewCustomer}
                        disabled={createCustomerMutation.isPending}
                        className="w-full"
                        data-testid="button-save-walkin-customer"
                      >
                        {createCustomerMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Save Customer
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <FormLabel>Ticket Source</FormLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={ticketSource === "direct" ? "default" : "outline"}
                      className="flex-1 gap-2"
                      onClick={() => {
                        setTicketSource("direct");
                        form.setValue("vendorId", "direct");
                        form.setValue("airlines", "");
                      }}
                      data-testid="button-source-direct"
                    >
                      <Plane className="w-4 h-4" />
                      Direct from Airline
                    </Button>
                    <Button
                      type="button"
                      variant={ticketSource === "vendor" ? "default" : "outline"}
                      className="flex-1 gap-2"
                      onClick={() => {
                        setTicketSource("vendor");
                        form.setValue("vendorId", "");
                        form.setValue("airlines", "");
                      }}
                      data-testid="button-source-vendor"
                    >
                      <Building2 className="w-4 h-4" />
                      Via Vendor
                    </Button>
                  </div>
                  
                  {ticketSource === "vendor" && (
                    <FormField
                      control={form.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-ticket-vendor">
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vendors.map((vendor) => (
                                <SelectItem key={vendor.id} value={vendor.id}>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                    {vendor.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
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
                      <FormLabel>Class *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ticket-type">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="economy">Economy</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="first">First Class</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel>Route *</FormLabel>
                <div className="flex items-center gap-2 mt-2">
                  <FormField
                    control={form.control}
                    name="routeFrom"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="DXB"
                            value={field.value}
                            onChange={(e) => {
                              const upperValue = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
                              field.onChange(upperValue);
                            }}
                            className="font-mono text-center tracking-widest text-lg"
                            maxLength={4}
                            data-testid="input-route-from"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center justify-center w-12">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-primary rounded"></div>
                      <Plane className="h-5 w-5 text-primary" />
                      <div className="w-3 h-0.5 bg-primary rounded"></div>
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="routeTo"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="LHR"
                            value={field.value}
                            onChange={(e) => {
                              const upperValue = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
                              field.onChange(upperValue);
                            }}
                            className="font-mono text-center tracking-widest text-lg"
                            maxLength={4}
                            data-testid="input-route-to"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="airlines"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Airlines *</FormLabel>
                      {ticketSource === "direct" ? (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-airlines-direct">
                              <SelectValue placeholder="Select airline" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-80">
                            {airlines.map((airline) => (
                              <SelectItem key={airline.id} value={airline.name}>
                                <div className="flex items-center gap-2">
                                  <img 
                                    src={airline.logo} 
                                    alt={airline.name} 
                                    className="w-6 h-4 object-contain"
                                  />
                                  <span>{airline.name} ({airline.code})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : vendorAirlines.length > 0 ? (
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

              <FormField
                control={form.control}
                name="faceValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Face Value *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-face-value"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedCustomer && selectedCustomer.depositBalance > 0 && (
                <FormField
                  control={form.control}
                  name="deductFromDeposit"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Deduct from Deposit</FormLabel>
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
                        <span>Ticket Value</span>
                        <span className="font-mono">{formatCurrency(calculations.faceValue)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                        <span>Deposit Deducted</span>
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

      {/* Bulk Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Tickets</DialogTitle>
            <DialogDescription>
              Import multiple tickets from CSV data. Format: customerId, vendorId, passengerName, route, airlines, flightNumber, flightTime, travelDate, ticketType, faceValue
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
              <p className="font-semibold mb-1">Example CSV:</p>
              customerId,vendorId,passengerName,route,airlines,flightNumber,flightTime,travelDate,ticketType,faceValue
              <br />
              cust-1,vendor-1,John Doe,DXB-LON,Emirates,EK007,10:00,2024-03-15,Economy,1500
            </div>
            <Textarea
              placeholder="Paste CSV data here..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={10}
              className="font-mono text-sm"
              data-testid="textarea-import-data"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!importData.trim() || bulkImportMutation.isPending}
                data-testid="button-confirm-import"
              >
                {bulkImportMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import Tickets
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
