import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Plus, User, Loader2, BarChart3, Settings, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import type { User as UserType } from "@shared/schema";

type SafeUser = Omit<UserType, 'twoFactorSecret'>;

export default function UserManagementPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [newUser, setNewUser] = useState({ password: "", name: "", pin: "11111", active: true });
  const [editUser, setEditUser] = useState({ username: "", password: "", name: "", pin: "", active: true });
  const [activeTab, setActiveTab] = useState("stats");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
  });

  const staffUsers = users?.filter(u => u.role === "staff") || [];
  const superadminUsers = users?.filter(u => u.role === "superadmin") || [];

  const generateUsername = () => {
    const staffCount = staffUsers.length + 1;
    return `staff${staffCount}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof newUser & { username: string }) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Staff user created successfully" });
      setIsAddOpen(false);
      setNewUser({ password: "", name: "", pin: "11111", active: true });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create user", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof editUser> }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Staff user updated successfully" });
      setIsEditOpen(false);
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update user", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Staff user deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, { active });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update user status", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.password) {
      toast({ title: "Password is required", variant: "destructive" });
      return;
    }
    if (newUser.pin && newUser.pin.length !== 5) {
      toast({ title: "PIN must be exactly 5 digits", variant: "destructive" });
      return;
    }
    const username = generateUsername();
    createMutation.mutate({ ...newUser, username });
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const updateData: Record<string, any> = {};
    if (editUser.username) updateData.username = editUser.username;
    if (editUser.password) updateData.password = editUser.password;
    if (editUser.name !== undefined) updateData.name = editUser.name;
    if (editUser.pin !== undefined) {
      if (editUser.pin && editUser.pin.length !== 5) {
        toast({ title: "PIN must be exactly 5 digits", variant: "destructive" });
        return;
      }
      updateData.pin = editUser.pin;
    }
    updateMutation.mutate({ id: editingUser.id, data: updateData });
  };

  const openEditDialog = (user: SafeUser) => {
    setEditingUser(user);
    setEditUser({
      username: user.username,
      password: "",
      name: user.name || "",
      pin: user.pin || "",
      active: user.active !== false,
    });
    setIsEditOpen(true);
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const togglePinVisibility = (userId: string) => {
    setShowPins(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Staff Members</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="stats" className="flex items-center gap-2" data-testid="tab-user-stats">
            <BarChart3 className="w-4 h-4" />
            User Stats
          </TabsTrigger>
          <TabsTrigger value="management" className="flex items-center gap-2" data-testid="tab-user-management">
            <Settings className="w-4 h-4" />
            User Account Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Staff Activity Statistics
              </CardTitle>
              <CardDescription>
                Track invoices, tickets, deposits, and vendor credits handled by each staff member
              </CardDescription>
            </CardHeader>
            <CardContent>
              {staffUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No staff members found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead className="text-center">Invoices</TableHead>
                      <TableHead className="text-center">Tickets</TableHead>
                      <TableHead className="text-center">Deposits</TableHead>
                      <TableHead className="text-center">Vendor Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffUsers.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{staff.name || staff.username}</p>
                              <p className="text-xs text-muted-foreground">{staff.username}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">0</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">0</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">0</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">0</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">Staff</Badge>
                <span className="text-muted-foreground">({staffUsers.length} users)</span>
              </div>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-user">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Staff User</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username (Auto-generated)</Label>
                      <Input
                        id="username"
                        value={generateUsername()}
                        disabled
                        className="bg-muted"
                        data-testid="input-new-username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        placeholder="Enter display name"
                        data-testid="input-new-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="Enter password"
                        required
                        data-testid="input-new-password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pin">PIN (5 digits)</Label>
                      <Input
                        id="pin"
                        type="password"
                        value={newUser.pin}
                        onChange={(e) => setNewUser({ ...newUser, pin: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                        placeholder="Enter 5-digit PIN"
                        maxLength={5}
                        data-testid="input-new-pin"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-create-user">
                      {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Staff User"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading users...</div>
              ) : staffUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No staff users found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Password</TableHead>
                        <TableHead>PIN</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.name || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">
                                {showPasswords[user.id] ? (user.plainPassword || "••••••") : "••••••"}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => togglePasswordVisibility(user.id)}
                                data-testid={`toggle-password-${user.id}`}
                              >
                                {showPasswords[user.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">
                                {showPins[user.id] ? (user.pin || "••••••") : "••••••"}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => togglePinVisibility(user.id)}
                                data-testid={`toggle-pin-${user.id}`}
                              >
                                {showPins[user.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={user.active !== false}
                                onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: user.id, active: checked })}
                                data-testid={`toggle-active-${user.id}`}
                              />
                              <Badge variant={user.active !== false ? "default" : "secondary"}>
                                {user.active !== false ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEditDialog(user)}
                                data-testid={`edit-user-${user.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    data-testid={`delete-user-${user.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Staff User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{user.username}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(user.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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

          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Staff User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    value={editUser.username}
                    onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                    placeholder="Enter username"
                    data-testid="input-edit-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editUser.name}
                    onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                    placeholder="Enter display name"
                    data-testid="input-edit-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={editUser.password}
                    onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                    placeholder="Enter new password"
                    data-testid="input-edit-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-pin">PIN (5 digits)</Label>
                  <Input
                    id="edit-pin"
                    type="password"
                    value={editUser.pin}
                    onChange={(e) => setEditUser({ ...editUser, pin: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                    placeholder="Enter 5-digit PIN"
                    maxLength={5}
                    data-testid="input-edit-pin"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={updateMutation.isPending} data-testid="button-save-user">
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
