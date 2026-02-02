import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
import { Plus, Briefcase, Search, Loader2, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAgentSchema, type Agent, type InsertAgent } from "@shared/schema";

function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}

export default function AgentsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const form = useForm<InsertAgent>({
    resolver: zodResolver(insertAgentSchema),
    defaultValues: {
      name: "",
      phone: "",
      company: "",
      address: "",
      email: "",
      creditBalance: 0,
      depositBalance: 0,
    },
  });

  const editForm = useForm<InsertAgent>({
    resolver: zodResolver(insertAgentSchema),
    defaultValues: {
      name: "",
      phone: "",
      company: "",
      address: "",
      email: "",
      creditBalance: 0,
      depositBalance: 0,
    },
  });

  useEffect(() => {
    if (editingAgent) {
      editForm.reset({
        name: editingAgent.name,
        phone: editingAgent.phone,
        company: editingAgent.company || "",
        address: editingAgent.address || "",
        email: editingAgent.email || "",
        creditBalance: editingAgent.creditBalance,
        depositBalance: editingAgent.depositBalance,
      });
    }
  }, [editingAgent, editForm]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertAgent) => {
      const res = await apiRequest("POST", "/api/agents", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Agent created",
        description: "The agent has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create agent",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertAgent) => {
      if (!editingAgent) throw new Error("No agent selected");
      const res = await apiRequest("PATCH", `/api/agents/${editingAgent.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setIsEditOpen(false);
      setEditingAgent(null);
      editForm.reset();
      toast({
        title: "Agent updated",
        description: "The agent has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update agent",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await apiRequest("DELETE", `/api/agents/${id}`, { password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-transactions"] });
      setIsDeleteOpen(false);
      setDeletingAgent(null);
      setDeletePassword("");
      toast({
        title: "Agent deleted",
        description: "The agent has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete agent. Check admin password.",
        variant: "destructive",
      });
    },
  });

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.phone?.includes(searchQuery)
  );

  const onSubmit = (data: InsertAgent) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertAgent) => {
    updateMutation.mutate(data);
  };

  const handleEditClick = (agent: Agent) => {
    setEditingAgent(agent);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (agent: Agent) => {
    setDeletingAgent(agent);
    setDeletePassword("");
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingAgent || !deletePassword) return;
    deleteMutation.mutate({ id: deletingAgent.id, password: deletePassword });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-agents-title">Agents</h1>
            <p className="text-sm text-muted-foreground">Manage bulk ticket buyers</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-agent">
          <Plus className="w-4 h-4 mr-2" />
          Add Agent
        </Button>
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
          {isLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No agents found</p>
              <p className="text-sm">Add your first agent to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Credit Balance</TableHead>
                    <TableHead className="text-right">Deposit Balance</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow key={agent.id} data-testid={`row-agent-${agent.id}`}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {agent.company || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {agent.phone || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <span className="text-blue-600 dark:text-blue-400">
                          {formatCurrency(agent.creditBalance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <span className="text-green-600 dark:text-green-400">
                          {formatCurrency(agent.depositBalance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditClick(agent)}
                            data-testid={`button-edit-agent-${agent.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteClick(agent)}
                            data-testid={`button-delete-agent-${agent.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Agent</DialogTitle>
            <DialogDescription>
              Enter the agent details below. Agents are bulk ticket buyers.
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
                        placeholder="Agent name"
                        {...field}
                        data-testid="input-agent-name"
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
                        data-testid="input-agent-phone"
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
                        data-testid="input-agent-company"
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
                        data-testid="input-agent-email"
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
                        data-testid="input-agent-address"
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
                  data-testid="button-cancel-agent"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-save-agent"
                >
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Agent
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) setEditingAgent(null);
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
            <DialogDescription>
              Update the agent details below.
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
                        placeholder="Agent name"
                        {...field}
                        data-testid="input-edit-agent-name"
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
                        data-testid="input-edit-agent-phone"
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
                        data-testid="input-edit-agent-company"
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
                        data-testid="input-edit-agent-email"
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
                        data-testid="input-edit-agent-address"
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
                    setEditingAgent(null);
                  }}
                  data-testid="button-cancel-edit-agent"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-update-agent"
                >
                  {updateMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Update Agent
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={(open) => {
        setIsDeleteOpen(open);
        if (!open) {
          setDeletingAgent(null);
          setDeletePassword("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Agent
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingAgent?.name}</strong>?
              <br /><br />
              This will also delete all associated credit transactions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-agent-password">Admin Password</Label>
              <Input
                id="delete-agent-password"
                type="password"
                placeholder="Enter admin password to confirm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                data-testid="input-delete-agent-password"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              data-testid="button-cancel-delete-agent"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending || !deletePassword}
              data-testid="button-confirm-delete-agent"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
