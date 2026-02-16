import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Calendar,
  Download,
  Printer,
  Users,
  Briefcase,
  Building2,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";
import type { Invoice, Customer, Vendor, Agent, DepositTransaction, AgentTransaction, VendorTransaction } from "@shared/schema";
import { numberToWords } from "@/lib/number-to-words";
import mcLogo from "@assets/final-logo_1771172687891.png";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "paid":
      return "default";
    case "issued":
    case "partial":
      return "secondary";
    case "cancelled":
    case "refunded":
      return "destructive";
    default:
      return "outline";
  }
}

type DateRange = "today" | "this_week" | "this_month" | "this_year" | "custom";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("invoices");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: depositTransactions = [], isLoading: isLoadingDeposits } = useQuery<DepositTransaction[]>({
    queryKey: ["/api/deposit-transactions"],
  });

  const { data: agentTransactions = [], isLoading: isLoadingAgentTx } = useQuery<AgentTransaction[]>({
    queryKey: ["/api/agent-transactions"],
  });

  const { data: vendorTransactions = [], isLoading: isLoadingVendorTx } = useQuery<VendorTransaction[]>({
    queryKey: ["/api/vendor-transactions"],
  });

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    agents.forEach((a) => map.set(a.id, a));
    return map;
  }, [agents]);

  const vendorMap = useMemo(() => {
    const map = new Map<string, Vendor>();
    vendors.forEach((v) => map.set(v.id, v));
    return map;
  }, [vendors]);

  const getPartyName = (invoice: Invoice) => {
    if (invoice.customerType === "agent") {
      return agentMap.get(invoice.customerId)?.name || "Unknown";
    }
    return customerMap.get(invoice.customerId)?.name || "Unknown";
  };
  const getCustomerName = (id: string) => customerMap.get(id)?.name || "Unknown";
  const getAgentName = (id: string) => agentMap.get(id)?.name || "Unknown";
  const getVendorName = (id: string) => vendorMap.get(id)?.name || "Unknown";

  const dateFilter = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "this_week":
        return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "this_year":
        return { start: startOfYear(now), end: endOfYear(now) };
      case "custom":
        if (customStartDate && customEndDate) {
          return { start: startOfDay(parseISO(customStartDate)), end: endOfDay(parseISO(customEndDate)) };
        }
        return null;
      default:
        return null;
    }
  }, [dateRange, customStartDate, customEndDate]);

  const filterByDate = <T extends { createdAt: string }>(items: T[]) => {
    if (!dateFilter) return items;
    return items.filter(item => {
      const d = new Date(item.createdAt);
      return isWithinInterval(d, { start: dateFilter.start, end: dateFilter.end });
    });
  };

  const filteredInvoices = useMemo(() => filterByDate(invoices), [invoices, dateFilter]);

  const filteredDepositTx = useMemo(() => {
    let filtered = filterByDate(depositTransactions).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (searchQuery && activeTab === "customer_transactions") {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => tx.description.toLowerCase().includes(q));
    }
    if (customerFilter !== "all") {
      filtered = filtered.filter(tx => tx.customerId === customerFilter);
    }
    return filtered;
  }, [depositTransactions, dateFilter, searchQuery, customerFilter, activeTab]);

  const filteredAgentTx = useMemo(() => {
    let filtered = filterByDate(agentTransactions).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (searchQuery && activeTab === "agent_transactions") {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => tx.description.toLowerCase().includes(q));
    }
    if (agentFilter !== "all") {
      filtered = filtered.filter(tx => tx.agentId === agentFilter);
    }
    return filtered;
  }, [agentTransactions, dateFilter, searchQuery, agentFilter, activeTab]);

  const filteredVendorTx = useMemo(() => {
    let filtered = filterByDate(vendorTransactions).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (searchQuery && activeTab === "vendor_transactions") {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => tx.description.toLowerCase().includes(q));
    }
    if (vendorFilter !== "all") {
      filtered = filtered.filter(tx => tx.vendorId === vendorFilter);
    }
    return filtered;
  }, [vendorTransactions, dateFilter, searchQuery, vendorFilter, activeTab]);

  const invoiceTotals = useMemo(() => {
    const getInvoiceAmount = (inv: Invoice) => inv.subtotal - inv.discountAmount;
    return {
      count: filteredInvoices.length,
      total: filteredInvoices.reduce((sum, inv) => sum + getInvoiceAmount(inv), 0),
      paid: filteredInvoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + getInvoiceAmount(inv), 0),
      pending: filteredInvoices.filter(inv => inv.status !== "paid" && inv.status !== "cancelled").reduce((sum, inv) => sum + getInvoiceAmount(inv), 0),
    };
  }, [filteredInvoices]);

  const depositTotals = useMemo(() => ({
    count: filteredDepositTx.length,
    credits: filteredDepositTx.filter(tx => tx.type === "credit").reduce((s, tx) => s + tx.amount, 0),
    debits: filteredDepositTx.filter(tx => tx.type === "debit").reduce((s, tx) => s + tx.amount, 0),
  }), [filteredDepositTx]);

  const agentTxTotals = useMemo(() => ({
    count: filteredAgentTx.length,
    credits: filteredAgentTx.filter(tx => tx.type === "credit").reduce((s, tx) => s + tx.amount, 0),
    debits: filteredAgentTx.filter(tx => tx.type === "debit").reduce((s, tx) => s + tx.amount, 0),
  }), [filteredAgentTx]);

  const vendorTxTotals = useMemo(() => ({
    count: filteredVendorTx.length,
    credits: filteredVendorTx.filter(tx => tx.type === "credit").reduce((s, tx) => s + tx.amount, 0),
    debits: filteredVendorTx.filter(tx => tx.type === "debit").reduce((s, tx) => s + tx.amount, 0),
  }), [filteredVendorTx]);

  const toBase64 = (src: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  };

  const handlePrint = async () => {
    const logoDataUrl = await toBase64(mcLogo);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const dateRangeText = dateFilter
      ? `${format(dateFilter.start, "MMM d, yyyy")} - ${format(dateFilter.end, "MMM d, yyyy")}`
      : "All Time";

    let reportTitle = "TRANSACTION REPORT";
    let tableHtml = "";
    let summaryHtml = "";

    if (activeTab === "invoices") {
      reportTitle = "INVOICE REPORT";
      const invoiceTotalWords = numberToWords(invoiceTotals.total);
      const paidWords = numberToWords(invoiceTotals.paid);
      const pendingWords = numberToWords(invoiceTotals.pending);

      summaryHtml = `
        <div class="summary-box">
          <div class="summary-row"><span class="summary-label">Total Invoices:</span><span><span class="summary-value">${invoiceTotals.count} (${formatCurrency(invoiceTotals.total)})</span><br/><span class="amount-words">${invoiceTotalWords}</span></span></div>
          <div class="summary-row"><span class="summary-label">Paid Amount:</span><span><span class="summary-value" style="color: green;">${formatCurrency(invoiceTotals.paid)}</span><br/><span class="amount-words">${paidWords}</span></span></div>
          <div class="summary-row"><span class="summary-label">Pending Amount:</span><span><span class="summary-value" style="color: #d97706;">${formatCurrency(invoiceTotals.pending)}</span><br/><span class="amount-words">${pendingWords}</span></span></div>
        </div>
      `;

      const rows = filteredInvoices.map(inv => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${inv.invoiceNumber}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${format(new Date(inv.createdAt), "MMM d, yyyy")}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${getPartyName(inv)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${getVendorName(inv.vendorId)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${formatCurrency(inv.subtotal - inv.discountAmount)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${inv.status}</td>
        </tr>
      `).join("");

      tableHtml = filteredInvoices.length > 0 ? `
        <table><thead><tr><th>Invoice #</th><th>Date</th><th>Customer</th><th>Vendor</th><th class="right">Amount</th><th>Status</th></tr></thead>
        <tbody>${rows}<tr class="total-row"><td colspan="4">Total</td><td style="text-align: right; font-family: monospace;">${formatCurrency(invoiceTotals.total)}<span class="total-words">${invoiceTotalWords}</span></td><td></td></tr></tbody></table>
      ` : '<p class="no-data">No invoices found</p>';
    } else if (activeTab === "customer_transactions") {
      reportTitle = "CUSTOMER TRANSACTION REPORT";
      summaryHtml = `
        <div class="summary-box">
          <div class="summary-row"><span class="summary-label">Total Transactions:</span><span class="summary-value">${depositTotals.count}</span></div>
          <div class="summary-row"><span class="summary-label">Total Credits:</span><span class="summary-value" style="color: green;">${formatCurrency(depositTotals.credits)}</span></div>
          <div class="summary-row"><span class="summary-label">Total Debits:</span><span class="summary-value" style="color: red;">${formatCurrency(depositTotals.debits)}</span></div>
        </div>
      `;
      const rows = filteredDepositTx.map(tx => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${getCustomerName(tx.customerId)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.type === "credit" ? "Deposit Added" : "Deposit Used"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: ${tx.type === "credit" ? "green" : "red"};">${tx.type === "credit" ? "+" : "-"}${formatCurrency(tx.amount)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${formatCurrency(tx.balanceAfter)}</td>
        </tr>
      `).join("");
      tableHtml = filteredDepositTx.length > 0 ? `
        <table><thead><tr><th>Date</th><th>Customer</th><th>Description</th><th>Type</th><th class="right">Amount</th><th class="right">Balance</th></tr></thead>
        <tbody>${rows}</tbody></table>
      ` : '<p class="no-data">No transactions found</p>';
    } else if (activeTab === "agent_transactions") {
      reportTitle = "AGENT TRANSACTION REPORT";
      summaryHtml = `
        <div class="summary-box">
          <div class="summary-row"><span class="summary-label">Total Transactions:</span><span class="summary-value">${agentTxTotals.count}</span></div>
          <div class="summary-row"><span class="summary-label">Total Credits:</span><span class="summary-value" style="color: green;">${formatCurrency(agentTxTotals.credits)}</span></div>
          <div class="summary-row"><span class="summary-label">Total Debits:</span><span class="summary-value" style="color: red;">${formatCurrency(agentTxTotals.debits)}</span></div>
        </div>
      `;
      const rows = filteredAgentTx.map(tx => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${getAgentName(tx.agentId)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.transactionType === "credit" ? "Credit" : "Deposit"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.type === "credit" ? "Added" : "Used"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: ${tx.type === "credit" ? "green" : "red"};">${tx.type === "credit" ? "+" : "-"}${formatCurrency(tx.amount)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${formatCurrency(tx.balanceAfter)}</td>
        </tr>
      `).join("");
      tableHtml = filteredAgentTx.length > 0 ? `
        <table><thead><tr><th>Date</th><th>Agent</th><th>Description</th><th>Category</th><th>Type</th><th class="right">Amount</th><th class="right">Balance</th></tr></thead>
        <tbody>${rows}</tbody></table>
      ` : '<p class="no-data">No transactions found</p>';
    } else if (activeTab === "vendor_transactions") {
      reportTitle = "VENDOR TRANSACTION REPORT";
      summaryHtml = `
        <div class="summary-box">
          <div class="summary-row"><span class="summary-label">Total Transactions:</span><span class="summary-value">${vendorTxTotals.count}</span></div>
          <div class="summary-row"><span class="summary-label">Total Credits:</span><span class="summary-value" style="color: green;">${formatCurrency(vendorTxTotals.credits)}</span></div>
          <div class="summary-row"><span class="summary-label">Total Debits:</span><span class="summary-value" style="color: red;">${formatCurrency(vendorTxTotals.debits)}</span></div>
        </div>
      `;
      const rows = filteredVendorTx.map(tx => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${getVendorName(tx.vendorId)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.transactionType === "credit" ? "Credit" : "Deposit"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.type === "credit" ? "Added" : "Used"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: ${tx.type === "credit" ? "green" : "red"};">${tx.type === "credit" ? "+" : "-"}${formatCurrency(tx.amount)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${formatCurrency(tx.balanceAfter)}</td>
        </tr>
      `).join("");
      tableHtml = filteredVendorTx.length > 0 ? `
        <table><thead><tr><th>Date</th><th>Vendor</th><th>Description</th><th>Category</th><th>Type</th><th class="right">Amount</th><th class="right">Balance</th></tr></thead>
        <tbody>${rows}</tbody></table>
      ` : '<p class="no-data">No transactions found</p>';
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle} - ${dateRangeText}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; color: #1e293b; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0; }
            .header-logo img { height: 65px; }
            .header-info { text-align: right; }
            .header-info p { margin: 2px 0; font-size: 12px; color: #64748b; }
            .header-divider { height: 3px; background: linear-gradient(to right, #1a5632, #22c55e, #1a5632); margin: 14px 0 10px 0; border-radius: 2px; }
            .report-title { text-align: center; font-size: 22px; font-weight: 700; color: #1a5632; margin: 10px 0 4px 0; letter-spacing: 1px; }
            .date-range { text-align: center; color: #666; margin-bottom: 20px; font-size: 13px; }
            .summary-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .summary-label { font-weight: 500; }
            .summary-value { font-family: monospace; font-weight: bold; }
            .amount-words { font-size: 11px; color: #64748b; font-style: italic; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f3f4f6; padding: 10px 8px; text-align: left; border-bottom: 2px solid #d1d5db; font-weight: 600; }
            th.right { text-align: right; }
            .total-row { font-weight: bold; background: #f9fafb; }
            .total-row td { padding: 12px 8px; border-top: 2px solid #333; }
            .total-words { font-size: 11px; color: #64748b; font-style: italic; font-weight: normal; display: block; margin-top: 2px; }
            .no-data { text-align: center; padding: 20px; color: #666; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-logo"><img src="${logoDataUrl}" alt="MCT - Tourism Organizers" /></div>
            <div class="header-info">
              <p>Phone: 025 640 224 | 050 222 1042</p>
              <p>www.middleclass.ae | sales@middleclass.ae</p>
              <p>Shop 41, Al Dhannah Traditional Souq,</p>
              <p>Al Dhannah City, Abu Dhabi – UAE</p>
            </div>
          </div>
          <div class="header-divider"></div>
          <p class="report-title">${reportTitle}</p>
          <p class="date-range">${dateRangeText}</p>
          ${summaryHtml}
          ${tableHtml}
          <p style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const handleExportExcel = () => {
    const dateRangeText = dateFilter
      ? `${format(dateFilter.start, "yyyy-MM-dd")} to ${format(dateFilter.end, "yyyy-MM-dd")}`
      : "All Time";

    let csvContent = "";
    let filename = "";

    if (activeTab === "invoices") {
      filename = `invoice_report_${format(new Date(), "yyyyMMdd")}.csv`;
      const headers = ["Invoice #", "Date", "Customer", "Vendor", "Amount", "Status"];
      const rows = filteredInvoices.map(inv => [
        inv.invoiceNumber,
        format(new Date(inv.createdAt), "yyyy-MM-dd"),
        `"${getPartyName(inv)}"`,
        `"${getVendorName(inv.vendorId)}"`,
        inv.subtotal - inv.discountAmount,
        inv.status,
      ]);
      csvContent = [
        ["Invoice Report"], [`Date Range: ${dateRangeText}`], [`Total: ${invoiceTotals.count}`], [],
        headers, ...rows
      ].map(r => r.join(",")).join("\n");
    } else if (activeTab === "customer_transactions") {
      filename = `customer_transaction_report_${format(new Date(), "yyyyMMdd")}.csv`;
      const headers = ["Date", "Customer", "Description", "Type", "Amount", "Balance After"];
      const rows = filteredDepositTx.map(tx => [
        format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm"),
        `"${getCustomerName(tx.customerId)}"`,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.type === "credit" ? "Deposit Added" : "Deposit Used",
        tx.type === "credit" ? tx.amount : -tx.amount,
        tx.balanceAfter,
      ]);
      csvContent = [
        ["Customer Transaction Report"], [`Date Range: ${dateRangeText}`], [`Total: ${depositTotals.count}`], [],
        headers, ...rows
      ].map(r => r.join(",")).join("\n");
    } else if (activeTab === "agent_transactions") {
      filename = `agent_transaction_report_${format(new Date(), "yyyyMMdd")}.csv`;
      const headers = ["Date", "Agent", "Description", "Category", "Type", "Amount", "Balance After"];
      const rows = filteredAgentTx.map(tx => [
        format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm"),
        `"${getAgentName(tx.agentId)}"`,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.transactionType === "credit" ? "Credit" : "Deposit",
        tx.type === "credit" ? "Added" : "Used",
        tx.type === "credit" ? tx.amount : -tx.amount,
        tx.balanceAfter,
      ]);
      csvContent = [
        ["Agent Transaction Report"], [`Date Range: ${dateRangeText}`], [`Total: ${agentTxTotals.count}`], [],
        headers, ...rows
      ].map(r => r.join(",")).join("\n");
    } else if (activeTab === "vendor_transactions") {
      filename = `vendor_transaction_report_${format(new Date(), "yyyyMMdd")}.csv`;
      const headers = ["Date", "Vendor", "Description", "Category", "Type", "Amount", "Balance After"];
      const rows = filteredVendorTx.map(tx => [
        format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm"),
        `"${getVendorName(tx.vendorId)}"`,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.transactionType === "credit" ? "Credit" : "Deposit",
        tx.type === "credit" ? "Added" : "Used",
        tx.type === "credit" ? tx.amount : -tx.amount,
        tx.balanceAfter,
      ]);
      csvContent = [
        ["Vendor Transaction Report"], [`Date Range: ${dateRangeText}`], [`Total: ${vendorTxTotals.count}`], [],
        headers, ...rows
      ].map(r => r.join(",")).join("\n");
    }

    if (csvContent) {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    }
  };

  const isLoading = isLoadingInvoices || isLoadingDeposits || isLoadingAgentTx || isLoadingVendorTx;

  const renderSummaryCards = () => {
    if (activeTab === "invoices") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="overflow-visible">
            <CardContent className="pt-5 pb-4 px-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Total Invoices ({invoiceTotals.count})</p>
              <div className="text-xl font-bold font-mono" data-testid="text-invoice-count">{formatCurrency(invoiceTotals.total)}</div>
            </CardContent>
          </Card>
          <Card className="overflow-visible">
            <CardContent className="pt-5 pb-4 px-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Paid Amount</p>
              <div className="text-xl font-bold text-green-600 dark:text-green-400 font-mono" data-testid="text-paid-amount">{formatCurrency(invoiceTotals.paid)}</div>
            </CardContent>
          </Card>
          <Card className="overflow-visible">
            <CardContent className="pt-5 pb-4 px-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Pending Amount</p>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono" data-testid="text-pending-amount">{formatCurrency(invoiceTotals.pending)}</div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const totals = activeTab === "customer_transactions" ? depositTotals
      : activeTab === "agent_transactions" ? agentTxTotals
      : vendorTxTotals;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="overflow-visible">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Total Transactions</p>
                <div className="text-xl font-bold font-mono" data-testid="text-total-transactions">{totals.count}</div>
              </div>
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
                <Calendar className="h-4 w-4 text-[hsl(var(--primary))]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-visible">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Total Credits</p>
                <div className="text-xl font-bold font-mono text-green-600 dark:text-green-400" data-testid="text-total-credits">{formatCurrency(totals.credits)}</div>
              </div>
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-visible">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Total Debits</p>
                <div className="text-xl font-bold font-mono text-red-600 dark:text-red-400" data-testid="text-total-debits">{formatCurrency(totals.debits)}</div>
              </div>
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ArrowDownCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-reports-title">Reports</h1>
          <p className="text-sm text-muted-foreground">View and filter transaction records by date</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportExcel} variant="outline" data-testid="button-export-excel">
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button onClick={handlePrint} variant="outline" data-testid="button-print-report">
            <Printer className="w-4 h-4 mr-2" />
            Print PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Date Filter</span>
        </div>
        <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
          <SelectTrigger className="w-36" data-testid="select-date-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {dateRange === "custom" && (
          <>
            <Input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="w-36"
              data-testid="input-start-date"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="w-36"
              data-testid="input-end-date"
            />
          </>
        )}

        {dateFilter && (
          <span className="text-sm text-muted-foreground">
            Showing: {format(dateFilter.start, "MMM d, yyyy")} - {format(dateFilter.end, "MMM d, yyyy")}
          </span>
        )}

        {activeTab !== "invoices" && (
          <>
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>

            {activeTab === "customer_transactions" && (
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="w-44" data-testid="select-customer-filter">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeTab === "agent_transactions" && (
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-44" data-testid="select-agent-filter">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeTab === "vendor_transactions" && (
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-44" data-testid="select-vendor-filter">
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        )}
      </div>

      {renderSummaryCards()}

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchQuery(""); }}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <FileText className="w-4 h-4 mr-2" />
            Invoices ({filteredInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="customer_transactions" data-testid="tab-customer-transactions">
            <Users className="w-4 h-4 mr-2" />
            Customer ({filteredDepositTx.length})
          </TabsTrigger>
          <TabsTrigger value="agent_transactions" data-testid="tab-agent-transactions">
            <Briefcase className="w-4 h-4 mr-2" />
            Agent ({filteredAgentTx.length})
          </TabsTrigger>
          <TabsTrigger value="vendor_transactions" data-testid="tab-vendor-transactions">
            <Building2 className="w-4 h-4 mr-2" />
            Vendor ({filteredVendorTx.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-4">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No invoices found</p>
                  <p className="text-sm">No invoices match the selected date range</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Amount in Words</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id} data-testid={`row-report-invoice-${invoice.id}`}>
                          <TableCell className="font-medium font-mono">{invoice.invoiceNumber}</TableCell>
                          <TableCell className="text-muted-foreground">{format(new Date(invoice.createdAt), "MMM d, yyyy")}</TableCell>
                          <TableCell>{getPartyName(invoice)}</TableCell>
                          <TableCell>{getVendorName(invoice.vendorId)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{formatCurrency(invoice.subtotal - invoice.discountAmount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs">{numberToWords(invoice.subtotal - invoice.discountAmount)}</TableCell>
                          <TableCell><Badge variant={getStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-lg">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between gap-4 flex-wrap"><span>Total Invoice Amount:</span><span className="font-mono font-semibold">{formatCurrency(invoiceTotals.total)}</span></div>
              <div className="text-sm text-muted-foreground">{numberToWords(invoiceTotals.total)}</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer_transactions" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-4">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : filteredDepositTx.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No customer transactions found</p>
                  <p className="text-sm">Adjust filters or date range</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDepositTx.map((tx) => (
                        <TableRow key={tx.id} data-testid={`row-deposit-tx-${tx.id}`}>
                          <TableCell className="font-mono text-sm">{format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell className="font-medium">{getCustomerName(tx.customerId)}</TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell>
                            {tx.type === "credit" ? (
                              <Badge variant="default"><ArrowUpCircle className="w-3 h-3 mr-1" />Deposit Added</Badge>
                            ) : (
                              <Badge variant="destructive"><ArrowDownCircle className="w-3 h-3 mr-1" />Deposit Used</Badge>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-mono font-semibold ${tx.type === "credit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">{formatCurrency(tx.balanceAfter)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agent_transactions" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-4">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : filteredAgentTx.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No agent transactions found</p>
                  <p className="text-sm">Adjust filters or date range</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgentTx.map((tx) => (
                        <TableRow key={tx.id} data-testid={`row-agent-tx-${tx.id}`}>
                          <TableCell className="font-mono text-sm">{format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell className="font-medium">{getAgentName(tx.agentId)}</TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell><Badge variant="outline">{tx.transactionType === "credit" ? "Credit" : "Deposit"}</Badge></TableCell>
                          <TableCell>
                            {tx.type === "credit" ? (
                              <Badge variant="default"><ArrowUpCircle className="w-3 h-3 mr-1" />Added</Badge>
                            ) : (
                              <Badge variant="destructive"><ArrowDownCircle className="w-3 h-3 mr-1" />Used</Badge>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-mono font-semibold ${tx.type === "credit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">{formatCurrency(tx.balanceAfter)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendor_transactions" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-4">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : filteredVendorTx.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No vendor transactions found</p>
                  <p className="text-sm">Adjust filters or date range</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVendorTx.map((tx) => (
                        <TableRow key={tx.id} data-testid={`row-vendor-tx-${tx.id}`}>
                          <TableCell className="font-mono text-sm">{format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell className="font-medium">{getVendorName(tx.vendorId)}</TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell><Badge variant="outline">{tx.transactionType === "credit" ? "Credit" : "Deposit"}</Badge></TableCell>
                          <TableCell>
                            {tx.type === "credit" ? (
                              <Badge variant="default"><ArrowUpCircle className="w-3 h-3 mr-1" />Added</Badge>
                            ) : (
                              <Badge variant="destructive"><ArrowDownCircle className="w-3 h-3 mr-1" />Used</Badge>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-mono font-semibold ${tx.type === "credit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">{formatCurrency(tx.balanceAfter)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
