import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Ticket,
  Settings,
  Lock,
  LogOut,
  BarChart3,
  Briefcase,
  User,
  TrendingUp,
  Calendar,
  Activity,
  UserCog,
  Plane,
  Monitor,
} from "lucide-react";
import companyLogo from "@assets/Updated_Logo_1769092146053.png";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePin } from "@/lib/pin-context";
import { useAuth } from "@/lib/auth-context";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Ticket Issuance", url: "/tickets", icon: Ticket },
  { title: "Sales Monitor", url: "/sales-monitor", icon: Monitor },
  { title: "Invoices", url: "/invoices", icon: FileText },
];

const partyItems = [
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Agents", url: "/agents", icon: Briefcase },
  { title: "Vendors", url: "/vendors", icon: Building2 },
];

const reportsItems = [
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Analytics", url: "/analytics", icon: TrendingUp },
  { title: "Activity Logs", url: "/activity-logs", icon: Activity },
];

const settingsItems = [
  { title: "User Management", url: "/settings/users", icon: UserCog },
  { title: "Admin Settings", url: "/settings/admin", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isAuthenticated, staffName, logout: pinLogout } = usePin();
  const { user, logout: authLogout } = useAuth();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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

        {user?.role === "superadmin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Reports</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {reportsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
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

        {user?.role === "superadmin" && (
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

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {user && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{user.name || user.username}</span>
                <Badge variant="secondary" className="text-xs w-fit">
                  {user.role === "superadmin" ? "Admin" : "Staff"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={authLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
              <ThemeToggle variant="outline" />
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
