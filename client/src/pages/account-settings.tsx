import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { User, Lock, Mail, Loader2, AlertTriangle, LogOut, Calendar, Send, Eye, EyeOff, Key, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  
  const [editForm, setEditForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { username?: string; email?: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account details updated successfully" });
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update account", description: error.message, variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setPasswordDialogOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to change password", description: error.message, variant: "destructive" });
    },
  });

  const resetDataMutation = useMutation({
    mutationFn: async (type: "users" | "all") => {
      const res = await apiRequest("POST", `/api/admin/reset-data`, { type });
      return res.json();
    },
    onSuccess: (_, type) => {
      toast({ title: type === "all" ? "All data has been reset" : "Users have been reset to defaults" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reset data", description: error.message, variant: "destructive" });
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/logout-all-users");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "All user sessions have been terminated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to log out users", description: error.message, variant: "destructive" });
    },
  });

  const sendReportMutation = useMutation({
    mutationFn: async (reportType: string) => {
      const res = await apiRequest("POST", "/api/admin/send-report", { type: reportType });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: `${selectedReportType.charAt(0).toUpperCase() + selectedReportType.slice(1)} report sent successfully` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send report", description: error.message, variant: "destructive" });
    },
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(editForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const reportTypeLabels = {
    daily: { title: "Daily Report", description: "Today's sales" },
    weekly: { title: "Weekly Report", description: "This week's sales" },
    monthly: { title: "Monthly Report", description: "This month's sales" },
    yearly: { title: "Yearly Report", description: "This year's sales" },
  };

  if (!user) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground">Manage your admin account and system settings</p>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <User className="w-5 h-5" />
            Admin Account
          </CardTitle>
          <CardDescription>Manage your admin account settings including username, email, password, and PIN.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-md bg-muted/30">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Username</div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{user.username}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{user.email || "Not set"}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Password</div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium font-mono">{showPassword ? "admin123" : "••••••••"}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">PIN</div>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium font-mono">{showPin ? (user?.pin || "Not set") : "•••••"}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowPin(!showPin)}
                  data-testid="button-toggle-pin"
                >
                  {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-edit-account">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Account Details
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Account Details</DialogTitle>
                  <DialogDescription>Update your username and email address</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-username">Username</Label>
                    <Input
                      id="edit-username"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      data-testid="input-edit-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      data-testid="input-edit-email"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-account">
                      {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-change-password">
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password (OTP)
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>Enter your current password and choose a new one</DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                      data-testid="input-current-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                      data-testid="input-confirm-password"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={changePasswordMutation.isPending} data-testid="button-submit-password">
                      {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Change Password"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="w-5 h-5" />
            System Reset
          </CardTitle>
          <CardDescription>Reset all system data including orders, bills, clients, transactions, dues, and inventory stock.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-orange-500/50 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950" data-testid="button-reset-users">
                  <User className="w-4 h-4 mr-2" />
                  Reset Default Users
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Default Users?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset all users to their default state. All staff users will be removed. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resetDataMutation.mutate("users")}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Reset Users
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-reset-all">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Reset All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset All Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete ALL data including invoices, tickets, customers, agents, vendors, and transactions. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resetDataMutation.mutate("all")}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Reset All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-400/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-500">
            <LogOut className="w-5 h-5" />
            Session Management
          </CardTitle>
          <CardDescription>Log out all active user sessions except the admin account. Users will need to log in again.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-orange-400/50 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950" data-testid="button-logout-all">
                <LogOut className="w-4 h-4 mr-2" />
                Log Out All Users
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Log Out All Users?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will terminate all active sessions except your own. All users will need to log in again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => logoutAllMutation.mutate()}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Log Out All Users
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card className="border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <Mail className="w-5 h-5" />
            Sales Reports
          </CardTitle>
          <CardDescription>
            Send sales reports to {user.email || "your email"}. Reports are sent automatically: Daily at 11:59 PM, Weekly every Saturday, Monthly on the last day, and Yearly on December 31st.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {(["daily", "weekly", "monthly", "yearly"] as const).map((type) => (
              <Button
                key={type}
                variant={selectedReportType === type ? "default" : "outline"}
                className="flex flex-col items-center gap-1 h-auto py-3"
                onClick={() => setSelectedReportType(type)}
                data-testid={`button-report-${type}`}
              >
                <Calendar className="w-4 h-4" />
                <span className="capitalize">{type}</span>
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between p-4 rounded-md bg-muted/30">
            <div>
              <div className="font-medium">{reportTypeLabels[selectedReportType].title}</div>
              <div className="text-sm text-muted-foreground">{reportTypeLabels[selectedReportType].description}</div>
            </div>
            <Button
              onClick={() => sendReportMutation.mutate(selectedReportType)}
              disabled={sendReportMutation.isPending}
              data-testid="button-send-report"
            >
              {sendReportMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send {selectedReportType.charAt(0).toUpperCase() + selectedReportType.slice(1)} Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
