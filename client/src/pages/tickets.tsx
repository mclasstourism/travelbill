import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePin } from "@/lib/pin-context";
import { PinModal } from "@/components/pin-modal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Ticket as TicketIcon, Search, Loader2, Lock, Calendar, Plane, Upload, Download, UserPlus, Building2, Check, ChevronsUpDown, Edit, Image, Eye, X, Users, FileText, Printer, Briefcase } from "lucide-react";
import companyLogo from "@assets/Updated_Logo_1769092146053.png";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
import type { Ticket, Customer, Vendor, Agent } from "@shared/schema";
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
    case "approved":
    case "issued":
      return "default";
    case "processing":
      return "secondary";
    case "pending":
      return "outline";
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
  ticketNumber: z.string().min(1, "Ticket number is required"),
  pnr: z.string().optional(),
  customerId: z.string().min(1, "Customer is required"),
  vendorId: z.string().optional(), // Optional - "direct" means direct from airline
  tripType: z.enum(["one_way", "round_trip"]).default("one_way"),
  seatClass: z.enum(["economy", "business", "first"]).default("economy"),
  routeFrom: z.string().min(1, "Origin is required").max(4, "Max 4 characters"),
  routeTo: z.string().min(1, "Destination is required").max(4, "Max 4 characters"),
  quantity: z.coerce.number().min(1, "At least 1 ticket required").default(1),
  airlines: z.string().min(1, "Airlines is required"),
  flightNumber: z.string().optional(), // Optional at initial booking
  travelDate: z.string().min(1, "Travel date is required"),
  returnDate: z.string().optional(),
  passengerName: z.string().min(1, "Lead passenger name is required"),
  vendorPrice: z.coerce.number().min(0).default(0),
  airlinePrice: z.coerce.number().min(0).default(0),
  middleClassPrice: z.coerce.number().min(0).default(0),
  faceValue: z.coerce.number().min(0, "Face value must be positive"),
  deductFromDeposit: z.boolean().default(false),
});

type CreateTicketForm = z.infer<typeof createTicketFormSchema>;

