import { useState, useEffect, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Plus, Building2, Search, Loader2, Trash2, Plane, Pencil, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVendorSchema, type Vendor, type InsertVendor, type VendorTransaction } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}

function VendorTransactionHistory({ vendorId }: { vendorId: string }) {
  const { data: transactions = [], isLoading } = useQuery<VendorTransaction[]>({
    queryKey: [`/api/vendors/${vendorId}/transactions`],
  });

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="bg-muted/30 p-4">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading transactions...
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (transactions.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="bg-muted/30 p-4 text-center text-muted-foreground">
          No transactions found
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell colSpan={8} className="bg-muted/30 p-0">
        <div className="px-6 py-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Credit Owed</TableHead>
                <TableHead className="text-right">Deposit Available</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} data-testid={`row-vendor-tx-${tx.id}`}>
                  <TableCell className="text-muted-foreground text-sm">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + new Date(tx.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-"}
                  </TableCell>
                  <TableCell>{tx.description || "-"}</TableCell>
                  <TableCell className="capitalize">{tx.transactionType}</TableCell>
                  <TableCell>
                    {tx.type === "credit" ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-tx-added-${tx.id}`}>Added</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-tx-used-${tx.id}`}>Used</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={tx.type === "credit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                      {tx.type === "credit" ? "+" : "-"}AED {Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {tx.transactionType === "credit" ? formatCurrency(tx.balanceAfter) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {tx.transactionType === "deposit" ? formatCurrency(tx.balanceAfter) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function VendorsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [emails, setEmails] = useState<string[]>([""]);
  const [editEmails, setEditEmails] = useState<string[]>([""]);
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const form = useForm<InsertVendor>({
    resolver: zodResolver(insertVendorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
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
      address: "",
      creditBalance: 0,
      depositBalance: 0,
      airlines: [],
    },
  });

  const { fields: airlineFields, append: appendAirline, remove: removeAirline } = useFieldArray({
    control: form.control,
    name: "airlines",
  });

  const { fields: editAirlineFields, append: appendEditAirline, remove: removeEditAirline } = useFieldArray({
    control: editForm.control,
    name: "airlines",
  });

  useEffect(() => {
    if (editingVendor) {
      const existingEmails = editingVendor.email
        ? editingVendor.email.split(",").map((e: string) => e.trim()).filter(Boolean)
        : [""];
      setEditEmails(existingEmails.length > 0 ? existingEmails : [""]);
      editForm.reset({
        name: editingVendor.name,
        email: editingVendor.email || "",
        phone: editingVendor.phone,
        address: editingVendor.address || "",
        creditBalance: editingVendor.creditBalance,
        depositBalance: editingVendor.depositBalance,
        airlines: editingVendor.airlines || [],
      });
    }
  }, [editingVendor, editForm]);

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
      setEmails([""]);
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

  const updateMutation = useMutation({
    mutationFn: async (data: InsertVendor & { id: string }) => {
      const { id, ...updateData } = data;
      const res = await apiRequest("PATCH", `/api/vendors/${id}`, updateData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setIsEditOpen(false);
      setEditingVendor(null);
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

  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await apiRequest("DELETE", `/api/vendors/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-transactions"] });
      setIsDeleteOpen(false);
      setDeletingVendor(null);
      toast({
        title: "Vendor deleted",
        description: "The vendor has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vendor.",
        variant: "destructive",
      });
    },
  });

  const filteredVendors = vendors.filter((vendor) =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.phone?.includes(searchQuery)
  );

  const onSubmit = (data: InsertVendor) => {
    const joinedEmails = emails.map(e => e.trim()).filter(Boolean).join(", ");
    createMutation.mutate({ ...data, email: joinedEmails });
  };

  const onEditSubmit = (data: InsertVendor) => {
    if (editingVendor) {
      const joinedEmails = editEmails.map(e => e.trim()).filter(Boolean).join(", ");
      updateMutation.mutate({ ...data, email: joinedEmails, id: editingVendor.id });
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (vendor: Vendor) => {
    setDeletingVendor(vendor);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingVendor) return;
    deleteMutation.mutate({ id: deletingVendor.id });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-vendors-title">Vendors</h1>
            <p className="text-sm text-muted-foreground">Manage your supplier database</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-vendor">
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
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
                    <TableHead>Phone</TableHead>
                    <TableHead>Airlines</TableHead>
                    <TableHead className="text-right">Credit Balance</TableHead>
                    <TableHead className="text-right">Deposit Balance</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <Fragment key={vendor.id}>
                      <TableRow
                        data-testid={`row-vendor-${vendor.id}`}
                        className="cursor-pointer"
                        onClick={() => setExpandedVendor(expandedVendor === vendor.id ? null : vendor.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {expandedVendor === vendor.id ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            {vendor.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {vendor.phone || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {vendor.airlines && vendor.airlines.length > 0 ? (
                              vendor.airlines.map((airline, idx) => (
                                <Badge key={idx} variant="secondary">
                                  <Plane className="w-3 h-3 mr-1" />
                                  {airline.code ? `${airline.name} (${airline.code})` : airline.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          <span className="text-green-700 dark:text-green-400">
                            {formatCurrency(vendor.creditBalance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          <span className="text-green-600 dark:text-green-400">
                            {formatCurrency(vendor.depositBalance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handleEdit(vendor); }}
                              data-testid={`button-edit-vendor-${vendor.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handleDeleteClick(vendor); }}
                              data-testid={`button-delete-vendor-${vendor.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedVendor === vendor.id && (
                        <VendorTransactionHistory vendorId={vendor.id} />
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label>Email</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEmails([...emails, ""])}
                    data-testid="button-add-email"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Email
                  </Button>
                </div>
                {emails.map((email, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => {
                        const updated = [...emails];
                        updated[index] = e.target.value;
                        setEmails(updated);
                      }}
                      data-testid={`input-vendor-email-${index}`}
                    />
                    {emails.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setEmails(emails.filter((_, i) => i !== index))}
                        data-testid={`button-remove-email-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+1 (555) 123-4567"
                        {...field}
                        data-testid="input-vendor-phone"
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Airlines</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendAirline({ name: "", code: "" })}
                    data-testid="button-add-airline"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Airline
                  </Button>
                </div>
                {airlineFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No airlines registered. Click "Add Airline" to add one.</p>
                ) : (
                  <div className="space-y-2">
                    {airlineFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <Input
                          placeholder="Airline name (e.g., Emirates)"
                          {...form.register(`airlines.${index}.name`)}
                          data-testid={`input-airline-name-${index}`}
                        />
                        <Input
                          placeholder="Code (e.g., EK)"
                          className="w-24"
                          {...form.register(`airlines.${index}.code`)}
                          data-testid={`input-airline-code-${index}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAirline(index)}
                          data-testid={`button-remove-airline-${index}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
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

      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) setEditingVendor(null);
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
                        placeholder="Vendor/Supplier name"
                        {...field}
                        data-testid="input-edit-vendor-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label>Email</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditEmails([...editEmails, ""])}
                    data-testid="button-edit-add-email"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Email
                  </Button>
                </div>
                {editEmails.map((email, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => {
                        const updated = [...editEmails];
                        updated[index] = e.target.value;
                        setEditEmails(updated);
                      }}
                      data-testid={`input-edit-vendor-email-${index}`}
                    />
                    {editEmails.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditEmails(editEmails.filter((_, i) => i !== index))}
                        data-testid={`button-edit-remove-email-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+1 (555) 123-4567"
                        {...field}
                        data-testid="input-edit-vendor-phone"
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
                        placeholder="Business address"
                        {...field}
                        data-testid="input-edit-vendor-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Airlines</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendEditAirline({ name: "", code: "" })}
                    data-testid="button-add-edit-airline"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Airline
                  </Button>
                </div>
                {editAirlineFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No airlines registered. Click "Add Airline" to add one.</p>
                ) : (
                  <div className="space-y-2">
                    {editAirlineFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <Input
                          placeholder="Airline name (e.g., Emirates)"
                          {...editForm.register(`airlines.${index}.name`)}
                          data-testid={`input-edit-airline-name-${index}`}
                        />
                        <Input
                          placeholder="Code (e.g., EK)"
                          className="w-24"
                          {...editForm.register(`airlines.${index}.code`)}
                          data-testid={`input-edit-airline-code-${index}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEditAirline(index)}
                          data-testid={`button-remove-edit-airline-${index}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingVendor(null);
                  }}
                  data-testid="button-cancel-edit-vendor"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-update-vendor"
                >
                  {updateMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Update Vendor
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={(open) => {
        setIsDeleteOpen(open);
        if (!open) {
          setDeletingVendor(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Vendor
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingVendor?.name}</strong>?
              <br /><br />
              This will also delete all associated credit transactions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              data-testid="button-cancel-delete-vendor"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-vendor"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
