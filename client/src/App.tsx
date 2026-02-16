import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import CustomersPage from "@/pages/customers";
import AgentsPage from "@/pages/agents";
import VendorsPage from "@/pages/vendors";
import InvoicesPage from "@/pages/invoices";
import TicketsPage from "@/pages/tickets";
import DepositsPage from "@/pages/deposits";
import VendorCreditsPage from "@/pages/vendor-credits";
import AgentCreditsPage from "@/pages/agent-credits";
import ReportsPage from "@/pages/reports";
import AdminSettingsPage from "@/pages/admin-settings";
import CashReceiptsPage from "@/pages/cash-receipts";
import LoginPage from "@/pages/login";
import { Loader2 } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/agents" component={AgentsPage} />
      <Route path="/vendors" component={VendorsPage} />
      <Route path="/invoices" component={InvoicesPage} />
      <Route path="/tickets" component={TicketsPage} />
      <Route path="/cash-receipts" component={CashReceiptsPage} />
      <Route path="/deposits" component={DepositsPage} />
      <Route path="/vendor-credits" component={VendorCreditsPage} />
      <Route path="/agent-credits" component={AgentCreditsPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/settings/admin" component={AdminSettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
                      <main className="flex-1 overflow-auto bg-muted/30">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
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
