import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { PinProvider } from "@/lib/pin-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import CustomersPage from "@/pages/customers";
import AgentsPage from "@/pages/agents";
import VendorsPage from "@/pages/vendors";
import InvoicesPage from "@/pages/invoices";
import TicketsPage from "@/pages/tickets";
import DepositsPage from "@/pages/deposits";
import VendorCreditsPage from "@/pages/vendor-credits";
import BillCreatorsPage from "@/pages/bill-creators";
import ReportsPage from "@/pages/reports";

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
      <Route path="/settings/bill-creators" component={BillCreatorsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PinProvider>
          <TooltipProvider>
            <SidebarProvider style={sidebarStyle as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 overflow-hidden">
                  <header className="flex items-center justify-between gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-auto bg-muted/30">
                    <Router />
                  </main>
                </div>
              </div>
            </SidebarProvider>
            <Toaster />
          </TooltipProvider>
        </PinProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
