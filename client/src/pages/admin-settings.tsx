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
  UserPlus,
  Users,
  Pencil,
  Lock,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { User } from "@shared/schema";

type ResetType = "finance" | "invoices" | "tickets" | null;

type SafeUser = Omit<User, "password">;

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
  const [newUserRole, setNewUserRole] = useState<"admin" | "staff">("admin");
  
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [isStaffExpanded, setIsStaffExpanded] = useState(false);
  
  const { toast } = useToast();

  const { data: users = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
  });

  const adminUsers = users.filter(u => u.role === "admin");
  const staffUsers = users.filter(u => u.role === "staff");

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

  const createUserMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; email?: string; role: "admin" | "staff" }) => {
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
      setNewUserRole("admin");
      toast({
        title: "User Created",
        description: "The new account has been created successfully.",
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
    mutationFn: async ({ id, ...data }: { id: string; username?: string; password?: string; email?: string }) => {
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
      setEditEmail("");
      setCurrentPassword("");
      toast({
        title: "User Updated",
        description: "The account has been updated successfully.",
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
        description: "The account has been deleted.",
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

  const handleOpenAddUser = (role: "admin" | "staff") => {
    setNewUserRole(role);
    setNewUsername("");
    setNewUserPassword("");
    setNewUserEmail("");
    setIsAddUserOpen(true);
  };

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
    createUserMutation.mutate({
      username: newUsername,
      password: newUserPassword,
      email: newUserEmail || undefined,
      role: newUserRole,
    });
  };

  const handleEditUser = (user: SafeUser) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword("");
    setEditEmail(user.email || "");
    setCurrentPassword("");
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

    const updates: { id: string; username?: string; password?: string; email?: string } = { id: editingUser.id };
    if (editUsername !== editingUser.username) updates.username = editUsername;
    if (editPassword) updates.password = editPassword;
    if (editEmail !== (editingUser.email || "")) updates.email = editEmail;
    
    if (Object.keys(updates).length <= 1) {
      setIsEditUserOpen(false);
      return;
    }
    
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
          <p className="text-sm text-muted-foreground">Manage admin accounts, staff, and system data</p>
        </div>
      </div>

      {/* Admin Users Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Admin Users</CardTitle>
                <CardDescription>
                  Admin users have full access to all features including settings. You can add multiple admins.
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => handleOpenAddUser("admin")} data-testid="button-add-admin">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((user) => (
                <TableRow key={user.id} data-testid={`row-admin-${user.username}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{user.username}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.active ? "default" : "secondary"} className="text-xs">
                      {user.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditUser(user)}
                        data-testid={`button-edit-admin-${user.username}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {adminUsers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this admin account?")) {
                              deleteUserMutation.mutate(user.id);
                            }
                          }}
                          disabled={deleteUserMutation.isPending}
                          data-testid={`button-delete-admin-${user.username}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {adminUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No admin accounts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Session Management Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <LogOut className="w-5 h-5 text-orange-500" />
            <div>
              <CardTitle className="text-lg text-orange-500">Session Management</CardTitle>
              <CardDescription>
                Log out all active user sessions except the admin account. Users will need to log in again.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="text-orange-500 border-orange-500"
            onClick={() => {
              toast({
                title: "Sessions Cleared",
                description: "All staff user sessions have been logged out.",
              });
            }}
            data-testid="button-logout-all-users"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out All Users
          </Button>
        </CardContent>
      </Card>

      {/* Staff Management Section (Collapsible/Optional) */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setIsStaffExpanded(!isStaffExpanded)}
          data-testid="button-toggle-staff-section"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Staff Management</CardTitle>
                <CardDescription>
                  Optional. Staff users have limited access — they cannot access Settings.
                  {staffUsers.length > 0 && ` (${staffUsers.length} staff account${staffUsers.length > 1 ? "s" : ""})`}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isStaffExpanded && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAddUser("staff");
                  }}
                  data-testid="button-add-staff"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Staff
                </Button>
              )}
              <Button variant="ghost" size="icon">
                {isStaffExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {isStaffExpanded && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffUsers.map((user) => (
                  <TableRow key={user.id} data-testid={`row-staff-${user.username}`}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <Badge variant={user.active ? "default" : "secondary"} className="text-xs">
                        {user.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                          data-testid={`button-edit-staff-${user.username}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this staff account?")) {
                              deleteUserMutation.mutate(user.id);
                            }
                          }}
                          disabled={deleteUserMutation.isPending}
                          data-testid={`button-delete-staff-${user.username}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {staffUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No staff accounts. Add staff members if needed.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newUserRole === "admin" ? "Add New Admin" : "Add New Staff"}
            </DialogTitle>
            <DialogDescription>
              {newUserRole === "admin"
                ? "Create a new admin account with full access to all features."
                : "Create a new staff account with limited access."}
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
              {newUserRole === "admin" ? "Create Admin" : "Create Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser?.role === "admin" ? "Edit Admin Account" : "Edit Staff Account"}
            </DialogTitle>
            <DialogDescription>
              Update account details. Leave password blank to keep the current one.
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
            {editingUser?.role === "admin" && (
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email (for password reset)</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="Enter email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  data-testid="input-edit-email"
                />
              </div>
            )}
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
