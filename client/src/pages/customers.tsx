import { useState, useEffect, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Plus, Users, Search, Loader2, Pencil, Trash2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type Customer, type InsertCustomer, type DepositTransaction } from "@shared/schema";

function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}

function CustomerTransactionHistory({ customerId }: { customerId: string }) {
  const { data: transactions = [], isLoading } = useQuery<DepositTransaction[]>({
    queryKey: [`/api/customers/${customerId}/deposits`],
  });

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="bg-muted/30 p-4">
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
        <TableCell colSpan={7} className="bg-muted/30 p-4 text-center text-muted-foreground">
          No transactions found
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell colSpan={7} className="bg-muted/30 p-0">
        <div className="px-6 py-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Deposit Available</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} data-testid={`row-customer-tx-${tx.id}`}>
                  <TableCell className="text-muted-foreground text-sm">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + new Date(tx.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-"}
                  </TableCell>
                  <TableCell>{tx.description || "-"}</TableCell>
                  <TableCell>Deposit</TableCell>
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
                    {formatCurrency(tx.balanceAfter)}
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

export default function CustomersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: "",
      phone: "",
      company: "",
      address: "",
      email: "",
      depositBalance: 0,
    },
  });

  const editForm = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: "",
      phone: "",
      company: "",
      address: "",
      email: "",
      depositBalance: 0,
    },
  });

  useEffect(() => {
    if (editingCustomer) {
      editForm.reset({
        name: editingCustomer.name,
        phone: editingCustomer.phone,
        company: editingCustomer.company || "",
        address: editingCustomer.address || "",
        email: editingCustomer.email || "",
        depositBalance: editingCustomer.depositBalance,
      });
    }
  }, [editingCustomer, editForm]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Customer created",
        description: "The customer has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      if (!editingCustomer) throw new Error("No customer selected");
      const res = await apiRequest("PATCH", `/api/customers/${editingCustomer.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setIsEditOpen(false);
      setEditingCustomer(null);
      editForm.reset();
      toast({
        title: "Customer updated",
        description: "The customer has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await apiRequest("DELETE", `/api/customers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deposit-transactions"] });
      setIsDeleteOpen(false);
      setDeletingCustomer(null);
      toast({
        title: "Customer deleted",
        description: "The customer has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer.",
        variant: "destructive",
      });
    },
  });

  const uniqueCompanies = Array.from(new Set(customers.map(c => c.company).filter(Boolean))) as string[];

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = searchQuery === "" ||
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery);
    const matchesBalance = balanceFilter === "all" ||
      (balanceFilter === "has_deposit" && (customer.depositBalance ?? 0) > 0) ||
      (balanceFilter === "no_deposit" && (customer.depositBalance ?? 0) === 0);
    const matchesCompany = companyFilter === "all" || customer.company === companyFilter;
    return matchesSearch && matchesBalance && matchesCompany;
  });

  const onSubmit = (data: InsertCustomer) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertCustomer) => {
    updateMutation.mutate(data);
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (customer: Customer) => {
    setDeletingCustomer(customer);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingCustomer) return;
    deleteMutation.mutate({ id: deletingCustomer.id });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-customers-title">Customers</h1>
            <p className="text-sm text-muted-foreground">Manage your customer database</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-customer">
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-customers"
              />
            </div>
            <Select value={balanceFilter} onValueChange={setBalanceFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-balance-filter">
                <SelectValue placeholder="Balance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Balances</SelectItem>
                <SelectItem value="has_deposit">Has Deposit</SelectItem>
                <SelectItem value="no_deposit">No Deposit</SelectItem>
              </SelectContent>
            </Select>
            {uniqueCompanies.length > 0 && (
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-company-filter">
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {uniqueCompanies.map((company) => (
                    <SelectItem key={company} value={company}>{company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No customers found</p>
              <p className="text-sm">Add your first customer to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Deposit Balance</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <Fragment key={customer.id}>
                      <TableRow
                        data-testid={`row-customer-${customer.id}`}
                        className="cursor-pointer"
                        onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {expandedCustomer === customer.id ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            {customer.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {customer.phone || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {customer.company || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          <span className={customer.depositBalance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                            {formatCurrency(customer.depositBalance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); handleEditClick(customer); }}
                              data-testid={`button-edit-customer-${customer.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); handleDeleteClick(customer); }}
                              data-testid={`button-delete-customer-${customer.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedCustomer === customer.id && (
                        <CustomerTransactionHistory customerId={customer.id} />
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
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Enter the customer details below.
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
                        placeholder="Customer name"
                        {...field}
                        data-testid="input-customer-name"
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
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+971 50 123 4567"
                        {...field}
                        data-testid="input-customer-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Company name"
                        {...field}
                        data-testid="input-customer-company"
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
                        placeholder="Street address"
                        {...field}
                        data-testid="input-customer-address"
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
                        data-testid="input-customer-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
                  data-testid="button-cancel-customer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-save-customer"
                >
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Customer
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) setEditingCustomer(null);
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update the customer details below.
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
                        placeholder="Customer name"
                        {...field}
                        data-testid="input-edit-customer-name"
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
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+971 50 123 4567"
                        {...field}
                        data-testid="input-edit-customer-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Company name"
                        {...field}
                        data-testid="input-edit-customer-company"
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
                        placeholder="Street address"
                        {...field}
                        data-testid="input-edit-customer-address"
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
                        placeholder="email@example.com"
                        {...field}
                        data-testid="input-edit-customer-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingCustomer(null);
                  }}
                  data-testid="button-cancel-edit-customer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-update-customer"
                >
                  {updateMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Update Customer
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={(open) => {
        setIsDeleteOpen(open);
        if (!open) {
          setDeletingCustomer(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Customer
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingCustomer?.name}</strong>?
              <br /><br />
              This will also delete all associated deposit transactions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              data-testid="button-cancel-delete-customer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-customer"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
