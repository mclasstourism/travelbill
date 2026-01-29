import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { User, Lock, Mail, Loader2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState(user?.email || "");

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to change password", description: error.message, variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update profile", description: error.message, variant: "destructive" });
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({ email });
  };

  if (!user) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-md bg-muted/50">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-lg">{user.username}</div>
              <div className="text-sm text-muted-foreground">{user.email || "No email set"}</div>
            </div>
            <Badge variant="secondary" className="capitalize">
              <Shield className="w-3 h-3 mr-1" />
              {user.role}
            </Badge>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  data-testid="input-account-email"
                />
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-update-email"
                >
                  {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your login password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                data-testid="input-confirm-password"
              />
            </div>
            <Button 
              type="submit" 
              disabled={changePasswordMutation.isPending}
              data-testid="button-change-password"
            >
              {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
