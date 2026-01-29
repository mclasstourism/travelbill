import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings, Building2, Globe, Mail, Phone } from "lucide-react";

export default function AdminSettings() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-admin-settings-title">Admin Settings</h1>
          <p className="text-muted-foreground">Manage system configuration and preferences</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Information
            </CardTitle>
            <CardDescription>Update your company details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input 
                id="company-name" 
                defaultValue="Middle Class Tourism" 
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-address">Address</Label>
              <Input 
                id="company-address" 
                placeholder="Enter company address" 
                data-testid="input-company-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-phone">Phone</Label>
              <Input 
                id="company-phone" 
                placeholder="Enter phone number" 
                data-testid="input-company-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-email">Email</Label>
              <Input 
                id="company-email" 
                type="email"
                placeholder="Enter company email" 
                data-testid="input-company-email"
              />
            </div>
            <Button className="w-full" data-testid="button-save-company">
              Save Company Info
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Regional Settings
            </CardTitle>
            <CardDescription>Configure regional preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-currency">Default Currency</Label>
              <Input 
                id="default-currency" 
                defaultValue="AED" 
                disabled
                className="bg-muted"
                data-testid="input-default-currency"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input 
                id="timezone" 
                defaultValue="Asia/Dubai (GMT+4)" 
                disabled
                className="bg-muted"
                data-testid="input-timezone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-format">Date Format</Label>
              <Input 
                id="date-format" 
                defaultValue="DD/MM/YYYY" 
                disabled
                className="bg-muted"
                data-testid="input-date-format"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Settings
            </CardTitle>
            <CardDescription>Configure email notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Invoice Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Send email when invoice is created</p>
              </div>
              <Switch defaultChecked data-testid="switch-invoice-email" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Payment Reminders</Label>
                <p className="text-sm text-muted-foreground">Send payment reminder emails</p>
              </div>
              <Switch data-testid="switch-payment-reminders" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Ticket Confirmation</Label>
                <p className="text-sm text-muted-foreground">Send ticket confirmation emails</p>
              </div>
              <Switch defaultChecked data-testid="switch-ticket-confirmation" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              System Preferences
            </CardTitle>
            <CardDescription>General system settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-generate Invoice Numbers</Label>
                <p className="text-sm text-muted-foreground">Automatically generate invoice numbers</p>
              </div>
              <Switch defaultChecked data-testid="switch-auto-invoice" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Require PIN for Transactions</Label>
                <p className="text-sm text-muted-foreground">Require staff PIN for all transactions</p>
              </div>
              <Switch defaultChecked data-testid="switch-require-pin" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Activity Logging</Label>
                <p className="text-sm text-muted-foreground">Log all user activities</p>
              </div>
              <Switch defaultChecked data-testid="switch-activity-logging" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
