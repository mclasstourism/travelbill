import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, FileText, Ticket, Users, Building2, Wallet, User, BarChart3 } from "lucide-react";
import type { ActivityLog } from "@shared/schema";

const entityIcons: Record<string, any> = {
  invoice: FileText,
  ticket: Ticket,
  customer: Users,
  agent: Users,
  vendor: Building2,
  deposit: Wallet,
  user: User,
  report: BarChart3,
};

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  login: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  logout: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  view: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  export: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  email: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

export default function ActivityLogsPage() {
  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Activity Logs</h1>
        <Card>
          <CardContent className="pt-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b last:border-0">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Activity Logs</h1>
        <Badge variant="outline" className="text-sm">
          <Activity className="w-4 h-4 mr-1" />
          Audit Trail
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No activity recorded yet</p>
              <p className="text-sm mt-1">Actions will be logged as users interact with the system</p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => {
                const Icon = entityIcons[log.entity] || Activity;
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 py-3 border-b last:border-0 hover-elevate rounded-md px-2 -mx-2"
                    data-testid={`activity-log-${log.id}`}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{log.userName}</span>
                        <Badge className={`text-xs ${actionColors[log.action] || ''}`}>
                          {log.action}
                        </Badge>
                        <span className="text-muted-foreground">{log.entity}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
