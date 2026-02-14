import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, CreditCard, Search, Loader2, ArrowUpCircle, ArrowDownCircle, Banknote, Briefcase, Eye, ArrowLeft, Download, Printer, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";
import { z } from "zod";
import type { Agent, AgentTransaction } from "@shared/schema";

type DateRange = "all" | "today" | "this_month" | "this_year" | "custom";

function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
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
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
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
      setIsAddOpen(false);
      form.reset();
      toast({
        title: "Transaction added",
        description: "The agent transaction has been recorded successfully.",
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

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.phone?.includes(searchQuery)
  );

  const dateFilter = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "this_year":
        return { start: startOfYear(now), end: endOfYear(now) };
      case "custom":
        if (customStartDate && customEndDate) {
          return { start: startOfDay(parseISO(customStartDate)), end: endOfDay(parseISO(customEndDate)) };
        }
        return null;
      default:
        return null;
    }
  }, [dateRange, customStartDate, customEndDate]);

  const agentTransactions = useMemo(() => {
    if (!selectedAgent) return [];
    
    let filtered = transactions
      .filter(tx => tx.agentId === selectedAgent.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (dateFilter) {
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.createdAt);
        return isWithinInterval(txDate, { start: dateFilter.start, end: dateFilter.end });
      });
    }
    
    return filtered;
  }, [selectedAgent, transactions, dateFilter]);

  const totalCredits = agents.reduce((sum, a) => sum + a.creditBalance, 0);
  const totalDeposits = agents.reduce((sum, a) => sum + a.depositBalance, 0);

  const handleExportExcel = () => {
    if (!selectedAgent || agentTransactions.length === 0) return;
    
    const dateRangeText = dateFilter
      ? `${format(dateFilter.start, "yyyy-MM-dd")} to ${format(dateFilter.end, "yyyy-MM-dd")}`
      : "All Time";
    
    const headers = ["Date", "Description", "Type", "Transaction", "Amount", "Balance After"];
    const rows = agentTransactions.map(tx => [
      format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm"),
      tx.description,
      tx.transactionType === "credit" ? "Credit Given" : "Deposit",
      tx.type === "credit" ? "Added" : "Used",
      tx.type === "credit" ? tx.amount : -tx.amount,
      tx.balanceAfter
    ]);
    
    const csvContent = [
      [`Agent: ${selectedAgent.name}`],
      [`Company: ${selectedAgent.company || "N/A"}`],
      [`Date Range: ${dateRangeText}`],
      [],
      headers,
      ...rows
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `agent_${selectedAgent.name.replace(/\s+/g, "_")}_transactions_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
    
    toast({ title: "Export successful", description: "Transaction history downloaded as Excel CSV" });
  };

  const handlePrintPdf = () => {
    if (!selectedAgent) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const dateRangeText = dateFilter
      ? `${format(dateFilter.start, "MMM d, yyyy")} - ${format(dateFilter.end, "MMM d, yyyy")}`
      : "All Time";
    
    const rows = agentTransactions.map(tx => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.transactionType === "credit" ? "Credit Given" : "Deposit"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.type === "credit" ? "Added" : "Used"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: ${tx.type === "credit" ? "green" : "red"};">
          ${tx.type === "credit" ? "+" : "-"}${formatCurrency(tx.amount)}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${formatCurrency(tx.balanceAfter)}</td>
      </tr>
    `).join("");
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Agent Transaction History - ${selectedAgent.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; }
            h1 { text-align: center; margin-bottom: 5px; }
            h2 { margin-top: 20px; }
            .date-range { text-align: center; color: #666; margin-bottom: 20px; }
            .summary { display: flex; gap: 20px; margin-bottom: 20px; }
            .summary-card { flex: 1; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .summary-label { font-size: 12px; color: #666; }
            .summary-value { font-size: 20px; font-weight: bold; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f3f4f6; padding: 10px 8px; text-align: left; border-bottom: 2px solid #d1d5db; }
            th.right { text-align: right; }
            .no-data { text-align: center; padding: 40px; color: #666; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>MCT - Tourism Organizers</h1>
          <h2 style="text-align: center;">Agent Transaction History</h2>
          <h3 style="text-align: center; margin-top: 5px;">${selectedAgent.name}${selectedAgent.company ? ` - ${selectedAgent.company}` : ""}</h3>
          <p class="date-range">${dateRangeText}</p>
          
          <div class="summary">
            <div class="summary-card">
              <div class="summary-label">Credit Given</div>
              <div class="summary-value" style="color: #2563eb;">${formatCurrency(selectedAgent.creditBalance)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Deposit Received</div>
              <div class="summary-value" style="color: #16a34a;">${formatCurrency(selectedAgent.depositBalance)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Transactions in Range</div>
              <div class="summary-value">${agentTransactions.length}</div>
            </div>
          </div>
          
          ${agentTransactions.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Transaction</th>
                  <th class="right">Amount</th>
                  <th class="right">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          ` : '<p class="no-data">No transactions in this date range</p>'}
          
          <p style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const onSubmit = (data: AddTransactionForm) => {
    addTransactionMutation.mutate(data);
  };

  const handleViewHistory = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  if (selectedAgent) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedAgent(null)} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold" data-testid="text-agent-history-title">
                {selectedAgent.name} - Transaction History
              </h1>
              <p className="text-sm text-muted-foreground">
                Phone: {selectedAgent.phone} | Company: {selectedAgent.company || "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportExcel} disabled={agentTransactions.length === 0} data-testid="button-export-excel">
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={handlePrintPdf} data-testid="button-print-pdf">
              <Printer className="w-4 h-4 mr-2" />
              Print PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Date Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
                  <SelectTrigger className="w-40" data-testid="select-date-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateRange === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      data-testid="input-end-date"
                    />
                  </div>
                </>
              )}

              {dateFilter && (
                <div className="text-sm text-muted-foreground">
                  Showing: {format(dateFilter.start, "MMM d, yyyy")} - {format(dateFilter.end, "MMM d, yyyy")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-green-700 dark:text-green-400">
                {formatCurrency(selectedAgent.creditBalance)}
              </div>
              <p className="text-xs text-muted-foreground">Middle class money to agent</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deposit Balance</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
                {formatCurrency(selectedAgent.depositBalance)}
              </div>
              <p className="text-xs text-muted-foreground">Advance received from agent</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agentTransactions.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {agentTransactions.length === 0 ? (
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
                      <TableHead className="text-right text-green-700 dark:text-green-400">Credit Given</TableHead>
                      <TableHead className="text-right text-green-600 dark:text-green-400">Deposit Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentTransactions.map((tx) => {
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
                              {isCreditType ? "Credit Given" : "Deposit"}
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
                          <TableCell className="text-right font-mono font-semibold text-green-700 dark:text-green-400">
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
            <h1 className="text-2xl font-semibold" data-testid="text-agent-credits-title">Agent Credits & Deposits</h1>
            <p className="text-sm text-muted-foreground">Track credit given to agents and their deposits</p>
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
            <CardTitle className="text-sm font-medium">Total Credit Given</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400 font-mono">
              {formatCurrency(totalCredits)}
            </div>
            <p className="text-xs text-muted-foreground">Credit given to agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agent Deposits</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono">
              {formatCurrency(totalDeposits)}
            </div>
            <p className="text-xs text-muted-foreground">Advances received from agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-agents"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAgents ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No agents found</p>
              <p className="text-sm">Add agents first to track credits</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Credit Balance</TableHead>
                    <TableHead className="text-right">Deposit Balance</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow key={agent.id} data-testid={`row-agent-${agent.id}`}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell className="text-muted-foreground">{agent.company || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{agent.phone || "-"}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-green-700 dark:text-green-400">
                        {formatCurrency(agent.creditBalance)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(agent.depositBalance)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewHistory(agent)}
                          data-testid={`button-view-history-${agent.id}`}
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
            <DialogTitle>Add Agent Transaction</DialogTitle>
            <DialogDescription>
              Record a new credit or deposit transaction for an agent.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="agentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent *</FormLabel>
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
                    <FormLabel>Transaction Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-transaction-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="credit">Credit (we give credit to agent)</SelectItem>
                        <SelectItem value="deposit">Deposit (agent pays advance to us)</SelectItem>
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
