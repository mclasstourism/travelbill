import { Link, useLocation } from "wouter";
import { useSidebar } from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Ticket,
  Wallet,
  CreditCard,
  LogOut,
  BarChart3,
  Briefcase,
  User,
  Shield,
  Sun,
  Moon,
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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-provider";

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
  const { user, logout: authLogout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center">
          <img 
            src={companyLogo} 
            alt="MCT - Tourism Organizers" 
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
                    className="hover:bg-green-700 hover:text-white transition-colors"
                  >
                    <Link href={item.url} onClick={handleNavClick} data-testid={`link-nav-${item.title.toLowerCase()}`}>
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
                    className="hover:bg-green-700 hover:text-white transition-colors"
                  >
                    <Link href={item.url} onClick={handleNavClick} data-testid={`link-nav-${item.title.toLowerCase().replace(" ", "-")}`}>
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
                    className="hover:bg-green-700 hover:text-white transition-colors"
                  >
                    <Link href={item.url} onClick={handleNavClick} data-testid={`link-nav-${item.title.toLowerCase().replace(" ", "-")}`}>
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
                      className="hover:bg-green-700 hover:text-white transition-colors"
                    >
                      <Link href={item.url} onClick={handleNavClick} data-testid={`link-nav-${item.title.toLowerCase().replace(" ", "-")}`}>
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
        {user && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-sm font-medium truncate uppercase">{user.username}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="button-theme-toggle"
                title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </Button>
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
          </div>
        )}
      </SidebarFooter>

    </Sidebar>
  );
}
