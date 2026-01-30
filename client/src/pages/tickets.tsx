import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePin } from "@/lib/pin-context";
import { useAuth } from "@/lib/auth-context";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { AlertCircle } from "lucide-react";
import { Plus, Ticket as TicketIcon, Search, Loader2, Lock, Calendar, Plane, Upload, Download, UserPlus, Building2, Check, ChevronsUpDown, Edit, Image, Eye, X, Users, FileText, Printer, Briefcase, ExternalLink, DollarSign, CreditCard, ArrowLeftRight, ArrowRight } from "lucide-react";
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
  ticketNumber: z.string().optional(), // Validated separately via ticketNumbersList state
  pnr: z.string().min(1, "PNR is required"),
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
  passengerName: z.string().optional(), // Now handled by passengerNamesList state
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmPin, setConfirmPin] = useState("");
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
  const [ticketPricesList, setTicketPricesList] = useState<number[]>([0]);
  const [ticketClassesList, setTicketClassesList] = useState<string[]>(["economy"]);
  const [passengerNamesList, setPassengerNamesList] = useState<string[]>([""]);
  const [createEticketFiles, setCreateEticketFiles] = useState<File[]>([]);
  const [createEticketPreviews, setCreateEticketPreviews] = useState<{name: string, type: string, url?: string}[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceTicket, setInvoiceTicket] = useState<Ticket | null>(null);
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [formViewingTicket, setFormViewingTicket] = useState<Ticket | null>(null);
  const [documentsTicket, setDocumentsTicket] = useState<Ticket | null>(null);
  const [payingTicket, setPayingTicket] = useState<Ticket | null>(null);
  const [paymentPin, setPaymentPin] = useState("");
  const { toast } = useToast();
  const { isAuthenticated, session, authenticate } = usePin();
  const { user } = useAuth();
  const [confirmPinError, setConfirmPinError] = useState("");

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

  // Helper to get client name by customer ID (checks both customers and agents)
  const getClientName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) return customer.name;
    const agent = agents.find((a) => a.id === customerId);
    if (agent) return agent.name;
    return "Unknown Client";
  };

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

  // Calculate passenger count from quantity field
  const passengerCount = Number(watchQuantity) || 1;

  // Sync ticket numbers and prices lists with quantity
  useEffect(() => {
    setTicketNumbersList(prev => {
      if (passengerCount > prev.length) {
        return [...prev, ...Array(passengerCount - prev.length).fill("")];
      } else if (passengerCount < prev.length) {
        return prev.slice(0, passengerCount);
      }
      return prev;
    });
    setTicketPricesList(prev => {
      if (passengerCount > prev.length) {
        return [...prev, ...Array(passengerCount - prev.length).fill(0)];
      } else if (passengerCount < prev.length) {
        return prev.slice(0, passengerCount);
      }
      return prev;
    });
    setTicketClassesList(prev => {
      if (passengerCount > prev.length) {
        return [...prev, ...Array(passengerCount - prev.length).fill("economy")];
      } else if (passengerCount < prev.length) {
        return prev.slice(0, passengerCount);
      }
      return prev;
    });
    setPassengerNamesList(prev => {
      if (passengerCount > prev.length) {
        return [...prev, ...Array(passengerCount - prev.length).fill("")];
      } else if (passengerCount < prev.length) {
        return prev.slice(0, passengerCount);
      }
      return prev;
    });
  }, [passengerCount]);

  // Auto-verify confirmation PIN when 5 digits entered
  useEffect(() => {
    if (confirmPin.length === 5 && user && !confirmPinMutation.isPending) {
      confirmPinMutation.mutate({ userId: user.id, pin: confirmPin });
    }
  }, [confirmPin, user]);

  // Reset confirmation dialog state when closed
  useEffect(() => {
    if (!isConfirmOpen) {
      setConfirmPin("");
      setConfirmPinError("");
    }
  }, [isConfirmOpen]);

  // Calculate total from individual ticket prices + MC Addition
  const totalTicketPrices = useMemo(() => {
    return ticketPricesList.reduce((sum, price) => sum + (price || 0), 0);
  }, [ticketPricesList]);

  // Auto-calculate face value based on sum of individual prices + MC Addition (flat, not per passenger)
  useEffect(() => {
    const middleClass = Number(watchMiddleClassPrice) || 0;
    const total = totalTicketPrices + middleClass;
    form.setValue("faceValue", total);
    // Also update the vendor/airline price to average for backend compatibility
    const avgPrice = passengerCount > 0 ? totalTicketPrices / passengerCount : 0;
    if (ticketSource === "direct") {
      form.setValue("airlinePrice", avgPrice);
    } else {
      form.setValue("vendorPrice", avgPrice);
    }
  }, [ticketSource, watchMiddleClassPrice, passengerCount, totalTicketPrices, form]);

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
      setCreateEticketFiles([]);
      setCreateEticketPreviews([]);
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

  const confirmPinMutation = useMutation({
    mutationFn: async ({ userId, pin }: { userId: string; pin: string }) => {
      const res = await apiRequest("POST", "/api/auth/verify-user-pin", { userId, pin });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.user) {
        authenticate(data.user);
        setConfirmPin("");
        setConfirmPinError("");
        setIsConfirmOpen(false);
        form.handleSubmit(onSubmit)();
      } else {
        setConfirmPinError("Invalid PIN. Please try again.");
        setConfirmPin("");
      }
    },
    onError: () => {
      setConfirmPinError("Invalid PIN. Please try again.");
      setConfirmPin("");
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
    mutationFn: async (data: { id: string; status?: string; ticketNumber?: string; eticketImage?: string; isPaid?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/tickets/${data.id}`, data);
      return res.json();
    },
    onSuccess: (updatedTicket) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      // Update editingTicket to reflect the change without closing dialog
      if (editingTicket && updatedTicket) {
        setEditingTicket({ ...editingTicket, ...updatedTicket });
      }
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

  const payTicketMutation = useMutation({
    mutationFn: async (data: { id: string; pin: string }) => {
      const res = await apiRequest("POST", `/api/tickets/${data.id}/pay`, { pin: data.pin });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Payment failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setPayingTicket(null);
      setPaymentPin("");
      toast({
        title: "Payment confirmed",
        description: "The ticket has been marked as paid.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Payment failed",
        description: error.message || "Invalid PIN or payment error",
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

  // Open form with existing ticket data for viewing
  const handleViewInvoice = (ticket: Ticket) => {
    // Split route into from/to
    const routeParts = ticket.route?.split(" - ") || ["", ""];
    
    // Populate form with existing data
    form.reset({
      ticketNumber: ticket.ticketNumber || "",
      pnr: ticket.pnr || "",
      customerId: ticket.customerId || "",
      vendorId: ticket.vendorId || "",
      tripType: ticket.tripType || "one_way",
      seatClass: ticket.seatClass || "economy",
      routeFrom: routeParts[0] || "",
      routeTo: routeParts[1] || "",
      airlines: ticket.airlines || "",
      flightNumber: ticket.flightNumber || "",
      quantity: ticket.passengerCount || 1,
      travelDate: ticket.travelDate || "",
      returnDate: ticket.returnDate || "",
      passengerName: ticket.passengerName || "",
      vendorPrice: ticket.vendorPrice || 0,
      airlinePrice: ticket.airlinePrice || 0,
      middleClassPrice: ticket.middleClassPrice || 0,
      faceValue: ticket.faceValue || 0,
      deductFromDeposit: ticket.deductFromDeposit || false,
    });

    // Set passenger details
    if (ticket.passengerNames && ticket.passengerNames.length > 0) {
      setPassengerNamesList(ticket.passengerNames);
    } else if (ticket.passengerName) {
      setPassengerNamesList([ticket.passengerName]);
    } else {
      setPassengerNamesList([""]);
    }

    // Set ticket numbers
    if (ticket.ticketNumbers && ticket.ticketNumbers.length > 0) {
      setTicketNumbersList(ticket.ticketNumbers);
    } else if (ticket.ticketNumber) {
      setTicketNumbersList([ticket.ticketNumber]);
    } else {
      setTicketNumbersList([""]);
    }

    // Set prices - calculate from source cost (vendor or airline price)
    const sourceCost = ticket.vendorPrice || ticket.airlinePrice || 0;
    const pricePerPassenger = sourceCost / (ticket.passengerCount || 1);
    setTicketPricesList(Array(ticket.passengerCount || 1).fill(pricePerPassenger));

    // Set classes
    setTicketClassesList(Array(ticket.passengerCount || 1).fill(ticket.seatClass || "economy"));

    // Set ticket source
    setTicketSource(ticket.vendorId ? "vendor" : "direct");
    setClientType("customer");
    setSelectedCustomerOption(ticket.customerId || "");

    // Store the ticket being viewed
    setFormViewingTicket(ticket);
    setIsCreateOpen(true);
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
    setTicketSource("direct");
    form.setValue("vendorId", "direct");
    form.setValue("airlines", "");
    setIsCreateOpen(true);
  };

  const onSubmit = async (data: CreateTicketForm) => {
    // Prevent double submission
    if (createMutation.isPending) {
      return;
    }

    if (!isAuthenticated || !session) {
      toast({
        title: "Authentication required",
        description: "Please authenticate with PIN first",
        variant: "destructive",
      });
      return;
    }

    // Validate client selection - must have a customer selected
    if (!data.customerId || data.customerId.trim() === "") {
      toast({
        title: "Client required",
        description: "Please select a client before creating an invoice",
        variant: "destructive",
      });
      return;
    }

    // Validate passenger names - at least first passenger name is required
    if (!passengerNamesList[0] || passengerNamesList[0].trim() === "") {
      toast({
        title: "Passenger name required",
        description: "Please enter at least the first passenger name",
        variant: "destructive",
      });
      return;
    }

    // Validate ticket numbers - at least first ticket number is required
    if (!ticketNumbersList[0] || ticketNumbersList[0].trim() === "") {
      toast({
        title: "Ticket number required",
        description: "Please enter at least the first ticket number",
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

    // Handle e-ticket files upload (multiple files - PDF or images) using presigned URL flow
    const eticketFileUrls: string[] = [];
    if (createEticketFiles.length > 0) {
      for (const file of createEticketFiles) {
        try {
          // Step 1: Get presigned upload URL
          const urlRes = await fetch("/api/uploads/request-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: file.name,
              size: file.size,
              contentType: file.type,
            }),
          });
          
          if (!urlRes.ok) {
            console.error("Failed to get upload URL");
            continue;
          }
          
          const { uploadURL, objectPath } = await urlRes.json();
          
          // Step 2: Upload file directly to presigned URL
          const uploadRes = await fetch(uploadURL, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
          
          if (uploadRes.ok && objectPath) {
            eticketFileUrls.push(objectPath);
          }
        } catch (error) {
          console.error("Failed to upload e-ticket file:", error);
        }
      }
    }

    // Filter out empty ticket numbers and use the list
    const validTicketNumbers = ticketNumbersList.filter(t => t.trim() !== "");
    // Use the first passenger name for the main passengerName field
    const leadPassengerName = passengerNamesList[0] || "";
    
    const ticketData = {
      ...data,
      passengerName: leadPassengerName,
      passengerNames: passengerNamesList, // All passenger names
      route, // Combined route
      vendorId, // Normalized - undefined means direct from airline
      faceValue,
      depositDeducted,
      passengerCount: Number(data.quantity) || 1,
      issuedBy: session.staffId,
      eticketImage: eticketFileUrls[0] || undefined, // Legacy: first file
      eticketFiles: eticketFileUrls, // All files
      ticketNumbers: validTicketNumbers,
      ticketNumber: validTicketNumbers[0] || "", // Also set first ticket number for legacy field
    };

    createMutation.mutate(ticketData);
    setCreateEticketFiles([]);
    setCreateEticketPreviews([]);
    setTicketNumbersList([""]); // Reset ticket numbers list
    setTicketPricesList([0]); // Reset ticket prices list
    setTicketClassesList(["economy"]); // Reset ticket classes list
    setPassengerNamesList([""]); // Reset passenger names list
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="lg:hidden" data-testid="button-sidebar-toggle" />
          <div>
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-tickets-title">Invoice Management</h1>
            <p className="text-sm text-muted-foreground">Create and manage travel invoices</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button onClick={handleCreateClick} className="w-full sm:w-auto" data-testid="button-issue-ticket">
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
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
                <div 
                  key={ticket.id} 
                  className="border rounded-lg p-4 space-y-3 cursor-pointer hover-elevate" 
                  data-testid={`card-ticket-${ticket.id}`}
                  onClick={() => handleViewInvoice(ticket)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{getClientName(ticket.customerId)}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {(ticket.passengerCount || 1)}
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
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-primary">{formatCurrency(ticket.faceValue)}</span>
                      {(ticket as any).isPaid && (
                        <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                          Paid
                        </Badge>
                      )}
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
                    <TableHead>Client Name</TableHead>
                    <TableHead>No. of Passengers</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Travel Date</TableHead>
                    <TableHead className="text-right">Ticket Price</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow 
                      key={ticket.id} 
                      data-testid={`row-ticket-${ticket.id}`}
                      className="cursor-pointer hover-elevate"
                      onClick={() => handleViewInvoice(ticket)}
                    >
                      <TableCell>
                        <span>{getClientName(ticket.customerId)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(ticket.passengerCount || 1)}
                        </Badge>
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
                      <TableCell className="text-right">
                        <span className="font-mono font-semibold text-primary">
                          {formatCurrency(ticket.faceValue)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {(ticket as any).isPaid ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            Unpaid
                          </Badge>
                        )}
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

      <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setFormViewingTicket(null);
        }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formViewingTicket ? (
                <div className="flex items-center gap-2">
                  <span>Invoice</span>
                  <Badge variant="outline" className="font-mono text-primary">
                    {formViewingTicket.pnr || formViewingTicket.ticketNumber || "N/A"}
                  </Badge>
                  {(formViewingTicket as any).isPaid ? (
                    <Badge className="bg-green-100 text-green-700 border-green-300">Paid</Badge>
                  ) : (
                    <Badge variant="destructive">Unpaid</Badge>
                  )}
                </div>
              ) : "Create Invoice"}
            </DialogTitle>
            <DialogDescription>
              {formViewingTicket 
                ? `Invoice for ${getClientName(formViewingTicket.customerId)}`
                : "Enter ticket details. The amount can be deducted from customer deposit."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Row 1: PNR and Number of Passengers */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="pnr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PNR / Booking Ref *</FormLabel>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. of Passengers</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          defaultValue={field.value || 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 1) {
                              field.onChange(val);
                            }
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            field.onChange(Math.max(1, val));
                            e.target.value = String(Math.max(1, val));
                          }}
                          data-testid="input-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <FormLabel>Select Client</FormLabel>
                {formViewingTicket ? (
                  <div className="p-3 rounded-md border bg-muted/50">
                    <span className="font-medium">{getClientName(formViewingTicket.customerId)}</span>
                  </div>
                ) : (
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
                              data-testid="select-ticket-client"
                            >
                              {selectedCustomerOption === "walkin" ? (
                                <span className="flex items-center gap-2">
                                  <UserPlus className="w-4 h-4 text-primary" />
                                  Walk-in Customer
                                </span>
                              ) : (() => {
                                const customer = customers.find(c => c.id === field.value);
                                const agent = agents.find(a => a.id === field.value);
                                if (customer) {
                                  return (
                                    <span className="flex items-center gap-2">
                                      <Users className="w-4 h-4 text-muted-foreground" />
                                      {customer.name} - {customer.phone}
                                    </span>
                                  );
                                }
                                if (agent) {
                                  return (
                                    <span className="flex items-center gap-2">
                                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                                      {agent.name}
                                    </span>
                                  );
                                }
                                return <span className="text-muted-foreground">Search customers or agents...</span>;
                              })()}
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
                              data-testid="input-search-client"
                            />
                            <CommandList>
                              <CommandGroup>
                                <CommandItem
                                  value="walkin"
                                  onSelect={() => {
                                    setSelectedCustomerOption("walkin");
                                    setClientType("customer");
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
                              {/* Customers Section */}
                              {filteredCustomers.length > 0 && (
                                <CommandGroup heading="Customers">
                                  {filteredCustomers.map((customer) => (
                                    <CommandItem
                                      key={`customer-${customer.id}`}
                                      value={`customer-${customer.id}`}
                                      onSelect={() => {
                                        setSelectedCustomerOption(customer.id);
                                        setClientType("customer");
                                        field.onChange(customer.id);
                                        setCustomerSelectOpen(false);
                                        setCustomerSearchQuery("");
                                      }}
                                      className="gap-2"
                                      data-testid={`option-customer-${customer.id}`}
                                    >
                                      <Check
                                        className={`h-4 w-4 ${
                                          field.value === customer.id ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      <Users className="w-4 h-4 text-muted-foreground" />
                                      <span>{customer.name} - {customer.phone}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                              {/* Agents Section */}
                              {(() => {
                                const filteredAgents = agents.filter(agent =>
                                  agent.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                                  (agent.phone && agent.phone.includes(customerSearchQuery))
                                );
                                return filteredAgents.length > 0 ? (
                                  <CommandGroup heading="Agents">
                                    {filteredAgents.map((agent) => (
                                      <CommandItem
                                        key={`agent-${agent.id}`}
                                        value={`agent-${agent.id}`}
                                        onSelect={() => {
                                          setSelectedCustomerOption(agent.id);
                                          setClientType("agent");
                                          field.onChange(agent.id);
                                          setCustomerSelectOpen(false);
                                          setCustomerSearchQuery("");
                                        }}
                                        className="gap-2"
                                        data-testid={`option-agent-${agent.id}`}
                                      >
                                        <Check
                                          className={`h-4 w-4 ${
                                            field.value === agent.id ? "opacity-100" : "opacity-0"
                                          }`}
                                        />
                                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                                        <span>{agent.name}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                ) : null;
                              })()}
                              {filteredCustomers.length === 0 && agents.filter(a => 
                                a.name.toLowerCase().includes(customerSearchQuery.toLowerCase())
                              ).length === 0 && customerSearchQuery && (
                                <CommandEmpty>No clients found.</CommandEmpty>
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
                )}
              </div>

              <div className="space-y-3">
                <FormLabel>Ticket Source</FormLabel>
                  <Select 
                    value={ticketSource === "direct" ? `airline:${form.watch("airlines") || ""}` : `vendor:${form.watch("vendorId") || ""}`}
                    onValueChange={(value: string) => {
                      if (value.startsWith("airline:")) {
                        const airlineName = value.replace("airline:", "");
                        setTicketSource("direct");
                        form.setValue("vendorId", "");
                        form.setValue("airlines", airlineName);
                        form.setValue("vendorPrice", 0);
                      } else if (value.startsWith("vendor:")) {
                        const vendorId = value.replace("vendor:", "");
                        setTicketSource("vendor");
                        form.setValue("vendorId", vendorId);
                        form.setValue("airlines", "");
                        form.setValue("airlinePrice", 0);
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-ticket-source">
                      <SelectValue placeholder="Select agency or airline" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {/* Agencies Section */}
                      {vendors.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Agencies</div>
                          {vendors.map((vendor) => (
                            <SelectItem key={`vendor:${vendor.id}`} value={`vendor:${vendor.id}`}>
                              <div className="flex items-center gap-2">
                                {vendor.logo ? (
                                  <img src={vendor.logo} alt={vendor.name} className="w-5 h-5 object-contain rounded" />
                                ) : (
                                  <Building2 className="w-4 h-4 text-muted-foreground" />
                                )}
                                {vendor.name}
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {/* Airlines Section */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Airlines (Direct)</div>
                      {airlines.map((airline) => (
                        <SelectItem key={`airline:${airline.name}`} value={`airline:${airline.name}`}>
                          <div className="flex items-center gap-2">
                            <img src={airline.logo} alt={airline.name} className="w-5 h-5 object-contain rounded" />
                            {airline.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </div>

              {/* Trip Type and Route - below Ticket Source */}
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
                              className="font-mono text-center tracking-widest"
                              maxLength={4}
                              data-testid="input-route-from"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {form.watch("tripType") === "round_trip" ? (
                      <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <FormField
                      control={form.control}
                      name="routeTo"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="MNL"
                              value={field.value}
                              onChange={(e) => {
                                const upperValue = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
                                field.onChange(upperValue);
                              }}
                              className="font-mono text-center tracking-widest"
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
              </div>

              {/* Row 4: Ticket #, Ticket Class, Passenger Name, Ticket Price - Table Form */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Passenger Details ({passengerCount} {passengerCount === 1 ? 'ticket' : 'tickets'})
                </Label>
                
                {/* Desktop/Tablet Table View */}
                <div className="hidden md:block border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[100px] text-xs">Ticket #</TableHead>
                        <TableHead className="w-[90px] text-xs">Class</TableHead>
                        <TableHead className="text-xs">Passenger Name</TableHead>
                        <TableHead className="w-[100px] text-right text-xs">Source Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ticketNumbersList.map((ticketNum, index) => (
                        <TableRow key={index}>
                          <TableCell className="p-2">
                            <Input
                              value={ticketNum}
                              onChange={(e) => {
                                const newList = [...ticketNumbersList];
                                newList[index] = e.target.value;
                                setTicketNumbersList(newList);
                              }}
                              className="font-mono text-sm h-8"
                              data-testid={`input-ticket-number-${index}`}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Select
                              value={ticketClassesList[index] || "economy"}
                              onValueChange={(value) => {
                                const newClasses = [...ticketClassesList];
                                newClasses[index] = value;
                                setTicketClassesList(newClasses);
                              }}
                            >
                              <SelectTrigger className="text-xs h-8" data-testid={`select-ticket-class-${index}`}>
                                <SelectValue placeholder="Class" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="economy">Economy</SelectItem>
                                <SelectItem value="business">Business</SelectItem>
                                <SelectItem value="first">First</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              value={passengerNamesList[index] || ""}
                              onChange={(e) => {
                                const newNames = [...passengerNamesList];
                                newNames[index] = e.target.value;
                                setPassengerNamesList(newNames);
                              }}
                              className="h-8"
                              data-testid={`input-passenger-name-${index}`}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={ticketPricesList[index] || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const newPrices = [...ticketPricesList];
                                newPrices[index] = val;
                                setTicketPricesList(newPrices);
                              }}
                              className="text-right h-8"
                              data-testid={`input-ticket-price-${index}`}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {ticketNumbersList.map((ticketNum, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Passenger {index + 1}</span>
                        <Badge variant="outline" className="text-xs">
                          {ticketClassesList[index] === "first" ? "First" : 
                           ticketClassesList[index] === "business" ? "Business" : "Economy"}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <Input
                          value={passengerNamesList[index] || ""}
                          onChange={(e) => {
                            const newNames = [...passengerNamesList];
                            newNames[index] = e.target.value;
                            setPassengerNamesList(newNames);
                          }}
                          className="h-9"
                          data-testid={`input-passenger-name-mobile-${index}`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Ticket #</Label>
                          <Input
                            value={ticketNum}
                            onChange={(e) => {
                              const newList = [...ticketNumbersList];
                              newList[index] = e.target.value;
                              setTicketNumbersList(newList);
                            }}
                            className="font-mono text-sm h-9"
                            data-testid={`input-ticket-number-mobile-${index}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Source Cost</Label>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={ticketPricesList[index] || ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const newPrices = [...ticketPricesList];
                              newPrices[index] = val;
                              setTicketPricesList(newPrices);
                            }}
                            className="text-right h-9"
                            data-testid={`input-ticket-price-mobile-${index}`}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Class</Label>
                        <Select
                          value={ticketClassesList[index] || "economy"}
                          onValueChange={(value) => {
                            const newClasses = [...ticketClassesList];
                            newClasses[index] = value;
                            setTicketClassesList(newClasses);
                          }}
                        >
                          <SelectTrigger className="h-9" data-testid={`select-ticket-class-mobile-${index}`}>
                            <SelectValue placeholder="Class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="economy">Economy</SelectItem>
                            <SelectItem value="business">Business</SelectItem>
                            <SelectItem value="first">First</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MC Addition */}
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
                        value={field.value || ""}
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

              {/* Total Price Summary */}
              <div className="p-3 bg-primary/10 rounded-md space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Source Cost:</span>
                    <span className="font-mono">AED {totalTicketPrices.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">MC Addition:</span>
                    <span className="font-mono">AED {(Number(watchMiddleClassPrice) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t">
                    <span className="font-medium">Grand Total:</span>
                    <span className="text-lg font-bold text-primary font-mono" data-testid="text-total-price">
                      AED {calculations.faceValue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Only show Airlines field when source is vendor (not direct) */}
              {ticketSource !== "direct" && (
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
              )}

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
                <Label>Documents (PDF)</Label>
                <div 
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                    
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      const fileArray = Array.from(files).filter(file => 
                        file.type === 'application/pdf'
                      );
                      if (fileArray.length > 0) {
                        setCreateEticketFiles(prev => [...prev, ...fileArray]);
                        fileArray.forEach(file => {
                          setCreateEticketPreviews(prev => [...prev, {
                            name: file.name,
                            type: file.type
                          }]);
                        });
                      }
                    }
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const fileArray = Array.from(files).filter(file => 
                          file.type === 'application/pdf'
                        );
                        setCreateEticketFiles(prev => [...prev, ...fileArray]);
                        fileArray.forEach(file => {
                          setCreateEticketPreviews(prev => [...prev, {
                            name: file.name,
                            type: file.type
                          }]);
                        });
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    data-testid="input-document-upload"
                  />
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <Upload className={`w-8 h-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-sm font-medium">
                      {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                    </p>
                    <p className="text-xs text-muted-foreground">or click to browse</p>
                    <p className="text-xs text-muted-foreground">PDF files only</p>
                  </div>
                </div>
                {createEticketFiles.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCreateEticketFiles([]);
                        setCreateEticketPreviews([]);
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                )}
                {createEticketPreviews.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {createEticketPreviews.map((preview, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                        {preview.type.startsWith('image/') && preview.url ? (
                          <img
                            src={preview.url}
                            alt={preview.name}
                            className="h-10 w-10 object-cover rounded"
                          />
                        ) : (
                          <div className="h-10 w-10 flex items-center justify-center bg-red-100 dark:bg-red-900/30 rounded">
                            <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                          </div>
                        )}
                        <span className="flex-1 text-sm truncate">{preview.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setCreateEticketFiles(prev => prev.filter((_, i) => i !== idx));
                            setCreateEticketPreviews(prev => prev.filter((_, i) => i !== idx));
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
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
                    setCreateEticketFiles([]);
                    setCreateEticketPreviews([]);
                  }}
                  data-testid="button-cancel-ticket"
                >
                  Cancel
                </Button>
                {formViewingTicket ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Open print dialog with invoice data
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          const clientName = getClientName(formViewingTicket.customerId);
                          const vendorName = formViewingTicket.vendorId === "direct" 
                            ? `Direct - ${formViewingTicket.airlines}` 
                            : vendors?.find(v => v.id === formViewingTicket.vendorId)?.name || "Unknown";
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Invoice ${formViewingTicket.pnr || formViewingTicket.ticketNumber}</title>
                                <style>
                                  body { font-family: Arial, sans-serif; padding: 40px; }
                                  .header { text-align: center; margin-bottom: 30px; }
                                  .header h1 { margin: 0; color: #333; }
                                  .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
                                  .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
                                  .label { color: #666; font-size: 14px; }
                                  .value { font-weight: bold; }
                                  .total { font-size: 24px; color: #2563eb; }
                                  .status { padding: 4px 12px; border-radius: 4px; display: inline-block; }
                                  .paid { background: #dcfce7; color: #166534; }
                                  .unpaid { background: #fee2e2; color: #991b1b; }
                                </style>
                              </head>
                              <body>
                                <div class="header">
                                  <h1>INVOICE</h1>
                                  <p>Invoice #: ${formViewingTicket.pnr || formViewingTicket.ticketNumber || 'N/A'}</p>
                                </div>
                                <div class="section">
                                  <div class="info-row">
                                    <span class="label">Client:</span>
                                    <span class="value">${clientName}</span>
                                  </div>
                                  <div class="info-row">
                                    <span class="label">Vendor:</span>
                                    <span class="value">${vendorName}</span>
                                  </div>
                                  <div class="info-row">
                                    <span class="label">Route:</span>
                                    <span class="value">${formViewingTicket.route || 'N/A'}</span>
                                  </div>
                                  <div class="info-row">
                                    <span class="label">Travel Date:</span>
                                    <span class="value">${formViewingTicket.travelDate || 'N/A'}</span>
                                  </div>
                                  <div class="info-row">
                                    <span class="label">Passengers:</span>
                                    <span class="value">${formViewingTicket.passengerCount || 1}</span>
                                  </div>
                                </div>
                                <div class="section">
                                  <div class="info-row">
                                    <span class="label">Total Amount:</span>
                                    <span class="value total">AED ${(formViewingTicket.faceValue || 0).toLocaleString()}</span>
                                  </div>
                                  <div class="info-row">
                                    <span class="label">Status:</span>
                                    <span class="status ${(formViewingTicket as any).isPaid ? 'paid' : 'unpaid'}">
                                      ${(formViewingTicket as any).isPaid ? 'PAID' : 'UNPAID'}
                                    </span>
                                  </div>
                                </div>
                                <script>window.print();</script>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                        }
                      }}
                      data-testid="button-print-invoice"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print Invoice
                    </Button>
                    {!(formViewingTicket as any).isPaid && (
                      <Button
                        type="button"
                        onClick={() => {
                          setPayingTicket(formViewingTicket);
                          setIsCreateOpen(false);
                          setFormViewingTicket(null);
                        }}
                        data-testid="button-pay-invoice"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay Invoice
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      form.trigger().then((isValid) => {
                        if (isValid) {
                          setIsConfirmOpen(true);
                        }
                      });
                    }}
                    disabled={createMutation.isPending}
                    data-testid="button-save-ticket"
                  >
                    {createMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Create Invoice
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog with PIN */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Confirm Invoice Creation
            </DialogTitle>
            <DialogDescription className="text-base">
              Are all the information correct? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6 py-4">
            {user && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{user.name || user.username}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.role === "superadmin" ? "Administrator" : "Staff"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center gap-4">
              <Label>Enter your 5-digit PIN to confirm</Label>
              <InputOTP
                maxLength={5}
                value={confirmPin}
                onChange={setConfirmPin}
                disabled={confirmPinMutation.isPending}
                data-testid="input-confirm-pin"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                </InputOTPGroup>
              </InputOTP>

              {confirmPinMutation.isPending && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </div>
              )}

              {confirmPinError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {confirmPinError}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              data-testid="button-cancel-confirm"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Ticket Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>
              View ticket information and update payment status
            </DialogDescription>
          </DialogHeader>
          
          {editingTicket && (
            <div className="space-y-4">
              {/* Ticket Info - Read Only */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Ticket #</span>
                    <p className="font-mono font-medium">{editingTicket.ticketNumber || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">PNR/Booking Ref</span>
                    <p className="font-medium">{editingTicket.pnr || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Passenger</span>
                    <p className="font-medium">{editingTicket.passengerName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Route</span>
                    <p className="font-medium">{editingTicket.route}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Airlines</span>
                    <p className="font-medium">{editingTicket.airlines || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Travel Date</span>
                    <p className="font-medium">{format(new Date(editingTicket.travelDate), "MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Trip Type</span>
                    <p className="font-medium capitalize">{editingTicket.tripType?.replace("_", " ") || "One Way"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Passengers</span>
                    <p className="font-medium">{editingTicket.passengerCount || 1}</p>
                  </div>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-mono font-semibold text-primary">{formatCurrency(editingTicket.faceValue)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status - Editable */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Status</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={(editingTicket as any).isPaid ? "outline" : "default"}
                    className={!(editingTicket as any).isPaid ? "bg-orange-600 hover:bg-orange-700" : ""}
                    onClick={() => {
                      updateTicketMutation.mutate({ id: editingTicket.id, isPaid: false });
                    }}
                    disabled={updateTicketMutation.isPending}
                  >
                    Unpaid
                  </Button>
                  <Button
                    type="button"
                    variant={(editingTicket as any).isPaid ? "default" : "outline"}
                    className={(editingTicket as any).isPaid ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => {
                      updateTicketMutation.mutate({ id: editingTicket.id, isPaid: true });
                    }}
                    disabled={updateTicketMutation.isPending}
                  >
                    Paid
                  </Button>
                </div>
              </div>

              {/* Uploaded Documents - View Only */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Documents</label>
                {(editingTicket.eticketFiles && editingTicket.eticketFiles.length > 0) || editingTicket.eticketImage ? (
                  <div className="grid grid-cols-1 gap-2">
                    {editingTicket.eticketFiles?.map((fileUrl: string, idx: number) => (
                      <a 
                        key={idx}
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border rounded-lg hover-elevate"
                      >
                        <FileText className="w-6 h-6 text-red-500" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">E-Ticket {idx + 1}</p>
                          <p className="text-xs text-muted-foreground">Click to view/download</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    ))}
                    {editingTicket.eticketImage && !editingTicket.eticketFiles?.length && (
                      <a 
                        href={editingTicket.eticketImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border rounded-lg hover-elevate"
                      >
                        <FileText className="w-6 h-6 text-red-500" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">E-Ticket Document</p>
                          <p className="text-xs text-muted-foreground">Click to view/download</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No documents uploaded</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingTicket(null);
                  }}
                >
                  Close
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

      {/* Ticket Detail View Dialog */}
      <Dialog open={!!viewingTicket} onOpenChange={(open) => !open && setViewingTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5" />
              Ticket Details
            </DialogTitle>
          </DialogHeader>
          
          {viewingTicket && (
            <div className="space-y-6">
              {/* Client & Booking Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">Client Name</span>
                  <p className="font-semibold">{getClientName(viewingTicket.customerId)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">PNR / Booking Ref</span>
                  <p className="font-mono font-semibold">{viewingTicket.pnr || "Not assigned"}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Route</span>
                  <p className="font-medium">{viewingTicket.route}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Airlines</span>
                  <p className="font-medium">{viewingTicket.airlines}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Travel Date</span>
                  <p className="font-medium">{format(new Date(viewingTicket.travelDate), "MMM d, yyyy")}</p>
                </div>
                {viewingTicket.returnDate && (
                  <div>
                    <span className="text-sm text-muted-foreground">Return Date</span>
                    <p className="font-medium">{format(new Date(viewingTicket.returnDate), "MMM d, yyyy")}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-muted-foreground">Trip Type</span>
                  <p className="font-medium">{viewingTicket.tripType === "round_trip" ? "Round Trip" : "One Way"}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Class</span>
                  <Badge variant="secondary">
                    {viewingTicket.seatClass === "first" ? "First Class" : 
                     viewingTicket.seatClass === "business" ? "Business Class" : "Economy"}
                  </Badge>
                </div>
              </div>

              {/* Passenger Details */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Passengers ({viewingTicket.passengerCount || 1})
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Passenger Name</TableHead>
                        <TableHead>Ticket Number</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(viewingTicket.passengerNames && viewingTicket.passengerNames.length > 0) ? (
                        viewingTicket.passengerNames.map((name: string, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{name}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {viewingTicket.ticketNumbers && viewingTicket.ticketNumbers[idx] 
                                ? viewingTicket.ticketNumbers[idx] 
                                : (idx === 0 && viewingTicket.ticketNumber) 
                                  ? viewingTicket.ticketNumber 
                                  : <span className="text-muted-foreground italic">Not assigned</span>
                              }
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell className="font-mono text-muted-foreground">1</TableCell>
                          <TableCell className="font-medium">{viewingTicket.passengerName}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {viewingTicket.ticketNumber || <span className="text-muted-foreground italic">Not assigned</span>}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Documents - uploaded files like printed e-tickets, airline confirmations, etc. */}
              {((viewingTicket.eticketFiles && viewingTicket.eticketFiles.length > 0) || viewingTicket.eticketImage) && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Documents
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {viewingTicket.eticketFiles && viewingTicket.eticketFiles.map((fileUrl: string, idx: number) => (
                      <a 
                        key={idx}
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border rounded-lg hover-elevate"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`link-document-${idx}`}
                      >
                        <FileText className="w-8 h-8 text-red-500" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">E-Ticket {idx + 1}</p>
                          <p className="text-xs text-muted-foreground">Click to view/download</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    ))}
                    {viewingTicket.eticketImage && !viewingTicket.eticketFiles?.length && (
                      <a 
                        href={viewingTicket.eticketImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border rounded-lg hover-elevate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img 
                          src={viewingTicket.eticketImage} 
                          alt="Document" 
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">Document</p>
                          <p className="text-xs text-muted-foreground">Click to view</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Pricing Summary */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pricing</h3>
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span className="text-primary font-mono">{formatCurrency(viewingTicket.faceValue)}</span>
                  </div>
                  {(viewingTicket.depositDeducted || 0) > 0 && (
                    <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                      <span>Deposit Applied</span>
                      <span className="font-mono">-{formatCurrency(viewingTicket.depositDeducted || 0)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 border-t pt-4">
                {/* Pay button for unpaid tickets */}
                {!(viewingTicket as any).isPaid && (
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setPayingTicket(viewingTicket);
                      setViewingTicket(null);
                    }}
                    data-testid="button-pay-from-popup"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay Now
                  </Button>
                )}
                
                {/* Print Invoice button */}
                {viewingTicket.invoiceId && (
                  <Button 
                    variant="outline"
                    onClick={() => window.open(`/print-invoice/${viewingTicket.invoiceId}`, '_blank')}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Invoice
                  </Button>
                )}
                
                {/* Edit Ticket button */}
                <Button 
                  variant="outline"
                  onClick={() => {
                    setEditingTicket(viewingTicket);
                    setEditTicketNumber(viewingTicket.ticketNumber || "");
                    setViewingTicket(null);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Ticket
                </Button>

                {/* Upload PDF button */}
                <Button 
                  variant="outline"
                  onClick={() => {
                    setEditingTicket(viewingTicket);
                    setEditTicketNumber(viewingTicket.ticketNumber || "");
                    setViewingTicket(null);
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload PDF
                </Button>
                
                <Button variant="outline" onClick={() => setViewingTicket(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment PIN Confirmation Dialog */}
      <Dialog open={!!payingTicket} onOpenChange={(open) => {
        if (!open) {
          setPayingTicket(null);
          setPaymentPin("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              Confirm Payment
            </DialogTitle>
            <DialogDescription>
              Enter your PIN to mark this ticket as paid
            </DialogDescription>
          </DialogHeader>
          
          {payingTicket && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{customers.find(c => c.id === payingTicket.customerId)?.name || "Unknown"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Route</span>
                  <span className="font-medium">{payingTicket.route}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Travel Date</span>
                  <span className="font-medium">{payingTicket.travelDate}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                  <span>Amount</span>
                  <span className="text-primary font-mono">{formatCurrency(payingTicket.faceValue)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-pin">Enter PIN to Confirm</Label>
                <Input
                  id="payment-pin"
                  type="password"
                  placeholder="Enter your 5-digit PIN"
                  value={paymentPin}
                  onChange={(e) => setPaymentPin(e.target.value)}
                  maxLength={5}
                  className="text-center text-lg tracking-widest font-mono"
                  data-testid="input-payment-pin"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setPayingTicket(null);
                    setPaymentPin("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (payingTicket && paymentPin.length === 5) {
                      payTicketMutation.mutate({ id: payingTicket.id, pin: paymentPin });
                    }
                  }}
                  disabled={paymentPin.length !== 5 || payTicketMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-confirm-payment"
                >
                  {payTicketMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Confirm Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
