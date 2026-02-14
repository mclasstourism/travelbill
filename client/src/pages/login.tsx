import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ArrowLeft, Mail, User, Lock, Plane, FileText, Receipt } from "lucide-react";
import companyLogo from "@assets/logo_optimized.png";
import companyLogoWhite from "@assets/logo-white_1771078260751.png";

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
    <form onSubmit={handleLogin} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-sm font-medium">Username</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            className="pl-10"
            data-testid="input-username"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="pl-10"
            data-testid="input-password"
          />
        </div>
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
      <div className="text-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setView("forgot")}
          data-testid="link-forgot-password"
        >
          Forgot your password?
        </Button>
      </div>
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
        data-testid="button-back-to-login"
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
        data-testid="button-back-to-forgot"
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

  const getViewTitle = () => {
    switch (view) {
      case "forgot": return "Reset Password";
      case "reset": return "Create New Password";
      default: return "Welcome Back";
    }
  };

  const getViewDescription = () => {
    switch (view) {
      case "forgot": return "Enter your email to receive a reset code";
      case "reset": return "Enter the code from your email and create a new password";
      default: return "Sign in to your staff account";
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1a5632] relative flex-col items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a5632] via-[#1e6b3c] to-[#0f3d20]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="relative z-10 text-center space-y-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-md p-6 inline-block">
            <img src={companyLogoWhite} alt="Middle Class Tourism" className="h-20 w-auto" data-testid="img-brand-logo" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-white tracking-wide">Tourism Organizers</h1>
            <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto" />
            <p className="text-green-100/80 text-sm mx-auto leading-relaxed whitespace-nowrap">
              Comprehensive billing and management system for travel agencies
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 pt-4">
            <div className="flex flex-col items-center gap-2 bg-white/10 backdrop-blur-sm rounded-md px-5 py-3">
              <Plane className="w-5 h-5 text-green-100/80" />
              <span className="text-green-100/80 text-xs font-medium">Ticketing</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-white/10 backdrop-blur-sm rounded-md px-5 py-3">
              <FileText className="w-5 h-5 text-green-100/80" />
              <span className="text-green-100/80 text-xs font-medium">Invoicing</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-white/10 backdrop-blur-sm rounded-md px-5 py-3">
              <Receipt className="w-5 h-5 text-green-100/80" />
              <span className="text-green-100/80 text-xs font-medium">Billing</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 text-center text-green-100/40 text-xs z-10">
          <p>Shop 41, Al Dhannah Traditional Souq, Al Dhannah City</p>
          <p>Abu Dhabi {"\u2013"} UAE</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-green-50/30 dark:to-green-950/10 p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%231a5632' fill-opacity='1'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20.5L20 20.5z'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#1a5632]/[0.04] rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#1a5632]/[0.04] rounded-full translate-y-1/3 -translate-x-1/3" />
        <div className="absolute top-1/2 right-0 w-40 h-40 bg-[#1a5632]/[0.03] rounded-full translate-x-1/2" />

        <div className="w-full max-w-md space-y-6 relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden text-center space-y-4">
            <img 
              src={companyLogo} 
              alt="MCT - Tourism Organizers" 
              className="h-14 w-auto mx-auto"
              data-testid="img-company-logo"
            />
            <div className="h-[2px] w-16 bg-gradient-to-r from-transparent via-[#1a5632]/40 to-transparent mx-auto" />
          </div>

          {/* Heading */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-2 bg-[#1a5632]/10 dark:bg-[#1a5632]/20 rounded-full px-4 py-1.5 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#1a5632] animate-pulse" />
              <span className="text-xs font-medium text-[#1a5632] dark:text-green-400">Staff Portal</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight" data-testid="text-login-title">{getViewTitle()}</h2>
            <p className="text-sm text-muted-foreground">{getViewDescription()}</p>
          </div>

          {/* Form Card */}
          <Card>
            <CardContent className="pt-6 pb-6">
              {view === "login" && renderLogin()}
              {view === "forgot" && renderForgotPassword()}
              {view === "reset" && renderResetPassword()}
            </CardContent>
          </Card>

          {view === "login" && (
            <p className="text-center text-xs text-muted-foreground">
              Contact your administrator if you need access
            </p>
          )}

          {/* Footer info */}
          <div className="text-center space-y-1 pt-2">
            <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-[#1a5632]/20 to-transparent mx-auto mb-3" />
            <p className="text-xs text-muted-foreground/60">
              www.middleclass.ae | sales@middleclass.ae
            </p>
            <p className="text-xs text-muted-foreground/60">
              025 640 224 | 050 222 1042
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
