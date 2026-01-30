import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, CreditCard, Search, Loader2, ArrowUpCircle, ArrowDownCircle, Banknote, Briefcase, FileCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { z } from "zod";
import type { Agent, AgentTransaction } from "@shared/schema";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

const addTransactionFormSchema = z.object({
  agentId: z.string().min(1, "Agent is required"),
  transactionType: z.enum(["credit", "deposit"]),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  paymentMethod: z.enum(["cash", "cheque", "bank_transfer"]),
});

type AddTransactionForm = z.infer<typeof addTransactionFormSchema>;

export default function AgentCreditsPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: agents = [], isLoading: isLoadingAgents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<AgentTransaction[]>({
    queryKey: ["/api/agent-transactions"],
  });

  const form = useForm<AddTransactionForm>({
    resolver: zodResolver(addTransactionFormSchema),
    defaultValues: {
      agentId: "",
      transactionType: "deposit",
      amount: 0,
      description: "",
      paymentMethod: "cash",
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (data: AddTransactionForm) => {
      const res = await apiRequest("POST", "/api/agent-transactions", {
        ...data,
        type: "credit",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      toast({
        title: "Transaction added",
        description: "Agent transaction has been recorded successfully.",
      });
      setIsAddOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddTransactionForm) => {
    addTransactionMutation.mutate(data);
  };

  const filteredTransactions = transactions.filter((tx) => {
    const agent = agents.find((a) => a.id === tx.agentId);
    const agentName = agent?.name.toLowerCase() || "";
    return (
      agentName.includes(searchQuery.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalCredits = agents.reduce((sum, a) => sum + a.creditBalance, 0);
  const totalDeposits = agents.reduce((sum, a) => sum + a.depositBalance, 0);

  const getAgentName = (agentId: string) => {
    return agents.find((a) => a.id === agentId)?.name || "Unknown";
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "cash": return "Cash";
      case "cheque": return "Cheque";
      case "bank_transfer": return "Bank Transfer";
      default: return method;
    }
  };

  if (isLoadingAgents || isLoadingTransactions) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agent Credits</h1>
          <p className="text-muted-foreground">Manage credits given to agents and deposits received from agents</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-agent-transaction">
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credit Given</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="text-total-agent-credits">
              {formatCurrency(totalCredits)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Credit extended to agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits Received</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="text-total-agent-deposits">
              {formatCurrency(totalDeposits)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Deposits received from agents
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Agent Balances</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No agents found</p>
              <p className="text-sm">Add agents first to manage their credits</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Credit Balance</TableHead>
                  <TableHead className="text-right">Deposit Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id} data-testid={`row-agent-balance-${agent.id}`}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>{agent.company || "-"}</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={agent.creditBalance > 0 ? "text-blue-600 dark:text-blue-400" : ""}>
                        {formatCurrency(agent.creditBalance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={agent.depositBalance > 0 ? "text-green-600 dark:text-green-400" : ""}>
                        {formatCurrency(agent.depositBalance)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Transaction History</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-agent-transactions"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found</p>
              <p className="text-sm">Add a transaction to see it here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} data-testid={`row-agent-transaction-${tx.id}`}>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(tx.createdAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">{getAgentName(tx.agentId)}</TableCell>
                    <TableCell>
                      <Badge variant={tx.transactionType === "credit" ? "default" : "secondary"}>
                        {tx.transactionType === "credit" ? "Credit Given" : "Deposit Received"}
                      </Badge>
                    </TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getPaymentMethodLabel(tx.paymentMethod)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {tx.type === "credit" ? (
                          <ArrowUpCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="font-mono">
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(tx.balanceAfter)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Agent Transaction</DialogTitle>
            <DialogDescription>
              Record a credit given to agent or deposit received from agent.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="agentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-agent">
                          <SelectValue placeholder="Select agent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name} {agent.company ? `(${agent.company})` : ""}
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
                    <FormLabel>Transaction Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-transaction-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="credit">Credit Given to Agent</SelectItem>
                        <SelectItem value="deposit">Deposit Received from Agent</SelectItem>
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
                    <FormLabel>Amount (AED)</FormLabel>
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
                    <FormLabel>Payment Method</FormLabel>
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Monthly credit line, Advance deposit"
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
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addTransactionMutation.isPending}
                  data-testid="button-submit-agent-transaction"
                >
                  {addTransactionMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Transaction"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
