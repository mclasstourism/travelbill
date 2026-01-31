import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Ticket,
  Wallet,
  CreditCard,
  Settings,
  Lock,
  LogOut,
  BarChart3,
  Briefcase,
  User,
  Shield,
} from "lucide-react";
import companyLogo from "@assets/logo_optimized.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePin } from "@/lib/pin-context";
import { useAuth } from "@/lib/auth-context";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Tickets", url: "/tickets", icon: Ticket },
];

const partyItems = [
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Agents", url: "/agents", icon: Briefcase },
  { title: "Vendors", url: "/vendors", icon: Building2 },
];

const financeItems = [
  { title: "Customer Deposits", url: "/deposits", icon: Wallet },
  { title: "Agent Credits", url: "/agent-credits", icon: Briefcase },
  { title: "Vendor Credits", url: "/vendor-credits", icon: CreditCard },
];

const settingsItems = [
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Admin Settings", url: "/settings/admin", icon: Shield },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isAuthenticated, billCreatorName, logout: pinLogout } = usePin();
  const { user, logout: authLogout } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center">
          <img 
            src={companyLogo} 
            alt="Middle Class Tourism" 
            className="h-10 w-auto object-contain"
            data-testid="img-sidebar-logo"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase()}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Parties</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {partyItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(" ", "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Finance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {financeItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(" ", "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                    >
                      <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(" ", "-")}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-3">
        {isAuthenticated && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="secondary" className="text-xs">
                <Lock className="w-3 h-3 mr-1" />
                {billCreatorName}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={pinLogout}
              data-testid="button-pin-logout"
              title="End PIN session"
            >
              <Lock className="w-4 h-4" />
            </Button>
          </div>
        )}
        {user && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="outline" className="text-xs">
                <User className="w-3 h-3 mr-1" />
                {user.username}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={authLogout}
              data-testid="button-logout"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
