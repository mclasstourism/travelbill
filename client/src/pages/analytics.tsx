import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Briefcase, MapPin, Building2, DollarSign } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { SalesAnalytics } from "@shared/schema";

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery<SalesAnalytics>({
    queryKey: ["/api/analytics"],
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="lg:hidden" data-testid="button-sidebar-toggle" />
          <h1 className="text-xl md:text-2xl font-bold">Sales Analytics</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="lg:hidden" data-testid="button-sidebar-toggle" />
          <h1 className="text-xl md:text-2xl font-bold">Sales Analytics</h1>
        </div>
        <Badge variant="outline" className="text-sm">
          <TrendingUp className="w-4 h-4 mr-1" />
          Real-time Data
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Top Customers</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3">By total spending</CardDescription>
            {analytics?.topCustomers?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {analytics?.topCustomers?.slice(0, 5).map((customer, i) => (
                  <div key={customer.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <span className="text-sm font-medium truncate max-w-32">{customer.name}</span>
                    </div>
                    <span className="text-sm font-mono">AED {customer.totalSpent.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Top Agents</CardTitle>
            <Briefcase className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3">By total sales</CardDescription>
            {analytics?.topAgents?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {analytics?.topAgents?.slice(0, 5).map((agent, i) => (
                  <div key={agent.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <span className="text-sm font-medium truncate max-w-32">{agent.name}</span>
                    </div>
                    <span className="text-sm font-mono">AED {agent.totalSales.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Popular Routes</CardTitle>
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3">Most booked routes</CardDescription>
            {analytics?.topRoutes?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {analytics?.topRoutes?.slice(0, 5).map((route, i) => (
                  <div key={route.route} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <span className="text-sm font-medium truncate max-w-32">{route.route}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{route.count} tickets</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Vendor Comparison</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3">Cost analysis by vendor</CardDescription>
            {analytics?.vendorComparison?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {analytics?.vendorComparison?.slice(0, 5).map((vendor) => (
                  <div key={vendor.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate max-w-32">{vendor.name}</span>
                    <div className="text-right">
                      <div className="text-sm font-mono">AED {vendor.avgCost.toFixed(0)}/avg</div>
                      <div className="text-xs text-muted-foreground">{vendor.ticketCount} tickets</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Profit by Vendor</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3">Revenue, cost, and profit margins</CardDescription>
            {analytics?.profitByVendor?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Vendor</th>
                      <th className="text-right py-2 font-medium">Revenue</th>
                      <th className="text-right py-2 font-medium">Cost</th>
                      <th className="text-right py-2 font-medium">Profit</th>
                      <th className="text-right py-2 font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics?.profitByVendor?.map((vendor) => (
                      <tr key={vendor.vendorId} className="border-b last:border-0">
                        <td className="py-2">{vendor.vendorName}</td>
                        <td className="py-2 text-right font-mono">AED {vendor.revenue.toLocaleString()}</td>
                        <td className="py-2 text-right font-mono">AED {vendor.cost.toLocaleString()}</td>
                        <td className={`py-2 text-right font-mono ${vendor.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          AED {vendor.profit.toLocaleString()}
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant={vendor.margin >= 10 ? "default" : "secondary"}>
                            {vendor.margin.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Daily Sales</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3">Sales trend over time</CardDescription>
            {analytics?.dailySales?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex gap-2 min-w-max pb-2">
                  {analytics?.dailySales?.slice(-14).map((day) => (
                    <div key={day.date} className="flex flex-col items-center min-w-16">
                      <div className="text-xs text-muted-foreground mb-1">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="bg-primary/10 rounded-md p-2 text-center w-full">
                        <div className="text-sm font-mono">AED {day.amount.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{day.count} inv</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
