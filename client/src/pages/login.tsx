import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import companyLogo from "@assets/logo_optimized.png";

type ViewState = "login" | "forgot" | "reset";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<ViewState>("login");
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter username and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const success = await login(username.trim(), password);
    setIsLoading(false);

    if (success) {
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      setLocation("/");
    } else {
      toast({
        title: "Login failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/request-reset", { email: email.trim() });
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: "Reset code sent",
          description: "Check your email for the password reset code",
        });
        setView("reset");
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send reset code",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to send reset code",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetCode.trim() || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", { 
        code: resetCode.trim().toUpperCase(), 
        newPassword 
      });
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: "Password reset",
          description: "Your password has been reset. Please log in with your new password.",
        });
        setView("login");
        setResetCode("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to reset password",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const renderLogin = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
          data-testid="input-username"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          data-testid="input-password"
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        data-testid="button-login"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );

  const renderForgotPassword = () => (
    <form onSubmit={handleRequestReset} className="space-y-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mb-2 -ml-2"
        onClick={() => setView("login")}
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to login
      </Button>
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="pl-10"
            data-testid="input-reset-email"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          We'll send a password reset code to your email.
        </p>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        data-testid="button-send-reset"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Sending code...
          </>
        ) : (
          "Send Reset Code"
        )}
      </Button>
    </form>
  );

  const renderResetPassword = () => (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mb-2 -ml-2"
        onClick={() => setView("forgot")}
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back
      </Button>
      <div className="space-y-2">
        <Label htmlFor="resetCode">Reset Code</Label>
        <Input
          id="resetCode"
          type="text"
          placeholder="Enter the 6-character code"
          value={resetCode}
          onChange={(e) => setResetCode(e.target.value.toUpperCase())}
          disabled={isLoading}
          maxLength={6}
          className="text-center text-lg tracking-widest font-mono"
          data-testid="input-reset-code"
        />
        <p className="text-xs text-muted-foreground">
          Check your email for the reset code.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading}
          data-testid="input-new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          data-testid="input-confirm-password"
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        data-testid="button-reset-password"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Resetting...
          </>
        ) : (
          "Reset Password"
        )}
      </Button>
    </form>
  );

  const getTitle = () => {
    switch (view) {
      case "forgot": return "Reset Password";
      case "reset": return "Create New Password";
      default: return "TravelBill";
    }
  };

  const getDescription = () => {
    switch (view) {
      case "forgot": return "Enter your email to receive a reset code";
      case "reset": return "Enter the code from your email and create a new password";
      default: return "Sign in to your travel agency account";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <img 
              src={companyLogo} 
              alt="Middle Class Tourism" 
              className="h-16 w-auto object-contain"
              data-testid="img-company-logo"
            />
          </div>
          <div>
            <CardTitle className="text-2xl">{getTitle()}</CardTitle>
            <CardDescription className="mt-2">
              {getDescription()}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {view === "login" && renderLogin()}
          {view === "forgot" && renderForgotPassword()}
          {view === "reset" && renderResetPassword()}
          
          {view === "login" && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Contact your administrator if you need access</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
