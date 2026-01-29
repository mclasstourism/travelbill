import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Plus, ShieldCheck, User, Loader2 } from "lucide-react";
import type { User as UserType } from "@shared/schema";

type SafeUser = Omit<UserType, 'password' | 'twoFactorSecret'>;

const roleColors: Record<string, string> = {
  superadmin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  staff: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

const roleIcons: Record<string, any> = {
  superadmin: ShieldCheck,
  staff: User,
};

export default function UserManagementPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", email: "", role: "staff" });
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newUser) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User created successfully" });
      setIsAddOpen(false);
      setNewUser({ username: "", password: "", email: "", role: "staff" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create user", description: error.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Role updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) {
      toast({ title: "Username and password are required", variant: "destructive" });
      return;
    }
    createMutation.mutate(newUser);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-user">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="Enter username"
                  data-testid="input-new-username"
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
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Enter email"
                  data-testid="input-new-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger data-testid="select-new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-create-user">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Staff Users
          </CardTitle>
          <p className="text-sm text-muted-foreground">Manage staff accounts who can access the system</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => {
                const RoleIcon = roleIcons[user.role || "staff"] || User;
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-md border hover-elevate"
                    data-testid={`user-row-${user.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                        <RoleIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-muted-foreground">{user.email || "No email"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={roleColors[user.role || "staff"]}>
                        {user.role || "staff"}
                      </Badge>
                      <Select
                        value={user.role || "staff"}
                        onValueChange={(role) => updateRoleMutation.mutate({ id: user.id, role })}
                      >
                        <SelectTrigger className="w-32" data-testid={`select-role-${user.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="superadmin">Super Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                      {user.twoFactorEnabled && (
                        <Badge variant="outline" className="text-xs">2FA</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-md border">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-red-600" />
                <span className="font-medium">Super Admin</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Full system access</li>
                <li>User management</li>
                <li>Bill creator management</li>
                <li>Activity logs & reports</li>
                <li>All operations</li>
              </ul>
            </div>
            <div className="p-4 rounded-md border">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Staff</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Create invoices & tickets</li>
                <li>Manage customers & agents</li>
                <li>Manage vendors</li>
                <li>View analytics & reports</li>
                <li>View activity logs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
