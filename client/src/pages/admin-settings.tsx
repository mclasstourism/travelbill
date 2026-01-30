import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  Loader2,
  Shield,
  CreditCard,
  FileText,
  Ticket,
  Key,
  Lock,
} from "lucide-react";
import type { BillCreator } from "@shared/schema";

type ResetType = "finance" | "invoices" | "tickets" | null;

export default function AdminSettingsPage() {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [resetType, setResetType] = useState<ResetType>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  const [selectedBillCreator, setSelectedBillCreator] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  
  const { toast } = useToast();

  const { data: billCreators = [] } = useQuery<BillCreator[]>({
    queryKey: ["/api/bill-creators"],
  });

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

  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/admin/change-password", { currentPassword, newPassword });
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast({
        title: "Password Changed",
        description: "Your admin password has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password. Check your current password.",
        variant: "destructive",
      });
    },
  });

  const changePinMutation = useMutation({
    mutationFn: async ({ billCreatorId, currentPin, newPin }: { billCreatorId: string; currentPin: string; newPin: string }) => {
      const res = await apiRequest("POST", "/api/admin/change-pin", { billCreatorId, currentPin, newPin });
      return res.json();
    },
    onSuccess: () => {
      setSelectedBillCreator("");
      setCurrentPin("");
      setNewPin("");
      setConfirmNewPin("");
      toast({
        title: "PIN Changed",
        description: "The bill creator PIN has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "PIN Change Failed",
        description: error.message || "Failed to change PIN. Check the current PIN.",
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

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirmation don't match.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "New password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleChangePin = () => {
    if (!selectedBillCreator || !currentPin || !newPin) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all PIN fields.",
        variant: "destructive",
      });
      return;
    }
    if (newPin !== confirmNewPin) {
      toast({
        title: "PINs Don't Match",
        description: "New PIN and confirmation don't match.",
        variant: "destructive",
      });
      return;
    }
    if (newPin.length !== 8 || !/^\d{8}$/.test(newPin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 8 digits.",
        variant: "destructive",
      });
      return;
    }
    changePinMutation.mutate({ billCreatorId: selectedBillCreator, currentPin, newPin });
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
        <SidebarTrigger data-testid="button-sidebar-toggle" />
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-admin-settings-title">Admin Settings</h1>
          <p className="text-sm text-muted-foreground">Manage credentials and system data</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Change Admin Password</CardTitle>
            </div>
            <CardDescription>
              Update your admin login password. You'll need your current password to make changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                data-testid="input-confirm-new-password"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmNewPassword}
              className="w-full"
              data-testid="button-change-password"
            >
              {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Change Password
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Change Bill Creator PIN</CardTitle>
            </div>
            <CardDescription>
              Update a bill creator's 8-digit PIN. You'll need the current PIN to make changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bill-creator-select">Bill Creator</Label>
              <Select value={selectedBillCreator} onValueChange={setSelectedBillCreator}>
                <SelectTrigger data-testid="select-bill-creator">
                  <SelectValue placeholder="Select a bill creator" />
                </SelectTrigger>
                <SelectContent>
                  {billCreators.filter(bc => bc.active).map((bc) => (
                    <SelectItem key={bc.id} value={bc.id}>
                      {bc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="current-pin">Current PIN</Label>
              <Input
                id="current-pin"
                type="password"
                placeholder="Enter current 8-digit PIN"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                maxLength={8}
                data-testid="input-current-pin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pin">New PIN</Label>
              <Input
                id="new-pin"
                type="password"
                placeholder="Enter new 8-digit PIN"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                maxLength={8}
                data-testid="input-new-pin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-pin">Confirm New PIN</Label>
              <Input
                id="confirm-new-pin"
                type="password"
                placeholder="Confirm new 8-digit PIN"
                value={confirmNewPin}
                onChange={(e) => setConfirmNewPin(e.target.value)}
                maxLength={8}
                data-testid="input-confirm-new-pin"
              />
            </div>
            <Button
              onClick={handleChangePin}
              disabled={changePinMutation.isPending || !selectedBillCreator || !currentPin || !newPin || !confirmNewPin}
              className="w-full"
              data-testid="button-change-pin"
            >
              {changePinMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Change PIN
            </Button>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold pt-4">Data Reset Operations</h2>
      <p className="text-sm text-muted-foreground -mt-4">These operations are destructive and cannot be undone.</p>

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
