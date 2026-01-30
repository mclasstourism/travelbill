import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  Loader2,
  Shield,
  CreditCard,
  FileText,
  Ticket,
} from "lucide-react";

type ResetType = "finance" | "invoices" | "tickets" | null;

export default function AdminSettingsPage() {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [resetType, setResetType] = useState<ResetType>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();

  const resetMutation = useMutation({
    mutationFn: async ({ type, password }: { type: string; password: string }) => {
      const res = await apiRequest("POST", "/api/admin/reset", { type, password });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      setConfirmDialogOpen(false);
      setAdminPassword("");
      setConfirmText("");
      setResetType(null);
      toast({
        title: "Reset Complete",
        description: data.message || "Data has been reset successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset data. Check your password.",
        variant: "destructive",
      });
    },
  });

  const handleResetClick = (type: ResetType) => {
    setResetType(type);
    setConfirmDialogOpen(true);
    setAdminPassword("");
    setConfirmText("");
  };

  const handleConfirmReset = () => {
    if (!resetType || !adminPassword) return;
    
    const expectedText = `RESET ${resetType.toUpperCase()}`;
    if (confirmText !== expectedText) {
      toast({
        title: "Confirmation Required",
        description: `Please type "${expectedText}" to confirm.`,
        variant: "destructive",
      });
      return;
    }

    resetMutation.mutate({ type: resetType, password: adminPassword });
  };

  const getResetInfo = (type: ResetType) => {
    switch (type) {
      case "finance":
        return {
          title: "Reset Finance Data",
          description: "This will delete ALL transaction records and reset ALL customer, agent, and vendor balances to zero.",
          icon: CreditCard,
          confirmText: "RESET FINANCE",
        };
      case "invoices":
        return {
          title: "Reset Invoices",
          description: "This will delete ALL invoice records permanently.",
          icon: FileText,
          confirmText: "RESET INVOICES",
        };
      case "tickets":
        return {
          title: "Reset Tickets",
          description: "This will delete ALL ticket records permanently.",
          icon: Ticket,
          confirmText: "RESET TICKETS",
        };
      default:
        return null;
    }
  };

  const resetInfo = getResetInfo(resetType);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-admin-settings-title">Admin Settings</h1>
          <p className="text-sm text-muted-foreground">Manage system data and reset operations</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-500" />
              <CardTitle className="text-lg">Finance Data</CardTitle>
            </div>
            <CardDescription>
              Reset all transaction histories and balances for customers, agents, and vendors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={() => handleResetClick("finance")}
              className="w-full"
              data-testid="button-reset-finance"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Finance Data
            </Button>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              <CardTitle className="text-lg">Invoices</CardTitle>
            </div>
            <CardDescription>
              Delete all invoice records from the system permanently.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={() => handleResetClick("invoices")}
              className="w-full"
              data-testid="button-reset-invoices"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset All Invoices
            </Button>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-orange-500" />
              <CardTitle className="text-lg">Tickets</CardTitle>
            </div>
            <CardDescription>
              Delete all ticket records from the system permanently.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={() => handleResetClick("tickets")}
              className="w-full"
              data-testid="button-reset-tickets"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset All Tickets
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Parties (Customers, Agents, Vendors)</CardTitle>
          <CardDescription>
            Party records cannot be reset in bulk. To delete a customer, agent, or vendor, 
            go to their respective pages and delete them individually. Each deletion requires 
            admin password confirmation.
          </CardDescription>
        </CardHeader>
      </Card>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirm {resetInfo?.title}
            </DialogTitle>
            <DialogDescription>
              {resetInfo?.description}
              <br /><br />
              <strong className="text-destructive">This action cannot be undone!</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin Password</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                data-testid="input-admin-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-text">
                Type <span className="font-mono font-bold text-destructive">{resetInfo?.confirmText}</span> to confirm
              </Label>
              <Input
                id="confirm-text"
                placeholder={resetInfo?.confirmText}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                data-testid="input-confirm-text"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              onClick={() => setConfirmDialogOpen(false)}
              data-testid="button-cancel-reset"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReset}
              disabled={resetMutation.isPending || !adminPassword || confirmText !== resetInfo?.confirmText}
              data-testid="button-confirm-reset"
            >
              {resetMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
