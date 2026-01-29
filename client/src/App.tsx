import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { PinProvider } from "@/lib/pin-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import CustomersPage from "@/pages/customers";
import AgentsPage from "@/pages/agents";
import VendorsPage from "@/pages/vendors";
import InvoicesPage from "@/pages/invoices";
import TicketsPage from "@/pages/tickets";
import DepositsPage from "@/pages/deposits";
import VendorCreditsPage from "@/pages/vendor-credits";
import ReportsPage from "@/pages/reports";
import AnalyticsPage from "@/pages/analytics";
import ActivityLogsPage from "@/pages/activity-logs";
import UserManagementPage from "@/pages/user-management";
import AccountSettingsPage from "@/pages/account-settings";
import CalendarPage from "@/pages/calendar";
import LoginPage from "@/pages/login";
import { Loader2, LogOut } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/agents" component={AgentsPage} />
      <Route path="/vendors" component={VendorsPage} />
      <Route path="/invoices" component={InvoicesPage} />
      <Route path="/tickets" component={TicketsPage} />
      <Route path="/deposits" component={DepositsPage} />
      <Route path="/vendor-credits" component={VendorCreditsPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/activity-logs" component={ActivityLogsPage} />
      <Route path="/settings/users" component={UserManagementPage} />
      <Route path="/settings/account" component={AccountSettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  const { user, logout } = useAuth();

  return (
    <PinProvider>
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-2">
                {user && (
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {user.username}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  title="Sign out"
                  data-testid="button-logout-header"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1 overflow-auto bg-muted/30">
              <Router />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </PinProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