export default function TicketsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [editStatus, setEditStatus] = useState<string>("pending");
  const [editTicketNumber, setEditTicketNumber] = useState<string>("");
  const [eticketFile, setEticketFile] = useState<File | null>(null);
  const [eticketPreview, setEticketPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
  const [clientType, setClientType] = useState<"customer" | "agent">("customer");
  const [ticketNumbersList, setTicketNumbersList] = useState<string[]>([""]);
  const [createEticketFile, setCreateEticketFile] = useState<File | null>(null);
  const [createEticketPreview, setCreateEticketPreview] = useState<string | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceTicket, setInvoiceTicket] = useState<Ticket | null>(null);
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
      ticketNumber: "",
      pnr: "",
      customerId: "",
      vendorId: "",
      tripType: "one_way",
      seatClass: "economy",
      routeFrom: "",
      routeTo: "",
      airlines: "",
      flightNumber: "",
      quantity: 1,
      travelDate: "",
      returnDate: "",
      passengerName: "",
      vendorPrice: 0,
      airlinePrice: 0,
      middleClassPrice: 0,
      faceValue: 0,
      deductFromDeposit: false,
    },
  });

  const watchTripType = form.watch("tripType");
  const watchVendorId = form.watch("vendorId");

  const watchCustomerId = form.watch("customerId");
  const watchDeductFromDeposit = form.watch("deductFromDeposit");
  const watchFaceValue = form.watch("faceValue");
  const watchVendorPrice = form.watch("vendorPrice");
  const watchAirlinePrice = form.watch("airlinePrice");
  const watchMiddleClassPrice = form.watch("middleClassPrice");
  const watchQuantity = form.watch("quantity");

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

  // Calculate passenger count from quantity field
  const passengerCount = Number(watchQuantity) || 1;

  // Sync ticket numbers list with quantity
  useEffect(() => {
    setTicketNumbersList(prev => {
      if (passengerCount > prev.length) {
        // Add empty entries for new passengers
        return [...prev, ...Array(passengerCount - prev.length).fill("")];
      } else if (passengerCount < prev.length) {
        // Trim excess entries
        return prev.slice(0, passengerCount);
      }
      return prev;
    });
  }, [passengerCount]);

  // Auto-calculate face value based on ticket source (per person × quantity)
  useEffect(() => {
    const middleClass = Number(watchMiddleClassPrice) || 0;
    let basePrice = 0;
    if (ticketSource === "direct") {
      basePrice = Number(watchAirlinePrice) || 0;
    } else {
      // For vendor or agent sources, use vendor/agent price
      basePrice = Number(watchVendorPrice) || 0;
    }
    const perPersonPrice = basePrice + middleClass;
    const total = perPersonPrice * passengerCount;
    form.setValue("faceValue", total);
  }, [ticketSource, watchVendorPrice, watchAirlinePrice, watchMiddleClassPrice, passengerCount, form]);

  const calculations = useMemo(() => {
    const faceValue = Number(watchFaceValue) || 0;
    const perPersonPrice = passengerCount > 0 ? faceValue / passengerCount : faceValue;
    let depositDeducted = 0;
    if (watchDeductFromDeposit && selectedCustomer) {
      depositDeducted = Math.min(selectedCustomer.depositBalance, faceValue);
    }
    const amountDue = faceValue - depositDeducted;
    return { faceValue, perPersonPrice, depositDeducted, amountDue };
  }, [watchFaceValue, watchDeductFromDeposit, selectedCustomer, passengerCount]);

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
      setCreateEticketFile(null);
      setCreateEticketPreview(null);
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

  const updateTicketMutation = useMutation({
    mutationFn: async (data: { id: string; status?: string; ticketNumber?: string; eticketImage?: string }) => {
      const res = await apiRequest("PATCH", `/api/tickets/${data.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setIsEditOpen(false);
      setEditingTicket(null);
      setEticketFile(null);
      setEticketPreview(null);
      toast({
        title: "Ticket updated",
        description: "The ticket has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ticket",
        variant: "destructive",
      });
    },
  });

  const handleEditTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setEditStatus(ticket.status);
    setEditTicketNumber(ticket.ticketNumber || "");
    setEticketPreview(ticket.eticketImage || null);
    setEticketFile(null);
    setIsEditOpen(true);
  };

  const handleEticketFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEticketFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEticketPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTicket = async () => {
    if (!editingTicket) return;
    
    setIsUploading(true);
    try {
      let eticketImageUrl = editingTicket.eticketImage;
      
      // Upload e-ticket image if new file selected using presigned URL flow
      if (eticketFile) {
        // Step 1: Request presigned URL from backend
        const urlRes = await fetch("/api/uploads/request-url", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
          body: JSON.stringify({
            name: eticketFile.name,
            size: eticketFile.size,
            contentType: eticketFile.type,
          }),
        });
        
        if (!urlRes.ok) {
          throw new Error("Failed to get upload URL");
        }
        
        const { uploadURL, objectPath } = await urlRes.json();
        
        // Step 2: Upload file directly to presigned URL
        const uploadRes = await fetch(uploadURL, {
          method: "PUT",
          body: eticketFile,
          headers: { "Content-Type": eticketFile.type },
        });
        
        if (!uploadRes.ok) {
          throw new Error("Failed to upload file");
        }
        
        // Use the objectPath as the URL to store
        eticketImageUrl = objectPath;
      }
      
      updateTicketMutation.mutate({
        id: editingTicket.id,
        status: editStatus,
        ticketNumber: editTicketNumber || undefined,
        eticketImage: eticketImageUrl,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload e-ticket image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) =>
    (ticket.ticketNumber?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
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
          else if (header === 'route') ticket.route = values[i];
          else if (header === 'airlines') ticket.airlines = values[i];
          else if (header === 'flightnumber') ticket.flightNumber = values[i];
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

  const onSubmit = async (data: CreateTicketForm) => {
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

    // Handle e-ticket image upload
    let eticketImageUrl: string | undefined;
    if (createEticketFile) {
      try {
        const formData = new FormData();
        formData.append("file", createEticketFile);
        formData.append("directory", ".private/etickets");
        
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          eticketImageUrl = uploadResult.url || uploadResult.objectPath;
        }
      } catch (error) {
        console.error("Failed to upload e-ticket:", error);
      }
    }

    // Filter out empty ticket numbers and use the list
    const validTicketNumbers = ticketNumbersList.filter(t => t.trim() !== "");
    
    const ticketData = {
      ...data,
      route, // Combined route
      vendorId, // Normalized - undefined means direct from airline
      faceValue,
      depositDeducted,
      passengerCount: Number(data.quantity) || 1,
      issuedBy: session.staffId,
      eticketImage: eticketImageUrl,
      ticketNumbers: validTicketNumbers,
      ticketNumber: validTicketNumbers[0] || "", // Also set first ticket number for legacy field
    };

    createMutation.mutate(ticketData);
    setCreateEticketFile(null);
    setCreateEticketPreview(null);
    setTicketNumbersList([""]); // Reset ticket numbers list
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="lg:hidden" data-testid="button-sidebar-toggle" />
          <div>
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-tickets-title">Tickets</h1>
            <p className="text-sm text-muted-foreground">Issue and manage travel tickets</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setIsImportOpen(true)} className="w-full sm:w-auto" data-testid="button-import-tickets">
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={handleCreateClick} className="w-full sm:w-auto" data-testid="button-issue-ticket">
            {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
            <Plus className="w-4 h-4 mr-2" />
            Issue Ticket
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 sm:max-w-sm">
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
            <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="border rounded-lg p-4 space-y-3" data-testid={`card-ticket-${ticket.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-0.5 mb-1">
                        {(ticket.ticketNumbers && ticket.ticketNumbers.length > 0) ? (
                          ticket.ticketNumbers.map((tNum: string, idx: number) => (
                            <span key={idx} className="font-mono text-sm font-medium">{tNum}</span>
                          ))
                        ) : ticket.ticketNumber ? (
                          <span className="font-mono text-sm font-medium">{ticket.ticketNumber}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">No ticket #</span>
                        )}
                      </div>
                      <p className="font-medium truncate">{ticket.passengerName}</p>
                      {(ticket.passengerCount || 1) > 1 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          +{(ticket.passengerCount || 1) - 1} more passengers
                        </span>
                      )}
                    </div>
                    <Badge variant={ticket.vendorId ? "secondary" : "outline"} className="shrink-0">
                      {ticket.vendorId ? "Vendor" : "Airline"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Plane className="w-4 h-4" />
                    <span>{ticket.route}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(ticket.travelDate), "MMM d, yyyy")}</span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Face Value: </span>
                      <span className="font-mono font-semibold text-primary">{formatCurrency(ticket.faceValue)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {ticket.eticketImage && (
                        <Badge variant="default" className="gap-1">
                          <Image className="w-3 h-3" />
                          E-Ticket
                        </Badge>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setInvoiceTicket(ticket);
                          setIsInvoiceOpen(true);
                        }}
                        data-testid={`button-view-invoice-mobile-${ticket.id}`}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Travel Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">MC Addition</TableHead>
                    <TableHead className="text-right">Face Value</TableHead>
                    <TableHead>E-Ticket</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-0.5">
                          {(ticket.ticketNumbers && ticket.ticketNumbers.length > 0) ? (
                            ticket.ticketNumbers.map((tNum: string, idx: number) => (
                              <span key={idx} className="font-mono text-sm">{tNum}</span>
                            ))
                          ) : ticket.ticketNumber ? (
                            <span className="font-mono text-sm">{ticket.ticketNumber}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Pending</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{ticket.passengerName}</span>
                          {(ticket.passengerCount || 1) > 1 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              +{(ticket.passengerCount || 1) - 1} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-muted-foreground" />
                          {ticket.route}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(ticket.travelDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ticket.vendorId ? "secondary" : "outline"}>
                          {ticket.vendorId ? "Vendor" : "Airline"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(ticket.vendorId ? (ticket.vendorPrice || 0) : (ticket.airlinePrice || 0))}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(ticket.middleClassPrice || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-primary">
                        {formatCurrency(ticket.faceValue)}
                      </TableCell>
                      <TableCell>
                        {ticket.eticketImage ? (
                          <Badge variant="default" className="gap-1">
                            <Image className="w-3 h-3" />
                            Attached
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <X className="w-3 h-3" />
                            None
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {ticket.status === "issued" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setInvoiceTicket(ticket);
                                setIsInvoiceOpen(true);
                              }}
                              data-testid={`button-invoice-ticket-${ticket.id}`}
                              title="View Invoice"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditTicket(ticket)}
                            data-testid={`button-edit-ticket-${ticket.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
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
              <FormField
                control={form.control}
                name="pnr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PNR / Booking Ref</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., ABC123"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        maxLength={6}
                        className="uppercase font-mono"
                        data-testid="input-pnr"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">6-character booking reference</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How many tickets in this PNR?</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        {...field}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          field.onChange(Math.max(1, val));
                        }}
                        data-testid="input-quantity"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Number of passengers/tickets being booked</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel>Select Client</FormLabel>
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant={clientType === "customer" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setClientType("customer");
                      form.setValue("customerId", "");
                      setSelectedCustomerOption("");
                    }}
                    data-testid="button-client-customer"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Customer
                  </Button>
                  <Button
                    type="button"
                    variant={clientType === "agent" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setClientType("agent");
                      form.setValue("customerId", "");
                      setSelectedCustomerOption("");
                    }}
                    data-testid="button-client-agent"
                  >
                    <Briefcase className="w-4 h-4 mr-1" />
                    Agent
                  </Button>
                </div>
                
                {clientType === "customer" ? (
                <>
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
                                <span className="text-muted-foreground">Search customers...</span>
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
                </>
                ) : (
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-ticket-agent">
                              <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {agents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                <div className="flex items-center gap-2">
                                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                                  {agent.name}
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

              <div className="space-y-3">
                <FormLabel>Ticket Source</FormLabel>
                  <Select 
                    value={ticketSource} 
                    onValueChange={(value: "direct" | "vendor") => {
                      setTicketSource(value);
                      form.setValue("vendorId", value === "direct" ? "direct" : "");
                      form.setValue("airlines", "");
                      if (value === "direct") {
                        form.setValue("vendorPrice", 0);
                      } else {
                        form.setValue("airlinePrice", 0);
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-ticket-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-muted-foreground" />
                          Airlines (direct)
                        </div>
                      </SelectItem>
                      <SelectItem value="vendor">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          Vendor
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {ticketSource === "vendor" && (
                    <FormField
                      control={form.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem className="mt-3">
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

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="passengerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Passenger Name *</FormLabel>
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
              </div>

              {/* Ticket Numbers Section - One per passenger */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Ticket Numbers * ({passengerCount} {passengerCount === 1 ? 'ticket' : 'tickets'})
                </Label>
                <div className="space-y-2">
                  {ticketNumbersList.map((ticketNum, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                      <Input
                        placeholder={`Ticket #${index + 1}`}
                        value={ticketNum}
                        onChange={(e) => {
                          const newList = [...ticketNumbersList];
                          newList[index] = e.target.value;
                          setTicketNumbersList(newList);
                        }}
                        className="font-mono flex-1"
                        data-testid={`input-ticket-number-${index}`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter ticket number for each passenger in this booking
                </p>
              </div>

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
                  name="seatClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-seat-class">
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

              {/* Pricing Section */}
              <div className="grid grid-cols-2 gap-3">
                {ticketSource === "vendor" ? (
                  <FormField
                    control={form.control}
                    name="vendorPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price/Person (AED)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            defaultValue=""
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              field.onChange(val);
                            }}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              field.onChange(val);
                            }}
                            data-testid="input-vendor-price-inline"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="airlinePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price/Person (AED)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            defaultValue=""
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              field.onChange(val);
                            }}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              field.onChange(val);
                            }}
                            data-testid="input-airline-price-inline"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="middleClassPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MC Addition (AED)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          defaultValue=""
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            field.onChange(val);
                          }}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            field.onChange(val);
                          }}
                          data-testid="input-mc-price-inline"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Total Price Summary */}
              <div className="p-3 bg-primary/10 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-medium">{passengerCount} × AED {calculations.perPersonPrice.toFixed(2)}</span>
                  </div>
                  <span className="text-lg font-bold text-primary font-mono" data-testid="text-total-price">
                    AED {calculations.faceValue.toFixed(2)}
                  </span>
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
                            min={form.watch("travelDate") || new Date().toISOString().split('T')[0]}
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

              <div className="space-y-2">
                <Label>E-Ticket Image</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCreateEticketFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCreateEticketPreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="flex-1"
                    data-testid="input-eticket-upload"
                  />
                  {createEticketPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCreateEticketFile(null);
                        setCreateEticketPreview(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {createEticketPreview && (
                  <div className="mt-2 border rounded-md overflow-hidden">
                    <img
                      src={createEticketPreview}
                      alt="E-ticket preview"
                      className="max-h-40 object-contain mx-auto"
                    />
                  </div>
                )}
              </div>

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
                  onClick={() => {
                    setIsCreateOpen(false);
                    setCreateEticketFile(null);
                    setCreateEticketPreview(null);
                  }}
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
              Import multiple tickets from CSV data. Format: customerId, vendorId, passengerName, route, airlines, flightNumber, travelDate, faceValue
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
              <p className="font-semibold mb-1">Example CSV:</p>
              customerId,vendorId,passengerName,route,airlines,flightNumber,travelDate,faceValue
              <br />
              cust-1,vendor-1,John Doe,DXB-LON,Emirates,EK007,2024-03-15,1500
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

      {/* Edit Ticket Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
            <DialogDescription>
              Update ticket status and attach e-ticket image
            </DialogDescription>
          </DialogHeader>
          
          {editingTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg text-sm">
                <div>
                  <span className="text-muted-foreground">Ticket #:</span>
                  <p className="font-mono font-medium">{editingTicket.ticketNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Passenger:</span>
                  <p className="font-medium">{editingTicket.passengerName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Route:</span>
                  <p className="font-medium">{editingTicket.route}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Airlines:</span>
                  <p className="font-medium">{editingTicket.airlines}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ticket Number</label>
                <Input
                  placeholder="Enter ticket number from airline (e.g., 157-1234567890)"
                  value={editTicketNumber}
                  onChange={(e) => setEditTicketNumber(e.target.value)}
                  data-testid="input-edit-ticket-number"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the ticket number after receiving the e-ticket from airline
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger data-testid="select-ticket-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="issued">Issued</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">E-Ticket Image</label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {eticketPreview ? (
                    <div className="space-y-2">
                      <img 
                        src={eticketPreview} 
                        alt="E-Ticket Preview" 
                        className="max-h-48 mx-auto rounded-lg object-contain"
                      />
                      <div className="flex justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(eticketPreview, '_blank');
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Full
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEticketFile(null);
                            setEticketPreview(null);
                          }}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEticketFileChange}
                        className="hidden"
                        data-testid="input-eticket-file"
                      />
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Upload className="w-8 h-8" />
                        <span className="text-sm">Click to upload e-ticket image</span>
                        <span className="text-xs">PNG, JPG, or screenshot</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingTicket(null);
                    setEticketFile(null);
                    setEticketPreview(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTicket}
                  disabled={isUploading || updateTicketMutation.isPending}
                  data-testid="button-save-ticket-edit"
                >
                  {(isUploading || updateTicketMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ticket Invoice Dialog */}
      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent className="sm:max-w-2xl print:max-w-full print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Ticket Invoice</DialogTitle>
            <DialogDescription>
              Invoice for issued ticket
            </DialogDescription>
          </DialogHeader>
          
          {invoiceTicket && (
            <div className="space-y-6" id="ticket-invoice-content">
              {/* Header with Logo */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <img src={companyLogo} alt="Company Logo" className="h-16 w-auto" />
                  <div>
                    <h2 className="text-xl font-bold">Middle Class Tourism</h2>
                    <p className="text-sm text-muted-foreground">Travel Agency</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">{format(new Date(), "MMM d, yyyy")}</p>
                </div>
              </div>

              {/* Ticket Details */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Booking Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ticket {(invoiceTicket.ticketNumbers?.length || 1) > 1 ? "Numbers" : "Number"}:</span>
                      <div className="text-right">
                        {(invoiceTicket.ticketNumbers && invoiceTicket.ticketNumbers.length > 0) ? (
                          invoiceTicket.ticketNumbers.map((tNum: string, idx: number) => (
                            <div key={idx} className="font-mono font-medium">{tNum}</div>
                          ))
                        ) : (
                          <span className="font-mono font-medium">{invoiceTicket.ticketNumber || "Pending"}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Airline:</span>
                      <span className="font-medium">{invoiceTicket.airlines}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Flight:</span>
                      <span className="font-mono">{invoiceTicket.flightNumber || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Route:</span>
                      <span className="font-medium">{invoiceTicket.route}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Travel Date:</span>
                      <span className="font-medium">{format(new Date(invoiceTicket.travelDate), "MMM d, yyyy")}</span>
                    </div>
                    {invoiceTicket.returnDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Return Date:</span>
                        <span className="font-medium">{format(new Date(invoiceTicket.returnDate), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Class:</span>
                      <span className="font-medium capitalize">{invoiceTicket.seatClass || "Economy"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trip Type:</span>
                      <span className="font-medium">{invoiceTicket.tripType === "round_trip" ? "Round Trip" : "One Way"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Passenger Details</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-muted rounded-md">
                      <p className="font-medium">{invoiceTicket.passengerName}</p>
                      <p className="text-xs text-muted-foreground">Lead Passenger</p>
                    </div>
                    {invoiceTicket.passengers && invoiceTicket.passengers.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Group Members:</p>
                        {invoiceTicket.passengers.map((passenger, index) => (
                          <div key={index} className="p-2 bg-muted/50 rounded-md">
                            <p className="text-sm">{passenger}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Passengers:</span>
                        <span className="font-medium">{invoiceTicket.passengerCount || 1}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Pricing Summary</h3>
                <div className="bg-muted/30 rounded-md p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {invoiceTicket.vendorId ? "Vendor Price" : "Airline Price"}:
                    </span>
                    <span className="font-mono">
                      {formatCurrency(invoiceTicket.vendorId ? (invoiceTicket.vendorPrice || 0) : (invoiceTicket.airlinePrice || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Charge:</span>
                    <span className="font-mono">{formatCurrency(invoiceTicket.middleClassPrice || 0)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span>Total (Face Value):</span>
                    <span className="text-primary font-mono">{formatCurrency(invoiceTicket.faceValue)}</span>
                  </div>
                  {(invoiceTicket.depositDeducted || 0) > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                        <span>Deposit Applied:</span>
                        <span className="font-mono">-{formatCurrency(invoiceTicket.depositDeducted || 0)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Amount Paid:</span>
                        <span className="font-mono">
                          {formatCurrency(invoiceTicket.faceValue - (invoiceTicket.depositDeducted || 0))}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-sm text-muted-foreground border-t pt-4">
                <p>Thank you for choosing Middle Class Tourism</p>
                <p>For any queries, please contact us</p>
              </div>

              {/* Print Button */}
              <div className="flex justify-end gap-2 print:hidden">
                <Button
                  variant="outline"
                  onClick={() => setIsInvoiceOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => window.print()}
                  data-testid="button-print-invoice"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
