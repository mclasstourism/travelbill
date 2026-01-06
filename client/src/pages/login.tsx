import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plane, Loader2, HelpCircle } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordHint, setPasswordHint] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const fetchPasswordHint = async () => {
    if (!username.trim()) {
      toast({
        title: "Enter username first",
        description: "Please enter your username to get a password hint",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await apiRequest("POST", "/api/auth/password-hint", { username: username.trim() });
      const data = await res.json();
      if (data.hint) {
        setPasswordHint(data.hint);
        setShowHint(true);
      } else {
        toast({
          title: "No hint available",
          description: "No password hint is set for this user",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not retrieve password hint",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground">
            <Plane className="w-8 h-8" />
          </div>
          <div>
            <CardTitle className="text-2xl">TravelBill</CardTitle>
            <CardDescription className="mt-2">
              Sign in to your travel agency account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">Password</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground"
                  onClick={fetchPasswordHint}
                  data-testid="button-password-hint"
                >
                  <HelpCircle className="w-3 h-3 mr-1" />
                  Forgot password?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                data-testid="input-password"
              />
              {showHint && passwordHint && (
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
                  Hint: {passwordHint}
                </p>
              )}
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
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Contact your administrator if you need access</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
