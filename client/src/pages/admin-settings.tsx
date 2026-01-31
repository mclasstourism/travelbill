import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  UserPlus,
  Users,
  Pencil,
  Check,
  X,
} from "lucide-react";
import type { User } from "@shared/schema";

type ResetType = "finance" | "invoices" | "tickets" | null;

type SafeUser = Omit<User, "password"> & { pin?: string };

export default function AdminSettingsPage() {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [resetType, setResetType] = useState<ResetType>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPin, setNewUserPin] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "staff">("staff");
  
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPin, setEditPin] = useState("");
  
  const { toast } = useToast();

  const { data: users = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
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

  const createUserMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; email?: string; role: "admin" | "staff"; pin?: string }) => {
      const res = await apiRequest("POST", "/api/users", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddUserOpen(false);
      setNewUsername("");
      setNewUserPassword("");
      setNewUserEmail("");
      setNewUserPin("");
      setNewUserRole("staff");
      toast({
        title: "User Created",
        description: "The new staff account has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; username?: string; password?: string; pin?: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditUserOpen(false);
      setEditingUser(null);
      setEditUsername("");
      setEditPassword("");
      setEditPin("");
      toast({
        title: "User Updated",
        description: "The staff account has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User Deleted",
        description: "The staff account has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!newUsername || !newUserPassword) {
      toast({
        title: "Missing Fields",
        description: "Username and password are required.",
        variant: "destructive",
      });
      return;
    }
    if (newUserPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newUserPin && (newUserPin.length !== 8 || !/^\d{8}$/.test(newUserPin))) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 8 digits.",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate({
      username: newUsername,
      password: newUserPassword,
      email: newUserRole === "admin" ? (newUserEmail || undefined) : undefined,
      role: newUserRole,
      pin: newUserPin || undefined,
    });
  };

  const handleEditUser = (user: SafeUser) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword("");
    setEditPin(user.pin || "");
    setIsEditUserOpen(true);
  };

  const handleSaveUser = () => {
    if (!editingUser) return;
    
    if (!editUsername) {
      toast({
        title: "Missing Username",
        description: "Username is required.",
        variant: "destructive",
      });
      return;
    }
    if (editPassword && editPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (editPin && (editPin.length !== 8 || !/^\d{8}$/.test(editPin))) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 8 digits.",
        variant: "destructive",
      });
      return;
    }
    
    const updates: { id: string; username?: string; password?: string; pin?: string } = { id: editingUser.id };
    if (editUsername !== editingUser.username) updates.username = editUsername;
    if (editPassword) updates.password = editPassword;
    if (editPin !== (editingUser.pin || "")) updates.pin = editPin;
    
    updateUserMutation.mutate(updates);
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
          <p className="text-sm text-muted-foreground">Manage staff accounts and system data</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Staff Management</CardTitle>
                <CardDescription>
                  Manage staff login accounts and bill creator PINs. Staff users cannot access Settings. 
                  Users with a PIN can create invoices and tickets.
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setIsAddUserOpen(true)} data-testid="button-add-user">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role === "admin" ? "Admin" : "Staff"}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.email || "-"}</TableCell>
                  <TableCell>
                    {user.pin ? (
                      <span className="font-mono text-sm" data-testid={`text-pin-${user.username}`}>
                        {user.pin}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.active ? "default" : "secondary"}>
                      {user.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditUser(user)}
                        data-testid={`button-edit-user-${user.username}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteUserMutation.mutate(user.id)}
                        disabled={user.username === "admin" || deleteUserMutation.isPending}
                        data-testid={`button-delete-user-${user.username}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No staff accounts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Staff</DialogTitle>
            <DialogDescription>
              Create a new staff login account. Set a PIN to allow them to create invoices and tickets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-username">Username *</Label>
              <Input
                id="new-username"
                placeholder="Enter username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                data-testid="input-new-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-password">Password *</Label>
              <Input
                id="new-user-password"
                type="password"
                placeholder="Enter password (min 6 characters)"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                data-testid="input-new-user-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-pin">Bill Creator PIN (8 digits)</Label>
              <Input
                id="new-user-pin"
                type="password"
                placeholder="Enter 8-digit PIN for creating bills"
                value={newUserPin}
                onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                maxLength={8}
                data-testid="input-new-user-pin"
              />
              <p className="text-xs text-muted-foreground">Required to create invoices and tickets</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-role">Role</Label>
              <Select value={newUserRole} onValueChange={(v: "admin" | "staff") => setNewUserRole(v)}>
                <SelectTrigger data-testid="select-new-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff (Limited Access)</SelectItem>
                  <SelectItem value="admin">Admin (Full Access)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUserRole === "admin" && (
              <div className="space-y-2">
                <Label htmlFor="new-user-email">Email (for password reset)</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  placeholder="Enter email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  data-testid="input-new-user-email"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending || !newUsername || !newUserPassword}
              data-testid="button-create-user"
            >
              {createUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff: {editingUser?.username}</DialogTitle>
            <DialogDescription>
              Update staff account details. Leave password blank to keep current password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                placeholder="Enter username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                data-testid="input-edit-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="Enter new password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                data-testid="input-edit-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pin">Bill Creator PIN (8 digits)</Label>
              <Input
                id="edit-pin"
                type="password"
                placeholder="Enter 8-digit PIN"
                value={editPin}
                onChange={(e) => setEditPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                maxLength={8}
                data-testid="input-edit-pin"
              />
              <p className="text-xs text-muted-foreground">Required to create invoices and tickets</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditUserOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveUser}
              disabled={updateUserMutation.isPending || !editUsername}
              data-testid="button-save-user"
            >
              {updateUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Change Your Password</CardTitle>
          </div>
          <CardDescription>
            Update your admin login password. You'll need your current password to make changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
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
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmNewPassword}
            data-testid="button-change-password"
          >
            {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Change Password
          </Button>
        </CardContent>
      </Card>

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
              Delete all invoices permanently. Customer balances will not be restored.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={() => handleResetClick("invoices")}
              className="w-full"
              data-testid="button-reset-invoices"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Invoices
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
              Delete all tickets permanently. Customer balances will not be restored.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={() => handleResetClick("tickets")}
              className="w-full"
              data-testid="button-reset-tickets"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Tickets
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {resetInfo?.title}
            </DialogTitle>
            <DialogDescription className="text-base">
              {resetInfo?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive font-medium">
                This action cannot be undone. All related data will be permanently deleted.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin Password</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Enter your admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                data-testid="input-admin-password-reset"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-text">
                Type "{resetInfo?.confirmText}" to confirm
              </Label>
              <Input
                id="confirm-text"
                placeholder={resetInfo?.confirmText}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                data-testid="input-confirm-reset-text"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDialogOpen(false)}>
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
