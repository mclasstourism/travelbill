import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, CreditCard, Search, Loader2, ArrowUpCircle, ArrowDownCircle, Banknote, Building, Eye, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { z } from "zod";
import type { Vendor, VendorTransaction } from "@shared/schema";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

const addTransactionFormSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  transactionType: z.enum(["credit", "deposit"]),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  paymentMethod: z.enum(["cash", "cheque", "bank_transfer"]),
});

type AddTransactionForm = z.infer<typeof addTransactionFormSchema>;

export default function VendorCreditsPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const { toast } = useToast();

  const { data: vendors = [], isLoading: isLoadingVendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<VendorTransaction[]>({
    queryKey: ["/api/vendor-transactions"],
  });

  const form = useForm<AddTransactionForm>({
    resolver: zodResolver(addTransactionFormSchema),
    defaultValues: {
      vendorId: "",
      transactionType: "deposit",
      amount: 0,
      description: "",
      paymentMethod: "cash",
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (data: AddTransactionForm) => {
      const res = await apiRequest("POST", "/api/vendor-transactions", {
        ...data,
        type: "credit",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setIsAddOpen(false);
      form.reset();
      toast({
        title: "Transaction added",
        description: "The vendor transaction has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add transaction",
        variant: "destructive",
      });
    },
  });

  const filteredVendors = vendors.filter((vendor) =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.phone?.includes(searchQuery)
  );

  const vendorTransactions = selectedVendor 
    ? transactions
        .filter(tx => tx.vendorId === selectedVendor.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const totalCredits = vendors.reduce((sum, v) => sum + v.creditBalance, 0);
  const totalDeposits = vendors.reduce((sum, v) => sum + v.depositBalance, 0);

  const onSubmit = (data: AddTransactionForm) => {
    addTransactionMutation.mutate(data);
  };

  const handleViewHistory = (vendor: Vendor) => {
    setSelectedVendor(vendor);
  };

  if (selectedVendor) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedVendor(null)} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-vendor-history-title">
              {selectedVendor.name} - Transaction History
            </h1>
            <p className="text-sm text-muted-foreground">
              Phone: {selectedVendor.phone}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {formatCurrency(selectedVendor.creditBalance)}
              </div>
              <p className="text-xs text-muted-foreground">Credit line from vendor</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deposit Balance</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
                {formatCurrency(selectedVendor.depositBalance)}
              </div>
              <p className="text-xs text-muted-foreground">Advance paid to vendor</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vendorTransactions.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {vendorTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No transactions found</p>
                <p className="text-sm">Add a transaction to see history</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right text-blue-600 dark:text-blue-400">Credit Balance</TableHead>
                      <TableHead className="text-right text-green-600 dark:text-green-400">Deposit Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorTransactions.map((tx) => {
                      const isCreditType = tx.transactionType === "credit";
                      const isDepositType = tx.transactionType === "deposit";
                      return (
                        <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                          <TableCell className="font-mono text-sm">
                            {format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell>
                            <Badge variant={isCreditType ? "default" : "secondary"}>
                              {isCreditType ? "Credit Line" : "Deposit"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {tx.type === "credit" ? (
                              <Badge variant="default" className="bg-green-600">
                                <ArrowUpCircle className="w-3 h-3 mr-1" />
                                Added
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <ArrowDownCircle className="w-3 h-3 mr-1" />
                                Used
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-mono font-semibold ${tx.type === "credit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {isCreditType ? formatCurrency(tx.balanceAfter) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-green-600 dark:text-green-400">
                            {isDepositType ? formatCurrency(tx.balanceAfter) : "-"}
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-vendor-credits-title">Vendor Credits & Deposits</h1>
            <p className="text-sm text-muted-foreground">Track vendor credit lines and advance payments</p>
          </div>
        </div>
        <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-transaction">
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendor Credits</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
              {formatCurrency(totalCredits)}
            </div>
            <p className="text-xs text-muted-foreground">Credit lines available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendor Deposits</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono">
              {formatCurrency(totalDeposits)}
            </div>
            <p className="text-xs text-muted-foreground">Advances paid to vendors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.length}</div>
          </CardContent>
        </Card>
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
          {isLoadingVendors ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No vendors found</p>
              <p className="text-sm">Add vendors first to track credits</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Credit Balance</TableHead>
                    <TableHead className="text-right">Deposit Balance</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell className="text-muted-foreground">{vendor.phone || "-"}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(vendor.creditBalance)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(vendor.depositBalance)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewHistory(vendor)}
                          data-testid={`button-view-history-${vendor.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          History
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Vendor Transaction</DialogTitle>
            <DialogDescription>
              Record a new credit or deposit transaction for a vendor.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-vendor">
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

              <FormField
                control={form.control}
                name="transactionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-transaction-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="credit">Credit Line (vendor gives us credit)</SelectItem>
                        <SelectItem value="deposit">Deposit (we pay advance to vendor)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (AED) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Credit line increase"
                        {...field}
                        data-testid="input-description"
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
                  onClick={() => setIsAddOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addTransactionMutation.isPending}
                  data-testid="button-save-transaction"
                >
                  {addTransactionMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Add Transaction
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
