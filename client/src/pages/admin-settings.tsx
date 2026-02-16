import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
  Trash2,
  Loader2,
  ShieldCheck,
  UserPlus,
  Pencil,
  User as UserIcon,
  KeyRound,
  Users,
} from "lucide-react";
import type { User } from "@shared/schema";

type SafeUser = Omit<User, "password">;

export default function AdminSettingsPage() {

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPin, setNewUserPin] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "staff">("admin");
  
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPin, setEditPin] = useState("");

  
  const { toast } = useToast();

  const { data: users = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
  });

  const adminUsers = users.filter(u => u.role === "admin");
  const staffUsers = users.filter(u => u.role === "staff");


  const createUserMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; email?: string; pin?: string; role: "admin" | "staff" }) => {
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
    mutationFn: async ({ id, ...data }: { id: string; username?: string; password?: string; email?: string; pin?: string }) => {
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
      setEditPin("");
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
    setNewUserPin("");
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
    if (newUserPin) {
      const existingPinUser = users.find(u => u.pin === newUserPin);
      if (existingPinUser) {
        toast({
          title: "PIN Already Used",
          description: `This PIN is already assigned to ${existingPinUser.username}. Each user must have a unique PIN.`,
          variant: "destructive",
        });
        return;
      }
    }
    createUserMutation.mutate({
      username: newUsername,
      password: newUserPassword,
      email: newUserEmail || undefined,
      pin: newUserPin || undefined,
      role: newUserRole,
    });
  };

  const handleEditUser = (user: SafeUser) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword("");
    setEditEmail(user.email || "");
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

    if (editPin) {
      const existingPinUser = users.find(u => u.pin === editPin && u.id !== editingUser.id);
      if (existingPinUser) {
        toast({
          title: "PIN Already Used",
          description: `This PIN is already assigned to ${existingPinUser.username}. Each user must have a unique PIN.`,
          variant: "destructive",
        });
        return;
      }
    }

    const updates: { id: string; username?: string; password?: string; email?: string; pin?: string } = { id: editingUser.id };
    if (editUsername !== editingUser.username) updates.username = editUsername;
    if (editPassword) updates.password = editPassword;
    if (editEmail !== (editingUser.email || "")) updates.email = editEmail;
    if (editPin !== (editingUser.pin || "")) updates.pin = editPin;
    
    if (Object.keys(updates).length <= 1) {
      setIsEditUserOpen(false);
      return;
    }
    
    updateUserMutation.mutate(updates);
  };

  const renderUserTable = (userList: SafeUser[], roleLabel: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Username</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>PIN</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {userList.map((user) => (
          <TableRow key={user.id} data-testid={`row-${roleLabel}-${user.username}`}>
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
              {user.pin ? (
                <Badge variant="outline" className="text-xs font-mono">
                  <KeyRound className="w-3 h-3 mr-1" />
                  {user.pin}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-xs">No PIN</span>
              )}
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
                  data-testid={`button-edit-${roleLabel}-${user.username}`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                {(roleLabel === "staff" || userList.length > 1) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete this ${roleLabel} account?`)) {
                        deleteUserMutation.mutate(user.id);
                      }
                    }}
                    disabled={deleteUserMutation.isPending}
                    data-testid={`button-delete-${roleLabel}-${user.username}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {userList.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No {roleLabel} accounts found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-admin-settings-title">Admin Settings</h1>
        <p className="text-sm text-muted-foreground">Manage user accounts and PIN codes</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Admin Users</CardTitle>
                <CardDescription>
                  Admin users have full access to all features including settings.
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
          {renderUserTable(adminUsers, "admin")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Staff Users</CardTitle>
                <CardDescription>
                  Staff users can create entries using their PIN. They cannot access settings.
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => handleOpenAddUser("staff")} data-testid="button-add-staff">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderUserTable(staffUsers, "staff")}
        </CardContent>
      </Card>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newUserRole === "admin" ? "Add New Admin" : "Add New Staff"}
            </DialogTitle>
            <DialogDescription>
              {newUserRole === "admin"
                ? "Create a new admin account with full access to all features."
                : "Create a new staff account. Assign a unique PIN for entry creation."}
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
              <Label htmlFor="new-user-pin">PIN Code</Label>
              <Input
                id="new-user-pin"
                placeholder="Enter unique PIN (e.g. 1234)"
                value={newUserPin}
                onChange={(e) => setNewUserPin(e.target.value)}
                data-testid="input-new-user-pin"
              />
              <p className="text-xs text-muted-foreground">Each user needs a unique PIN to create entries (invoices, tickets, receipts).</p>
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
            <div className="space-y-2">
              <Label htmlFor="edit-pin">PIN Code</Label>
              <Input
                id="edit-pin"
                placeholder="Enter unique PIN"
                value={editPin}
                onChange={(e) => setEditPin(e.target.value)}
                data-testid="input-edit-pin"
              />
              <p className="text-xs text-muted-foreground">Unique PIN required for creating entries.</p>
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

    </div>
  );
}
