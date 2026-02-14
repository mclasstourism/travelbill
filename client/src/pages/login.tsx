import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ArrowLeft, Mail, User, Lock, Plane, FileText, Receipt, CreditCard, Shield, Clock, CheckCircle } from "lucide-react";
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

  const features = [
    { icon: Plane, title: "Ticketing", desc: "Issue & manage tickets" },
    { icon: FileText, title: "Invoicing", desc: "Create & track invoices" },
    { icon: Receipt, title: "Billing", desc: "Comprehensive billing" },
    { icon: CreditCard, title: "Payments", desc: "Cash, card & credit" },
  ];

  const renderLogin = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
          className="w-full bg-white/10 border border-white/20 rounded-md py-3 pl-10 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
          data-testid="input-username"
        />
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className="w-full bg-white/10 border border-white/20 rounded-md py-3 pl-10 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
          data-testid="input-password"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-white text-[#1a5632] font-semibold py-3 rounded-md transition-opacity disabled:opacity-50"
        data-testid="button-login"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in...
          </span>
        ) : (
          "Sign In"
        )}
      </button>
      <div className="text-center">
        <button
          type="button"
          className="text-white/50 text-sm transition-colors"
          onClick={() => setView("forgot")}
          data-testid="link-forgot-password"
        >
          Forgot your password?
        </button>
      </div>
    </form>
  );

  const renderForgotPassword = () => (
    <form onSubmit={handleRequestReset} className="space-y-4">
      <button
        type="button"
        className="flex items-center gap-1 text-white/60 text-sm mb-2"
        onClick={() => setView("login")}
        data-testid="button-back-to-login"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </button>
      <div className="space-y-2">
        <label className="text-white/70 text-sm font-medium">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="w-full bg-white/10 border border-white/20 rounded-md py-3 pl-10 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
            data-testid="input-reset-email"
          />
        </div>
        <p className="text-white/40 text-xs">
          We'll send a password reset code to your email.
        </p>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-white text-[#1a5632] font-semibold py-3 rounded-md transition-opacity disabled:opacity-50"
        data-testid="button-send-reset"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending code...
          </span>
        ) : (
          "Send Reset Code"
        )}
      </button>
    </form>
  );

  const renderResetPassword = () => (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <button
        type="button"
        className="flex items-center gap-1 text-white/60 text-sm mb-2"
        onClick={() => setView("forgot")}
        data-testid="button-back-to-forgot"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <div className="space-y-2">
        <label className="text-white/70 text-sm font-medium">Reset Code</label>
        <input
          type="text"
          placeholder="Enter the 6-character code"
          value={resetCode}
          onChange={(e) => setResetCode(e.target.value.toUpperCase())}
          disabled={isLoading}
          maxLength={6}
          className="w-full bg-white/10 border border-white/20 rounded-md py-3 px-4 text-white text-center text-lg tracking-widest font-mono placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
          data-testid="input-reset-code"
        />
        <p className="text-white/40 text-xs">Check your email for the reset code.</p>
      </div>
      <div className="space-y-2">
        <label className="text-white/70 text-sm font-medium">New Password</label>
        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading}
          className="w-full bg-white/10 border border-white/20 rounded-md py-3 px-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
          data-testid="input-new-password"
        />
      </div>
      <div className="space-y-2">
        <label className="text-white/70 text-sm font-medium">Confirm Password</label>
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          className="w-full bg-white/10 border border-white/20 rounded-md py-3 px-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
          data-testid="input-confirm-password"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-white text-[#1a5632] font-semibold py-3 rounded-md transition-opacity disabled:opacity-50"
        data-testid="button-reset-password"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Resetting...
          </span>
        ) : (
          "Reset Password"
        )}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a5632] via-[#1e6b3c] to-[#0f3d20] relative overflow-auto">
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-10 px-4">
        <div className="w-full max-w-lg space-y-8">

          {/* Logo & Heading */}
          <div className="text-center space-y-5">
            <div className="flex items-center justify-center">
              <img src={companyLogoWhite} alt="Middle Class Tourism" className="h-14 w-auto" data-testid="img-brand-logo" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white leading-snug">
                Tourism Organizers
              </h2>
              <p className="text-white/60 text-sm max-w-sm mx-auto">
                Comprehensive billing and management system for travel agencies. Manage your operations in one place.
              </p>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-3">
            {features.map((f) => (
              <div key={f.title} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-md px-4 py-3 flex items-center gap-3">
                <div className="bg-white/10 rounded-md p-2">
                  <f.icon className="w-4 h-4 text-white/70" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-white/50 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Login Card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-md p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 rounded-md p-2">
                <Lock className="w-5 h-5 text-white/70" />
              </div>
              <div>
                <p className="text-white font-bold text-base">Staff Portal</p>
                <p className="text-white/50 text-xs">Authorized personnel only</p>
              </div>
            </div>

            {view === "login" && renderLogin()}
            {view === "forgot" && renderForgotPassword()}
            {view === "reset" && renderResetPassword()}
          </div>

          <p className="text-center text-white/30 text-xs italic">Your Travel Partner, Our Priority</p>

        </div>
      </div>
    </div>
  );
}
