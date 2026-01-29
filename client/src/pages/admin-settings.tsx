import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  KeyRound,
  AlertTriangle,
  RotateCcw,
  Trash2,
  LogOut,
  FileText,
  Calendar
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [reportFrequency, setReportFrequency] = useState("daily");
  const [resetDialog, setResetDialog] = useState<"users" | "data" | null>(null);

  const handleResetUsers = () => {
    toast({ title: "Default users have been reset" });
    setResetDialog(null);
  };

  const handleResetData = () => {
    toast({ title: "All data has been reset", variant: "destructive" });
    setResetDialog(null);
  };

  const handleLogoutAllUsers = () => {
    toast({ title: "All user sessions have been terminated" });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-admin-settings-title">Admin Settings</h1>
          <p className="text-muted-foreground">System administration and data management</p>
        </div>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-primary">
            <User className="w-5 h-5" />
            Admin Account
          </CardTitle>
          <CardDescription>
            Manage your admin account settings including username, email, password, and PIN.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Username</Label>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{user?.username || "admin"}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{user?.email || "admin@travelbill.com"}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Password</Label>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono">{showPassword ? "admin123" : "••••••••"}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="toggle-admin-password"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">PIN</Label>
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono">{showPin ? "00000" : "•••••"}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => setShowPin(!showPin)}
                  data-testid="toggle-admin-pin"
                >
                  {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" data-testid="button-edit-account">
              <User className="w-4 h-4 mr-2" />
              Edit Account Details
            </Button>
            <Button variant="outline" data-testid="button-change-password">
              <Lock className="w-4 h-4 mr-2" />
              Change Password (OTP)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            System Reset
          </CardTitle>
          <CardDescription>
            Reset all system data including invoices, tickets, customers, agents, vendors, deposits, credits, transactions, and all other services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => setResetDialog("users")}
              data-testid="button-reset-users"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Default Users
            </Button>
            <Button 
              variant="destructive"
              onClick={() => setResetDialog("data")}
              data-testid="button-reset-data"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-500">
            <LogOut className="w-5 h-5" />
            Session Management
          </CardTitle>
          <CardDescription>
            Log out all active user sessions except the admin account. Users will need to log in again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
            onClick={handleLogoutAllUsers}
            data-testid="button-logout-all"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out All Users
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Sales Reports
          </CardTitle>
          <CardDescription>
            Send sales reports to admin@travelbill.com. Reports are sent automatically:
            Daily at 11:59 PM, Weekly every Saturday, Monthly on the last day, and Yearly on December 31st.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["daily", "weekly", "monthly", "yearly"].map((freq) => (
              <Button
                key={freq}
                variant={reportFrequency === freq ? "default" : "outline"}
                onClick={() => setReportFrequency(freq)}
                className="min-w-[100px]"
                data-testid={`button-report-${freq}`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                {freq.charAt(0).toUpperCase() + freq.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={resetDialog !== null} onOpenChange={() => setResetDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {resetDialog === "users" ? "Reset Default Users" : "Reset All Data"}
            </DialogTitle>
            <DialogDescription>
              {resetDialog === "users" 
                ? "This will reset all users to their default state. This action cannot be undone."
                : "This will permanently delete all data including invoices, tickets, customers, agents, vendors, and transactions. This action cannot be undone."
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={resetDialog === "users" ? handleResetUsers : handleResetData}
            >
              {resetDialog === "users" ? "Reset Users" : "Reset All Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
