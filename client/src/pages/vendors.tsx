import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Building2, Search, Loader2, Plane, FileText, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Check, ChevronsUpDown, Pencil, ChevronDown, Image, Upload } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVendorSchema, type Vendor, type InsertVendor, type VendorTransaction, type Ticket } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { airlines } from "@/lib/airlines";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

const LOW_BALANCE_THRESHOLD = 5000; // AED - show warning when balance is below this

export default function VendorsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const { toast } = useToast();

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  // Fetch vendor transactions when a vendor is selected (using vendor-specific endpoint)
  const { data: vendorTransactions = [], isLoading: transactionsLoading } = useQuery<VendorTransaction[]>({
    queryKey: [`/api/vendors/${selectedVendor?.id}/transactions`],
    enabled: !!selectedVendor && isStatementOpen,
  });

  // Fetch tickets for this vendor (using vendor-specific endpoint)
  const { data: vendorTickets = [], isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: [`/api/vendors/${selectedVendor?.id}/tickets`],
    enabled: !!selectedVendor && isStatementOpen,
  });

  // Combined loading state
  const statementLoading = transactionsLoading || ticketsLoading;

  // Build unified chronological ledger combining deposits/credits and ticket purchases
  const buildLedger = () => {
    if (!selectedVendor) return [];
    
    const ledgerItems: {
      date: Date;
      description: string;
      type: 'deposit' | 'credit' | 'ticket' | 'deduction';
      debit: number;
      credit: number;
    }[] = [];

    // Add deposit transactions
    vendorTransactions.forEach(t => {
      ledgerItems.push({
        date: new Date(t.createdAt),
        description: t.description,
        type: t.transactionType === 'deposit' 
          ? (t.type === 'credit' ? 'deposit' : 'deduction')
          : 'credit',
        debit: t.type === 'debit' ? t.amount : 0,
        credit: t.type === 'credit' ? t.amount : 0,
      });
    });

    // Add ticket purchases as deductions
    vendorTickets.forEach(ticket => {
      ledgerItems.push({
        date: new Date(ticket.createdAt),
        description: `Ticket #${ticket.ticketNumber} - ${ticket.passengerName} (${ticket.route})`,
        type: 'ticket',
        debit: ticket.faceValue,
        credit: 0,
      });
    });

    // Sort by date
    ledgerItems.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate running balance
    let balance = 0;
    return ledgerItems.map(item => {
      balance += item.credit - item.debit;
      return { ...item, balance };
    });
  };

  const ledger = buildLedger();

  // Calculate totals for reconciliation
  const totalDeposits = vendorTransactions
    .filter(t => t.transactionType === 'deposit' && t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalTicketPurchases = vendorTickets.reduce((sum, t) => sum + t.faceValue, 0);
  
  const otherDeductions = vendorTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const calculatedDepositBalance = totalDeposits - totalTicketPurchases - otherDeductions;

  // Vendors with low balance (includes zero and negative)
  const lowBalanceVendors = vendors.filter(v => v.depositBalance <= LOW_BALANCE_THRESHOLD);

  // Open vendor statement
  const openStatement = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsStatementOpen(true);
  };

  const [selectedAirlineIds, setSelectedAirlineIds] = useState<string[]>([]);
  const [airlinePopoverOpen, setAirlinePopoverOpen] = useState(false);
  const [editSelectedAirlineIds, setEditSelectedAirlineIds] = useState<string[]>([]);
  const [editAirlinePopoverOpen, setEditAirlinePopoverOpen] = useState(false);

  const form = useForm<InsertVendor>({
    resolver: zodResolver(insertVendorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      telephone: "",
      address: "",
      creditBalance: 0,
      depositBalance: 0,
      airlines: [],
    },
  });

  const editForm = useForm<InsertVendor>({
    resolver: zodResolver(insertVendorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      telephone: "",
      address: "",
      creditBalance: 0,
      depositBalance: 0,
      airlines: [],
    },
  });

  const toggleAirline = (airlineId: string) => {
    setSelectedAirlineIds(prev => {
      const newSelection = prev.includes(airlineId)
        ? prev.filter(id => id !== airlineId)
        : [...prev, airlineId];
      
      const selectedAirlines = airlines
        .filter(a => newSelection.includes(a.id))
        .map(a => ({ name: a.name, code: a.code }));
      form.setValue("airlines", selectedAirlines);
      
      return newSelection;
    });
  };

  const toggleEditAirline = (airlineId: string) => {
    setEditSelectedAirlineIds(prev => {
      const newSelection = prev.includes(airlineId)
        ? prev.filter(id => id !== airlineId)
        : [...prev, airlineId];
      
      const selectedAirlines = airlines
        .filter(a => newSelection.includes(a.id))
        .map(a => ({ name: a.name, code: a.code }));
      editForm.setValue("airlines", selectedAirlines);
      
      return newSelection;
    });
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor(vendor);
    editForm.reset({
      name: vendor.name,
      email: vendor.email || "",
      phone: vendor.phone || "",
      telephone: vendor.telephone || "",
      address: vendor.address || "",
      creditBalance: vendor.creditBalance,
      depositBalance: vendor.depositBalance,
      airlines: vendor.airlines || [],
    });
    // Set selected airline IDs based on vendor's airlines
    const airlineIds = (vendor.airlines || [])
      .map(a => airlines.find(al => al.name === a.name || al.code === a.code)?.id)
      .filter((id): id is string => !!id);
    setEditSelectedAirlineIds(airlineIds);
    setIsEditOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertVendor) => {
      const res = await apiRequest("POST", "/api/vendors", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setIsCreateOpen(false);
      form.reset();
      setSelectedAirlineIds([]);
      toast({
        title: "Vendor created",
        description: "The vendor has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create vendor",
        variant: "destructive",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: InsertVendor) => {
      if (!editingVendor) throw new Error("No vendor selected");
      const res = await apiRequest("PATCH", `/api/vendors/${editingVendor.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setIsEditOpen(false);
      setEditingVendor(null);
      editForm.reset();
      setEditSelectedAirlineIds([]);
      toast({
        title: "Vendor updated",
        description: "The vendor has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update vendor",
        variant: "destructive",
      });
    },
  });

  const onEditSubmit = (data: InsertVendor) => {
    editMutation.mutate(data);
  };

  const filteredVendors = vendors.filter((vendor) =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.phone?.includes(searchQuery)
  );

  const onSubmit = (data: InsertVendor) => {
    createMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="lg:hidden" data-testid="button-sidebar-toggle" />
          <div>
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-vendors-title">Vendors</h1>
            <p className="text-sm text-muted-foreground">Manage your supplier database</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto" data-testid="button-add-vendor">
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Low Balance Alert */}
      {lowBalanceVendors.length > 0 && (
        <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">Low Balance Warning</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
            {lowBalanceVendors.length} vendor(s) have balance below {formatCurrency(LOW_BALANCE_THRESHOLD)}:{" "}
            <span className="font-medium">
              {lowBalanceVendors.map(v => `${v.name} (${formatCurrency(v.depositBalance)})`).join(", ")}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-vendors"
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
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No vendors found</p>
              <p className="text-sm">Add your first vendor to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Telephone</TableHead>
                    <TableHead>Airlines</TableHead>
                    <TableHead className="text-right">Credit Balance</TableHead>
                    <TableHead className="text-right">Deposit Balance</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {vendor.logo ? (
                            <img 
                              src={vendor.logo} 
                              alt={vendor.name} 
                              className="w-8 h-8 object-contain rounded border"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded border bg-muted flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <span>{vendor.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {vendor.phone ? `+971 ${vendor.phone}` : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {vendor.telephone || "-"}
                      </TableCell>
                      <TableCell>
                        {vendor.airlines && vendor.airlines.length > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1"
                                data-testid={`button-view-airlines-${vendor.id}`}
                              >
                                <Plane className="w-3 h-3" />
                                <span>{vendor.airlines.length} airline(s)</span>
                                <ChevronDown className="w-3 h-3 ml-1" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-0" align="start">
                              <div className="max-h-48 overflow-y-auto overscroll-contain p-2">
                                {vendor.airlines.map((airline, idx) => {
                                  const airlineData = airlines.find(a => a.name === airline.name || a.code === airline.code);
                                  return (
                                    <div key={idx} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted">
                                      {airlineData?.logo && (
                                        <img 
                                          src={airlineData.logo} 
                                          alt={airline.name} 
                                          className="w-6 h-4 object-contain rounded-sm"
                                        />
                                      )}
                                      <span className="text-sm">{airline.name}</span>
                                      {airline.code && (
                                        <span className="text-xs text-muted-foreground">({airline.code})</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <span className="text-blue-600 dark:text-blue-400">
                          {formatCurrency(vendor.creditBalance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-green-600 dark:text-green-400">
                            {formatCurrency(vendor.depositBalance)}
                          </span>
                          {vendor.depositBalance <= LOW_BALANCE_THRESHOLD && (
                            <span title="Low balance">
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(vendor)}
                            data-testid={`button-edit-vendor-${vendor.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openStatement(vendor)}
                            data-testid={`button-view-statement-${vendor.id}`}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Statement
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Enter the vendor/supplier details below.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Vendor/Supplier name"
                        {...field}
                        data-testid="input-vendor-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        {...field}
                        data-testid="input-vendor-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 text-sm border border-r-0 rounded-l-md bg-muted text-muted-foreground">
                          +971
                        </span>
                        <Input
                          placeholder="501234567"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 9))}
                          maxLength={9}
                          data-testid="input-vendor-phone"
                          className="rounded-l-none"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telephone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telephone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="04-1234567"
                        {...field}
                        data-testid="input-vendor-telephone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Business address"
                        {...field}
                        data-testid="input-vendor-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => {
                  const fileInputRef = useRef<HTMLInputElement>(null);
                  const { uploadFile, isUploading } = useUpload({
                    onSuccess: (response) => {
                      field.onChange(response.objectPath);
                    },
                  });
                  
                  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await uploadFile(file);
                    }
                  };
                  
                  return (
                    <FormItem>
                      <FormLabel>Logo (optional)</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              placeholder="Enter URL or upload file"
                              className="pl-10"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-vendor-logo"
                            />
                          </div>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            data-testid="button-upload-vendor-logo"
                          >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          </Button>
                          {field.value && (
                            <img
                              src={field.value}
                              alt="Preview"
                              className="w-10 h-10 object-contain rounded border"
                            />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <div className="space-y-3">
                <FormLabel>Airlines</FormLabel>
                <Popover open={airlinePopoverOpen} onOpenChange={setAirlinePopoverOpen} modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={airlinePopoverOpen}
                      className="w-full justify-between"
                      data-testid="button-select-airlines"
                    >
                      {selectedAirlineIds.length === 0
                        ? "Select airlines..."
                        : `${selectedAirlineIds.length} airline${selectedAirlineIds.length > 1 ? "s" : ""} selected`}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start" style={{ pointerEvents: "auto" }}>
                    <Command>
                      <CommandInput placeholder="Search airlines..." />
                      <CommandList className="max-h-64 overflow-y-auto overscroll-contain touch-scroll" style={{ pointerEvents: "auto", WebkitOverflowScrolling: "touch" }}>
                        <CommandEmpty>No airline found.</CommandEmpty>
                        <CommandGroup>
                          {airlines.map((airline) => (
                            <CommandItem
                              key={airline.id}
                              value={airline.name}
                              onSelect={() => toggleAirline(airline.id)}
                              className="cursor-pointer"
                              data-testid={`option-airline-${airline.id}`}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className={cn(
                                  "flex h-4 w-4 items-center justify-center rounded-sm border",
                                  selectedAirlineIds.includes(airline.id)
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-muted-foreground/50"
                                )}>
                                  {selectedAirlineIds.includes(airline.id) && (
                                    <Check className="h-3 w-3" />
                                  )}
                                </div>
                                <img 
                                  src={airline.logo} 
                                  alt={airline.name} 
                                  className="w-8 h-6 object-contain rounded"
                                />
                                <span className="flex-1">{airline.name}</span>
                                <span className="text-muted-foreground text-sm">({airline.code})</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsCreateOpen(false);
                    form.reset();
                    setSelectedAirlineIds([]);
                  }}
                  data-testid="button-cancel-vendor"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-save-vendor"
                >
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Vendor
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update the vendor/supplier details below.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter vendor name"
                        {...field}
                        data-testid="input-edit-vendor-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="vendor@example.com"
                        {...field}
                        data-testid="input-edit-vendor-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                          +971
                        </span>
                        <Input
                          placeholder="501234567"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 9))}
                          maxLength={9}
                          data-testid="input-edit-vendor-phone"
                          className="rounded-l-none"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="telephone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telephone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="04-1234567"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edit-vendor-telephone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter address"
                        {...field}
                        data-testid="input-edit-vendor-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="logo"
                render={({ field }) => {
                  const fileInputRef = useRef<HTMLInputElement>(null);
                  const { uploadFile, isUploading } = useUpload({
                    onSuccess: (response) => {
                      field.onChange(response.objectPath);
                    },
                  });
                  
                  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await uploadFile(file);
                    }
                  };
                  
                  return (
                    <FormItem>
                      <FormLabel>Logo (optional)</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              placeholder="Enter URL or upload file"
                              className="pl-10"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-edit-vendor-logo"
                            />
                          </div>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            data-testid="button-edit-upload-vendor-logo"
                          >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          </Button>
                          {field.value && (
                            <img
                              src={field.value}
                              alt="Preview"
                              className="w-10 h-10 object-contain rounded border"
                            />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <div>
                <FormLabel>Registered Airlines</FormLabel>
                <Popover open={editAirlinePopoverOpen} onOpenChange={setEditAirlinePopoverOpen} modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={editAirlinePopoverOpen}
                      className="w-full justify-between mt-2"
                      data-testid="button-edit-select-airlines"
                    >
                      {editSelectedAirlineIds.length === 0
                        ? "Select airlines..."
                        : `${editSelectedAirlineIds.length} airline(s) selected`}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start" style={{ pointerEvents: "auto" }}>
                    <Command>
                      <CommandInput placeholder="Search airlines..." />
                      <CommandList className="max-h-64 overflow-y-auto overscroll-contain touch-scroll" style={{ pointerEvents: "auto", WebkitOverflowScrolling: "touch" }}>
                        <CommandEmpty>No airline found.</CommandEmpty>
                        <CommandGroup>
                          {airlines.map((airline) => (
                            <CommandItem
                              key={airline.id}
                              value={airline.name}
                              onSelect={() => toggleEditAirline(airline.id)}
                              className="cursor-pointer"
                              data-testid={`option-edit-airline-${airline.id}`}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className={cn(
                                  "flex h-4 w-4 items-center justify-center rounded-sm border",
                                  editSelectedAirlineIds.includes(airline.id)
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-muted-foreground/50"
                                )}>
                                  {editSelectedAirlineIds.includes(airline.id) && (
                                    <Check className="h-3 w-3" />
                                  )}
                                </div>
                                <img 
                                  src={airline.logo} 
                                  alt={airline.name} 
                                  className="w-8 h-6 object-contain rounded"
                                />
                                <span className="flex-1">{airline.name}</span>
                                <span className="text-muted-foreground text-sm">({airline.code})</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingVendor(null);
                    editForm.reset();
                    setEditSelectedAirlineIds([]);
                  }}
                  data-testid="button-cancel-edit-vendor"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editMutation.isPending}
                  data-testid="button-save-edit-vendor"
                >
                  {editMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Update Vendor
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Vendor Statement Dialog */}
      <Dialog open={isStatementOpen} onOpenChange={setIsStatementOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Vendor Statement: {selectedVendor?.name}
            </DialogTitle>
            <DialogDescription>
              Complete transaction history and balance reconciliation
            </DialogDescription>
          </DialogHeader>

          {selectedVendor && (
            <Tabs defaultValue="statement" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="statement">Transaction Statement</TabsTrigger>
                <TabsTrigger value="reconciliation">Balance Reconciliation</TabsTrigger>
              </TabsList>

              <TabsContent value="statement" className="space-y-4">
                {/* Current Balance Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <p className="text-sm text-muted-foreground">Deposit Balance</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono">
                        {formatCurrency(selectedVendor.depositBalance)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <p className="text-sm text-muted-foreground">Credit Balance</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                        {formatCurrency(selectedVendor.creditBalance)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Transaction History - Unified Chronological Ledger */}
                <div>
                  <h3 className="font-semibold mb-3">Transaction History</h3>
                  {statementLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading transactions...
                    </div>
                  ) : ledger.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No transactions found</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Debit (-)</TableHead>
                          <TableHead className="text-right">Credit (+)</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledger.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-sm">
                              {item.date.toLocaleDateString()}
                            </TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>
                              <Badge variant={item.credit > 0 ? "secondary" : "outline"}>
                                {item.type === 'deposit' && (
                                  <>
                                    <ArrowUpCircle className="w-3 h-3 mr-1 text-green-600" />
                                    Deposit
                                  </>
                                )}
                                {item.type === 'credit' && (
                                  <>
                                    <ArrowUpCircle className="w-3 h-3 mr-1 text-blue-600" />
                                    Credit
                                  </>
                                )}
                                {item.type === 'ticket' && (
                                  <>
                                    <Plane className="w-3 h-3 mr-1" />
                                    Ticket
                                  </>
                                )}
                                {item.type === 'deduction' && (
                                  <>
                                    <ArrowDownCircle className="w-3 h-3 mr-1 text-red-600" />
                                    Deduction
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-red-600">
                              {item.debit > 0 ? formatCurrency(item.debit) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">
                              {item.credit > 0 ? formatCurrency(item.credit) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              <span className={item.balance < 0 ? "text-red-600" : ""}>
                                {formatCurrency(item.balance)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reconciliation" className="space-y-4">
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold">Balance Reconciliation</h3>
                    <p className="text-sm text-muted-foreground">
                      Compare your calculated balance with the vendor's records
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {statementLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading data for reconciliation...
                      </div>
                    ) : (
                      <>
                        {/* Calculated Summary */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-muted-foreground">Total Deposits Made:</span>
                            <span className="font-mono font-semibold text-green-600">
                              {formatCurrency(totalDeposits)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-muted-foreground">Total Ticket Purchases (Face Value):</span>
                            <span className="font-mono font-semibold text-red-600">
                              {formatCurrency(totalTicketPurchases)}
                            </span>
                          </div>
                          {otherDeductions > 0 && (
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-muted-foreground">Other Deductions:</span>
                              <span className="font-mono font-semibold text-red-600">
                                {formatCurrency(otherDeductions)}
                              </span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between items-center py-2 bg-muted/50 px-3 rounded-md">
                            <span className="font-semibold">Calculated Deposit Balance:</span>
                            <span className={`font-mono font-bold text-lg ${calculatedDepositBalance < 0 ? 'text-red-600' : ''}`}>
                              {formatCurrency(calculatedDepositBalance)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 bg-primary/10 px-3 rounded-md">
                            <span className="font-semibold">Current System Balance:</span>
                            <span className={`font-mono font-bold text-lg ${selectedVendor.depositBalance < 0 ? 'text-red-600' : 'text-green-600 dark:text-green-400'}`}>
                              {formatCurrency(selectedVendor.depositBalance)}
                            </span>
                          </div>
                        </div>

                        {/* Discrepancy Alert */}
                        {(() => {
                          const difference = selectedVendor.depositBalance - calculatedDepositBalance;
                          
                          if (Math.abs(difference) > 0.01) {
                            return (
                              <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Balance Discrepancy Detected</AlertTitle>
                                <AlertDescription>
                                  There is a difference of <strong>{formatCurrency(Math.abs(difference))}</strong> between 
                                  the calculated balance and the current system balance. 
                                  This may indicate missing transactions or data entry errors.
                                </AlertDescription>
                              </Alert>
                            );
                          }
                          return (
                            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                              <AlertTitle className="text-green-700 dark:text-green-400">Balance Verified</AlertTitle>
                              <AlertDescription className="text-green-600 dark:text-green-300">
                                The calculated balance matches the current system balance. No discrepancies found.
                              </AlertDescription>
                            </Alert>
                          );
                        })()}

                        {/* Transaction Summary */}
                        <div className="pt-4">
                          <h4 className="font-medium mb-2">Transaction Summary</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between py-1">
                              <span className="text-muted-foreground">Total Deposits:</span>
                              <Badge variant="secondary">
                                {vendorTransactions.filter(t => t.transactionType === "deposit" && t.type === "credit").length}
                              </Badge>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-muted-foreground">Total Tickets Purchased:</span>
                              <Badge variant="secondary">{vendorTickets.length}</Badge>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
