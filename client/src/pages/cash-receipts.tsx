import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { PinDialog } from "@/components/pin-dialog";
import html2pdf from "html2pdf.js";
import mcLogo from "@assets/final-logo_1771172687891.png";
import stampImg from "@assets/Middle_Class_Tourism_Stamp_1771173890616.png";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Receipt, Search, Loader2, Eye, Printer, Calendar, Download, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";
import { z } from "zod";
import type { Customer, Agent, Vendor, CashReceipt } from "@shared/schema";

const nameColors = [
  "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e",
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#2563eb", "#7c3aed", "#c026d3",
];
function getNameColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return nameColors[Math.abs(hash) % nameColors.length];
}

type DateRange = "all" | "today" | "this_month" | "this_year" | "custom";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

const createReceiptSchema = z.object({
  partyType: z.enum(["customer", "agent", "vendor"]),
  partyId: z.string().min(1, "Party is required"),
  sourceType: z.enum(["flight", "other"]),
  pnr: z.string().optional().or(z.literal("")),
  serviceName: z.string().optional().or(z.literal("")),
  sector: z.string().optional().or(z.literal("")),
  travelDate: z.string().optional().or(z.literal("")),
  airlinesFlightNo: z.string().optional().or(z.literal("")),
  tktNo: z.string().optional().or(z.literal("")),
  departureTime: z.string().optional().or(z.literal("")),
  arrivalTime: z.string().optional().or(z.literal("")),
  basicFare: z.coerce.number().optional().default(0),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  paymentMethod: z.enum(["cash", "card", "cheque", "bank_transfer"]),
  description: z.string().optional().or(z.literal("")),
  referenceNumber: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.sourceType === "flight") {
    if (!data.sector || data.sector.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Sector is required", path: ["sector"] });
    }
    if (!data.travelDate || data.travelDate.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Travel date is required", path: ["travelDate"] });
    }
  }
});

type CreateReceiptForm = z.infer<typeof createReceiptSchema>;

const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero AED';
  const wholeNum = Math.floor(num);
  const decimal = Math.round((num - wholeNum) * 100);
  const convertChunk = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertChunk(n % 100) : '');
  };
  const parts: string[] = [];
  const million = Math.floor(wholeNum / 1000000);
  const thousand = Math.floor((wholeNum % 1000000) / 1000);
  const remainder = wholeNum % 1000;
  if (million > 0) parts.push(convertChunk(million) + ' Million');
  if (thousand > 0) parts.push(convertChunk(thousand) + ' Thousand');
  if (remainder > 0) parts.push(convertChunk(remainder));
  let result = parts.join(' ') + ' AED';
  if (decimal > 0) result += ' and ' + decimal + ' Fils';
  return result;
};

export default function CashReceiptsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pinVerifiedUser, setPinVerifiedUser] = useState<{ userId: string; username: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState("all");
  const [selectedReceipt, setSelectedReceipt] = useState<CashReceipt | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: receipts = [], isLoading: isLoadingReceipts } = useQuery<CashReceipt[]>({
    queryKey: ["/api/cash-receipts"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const form = useForm<CreateReceiptForm>({
    resolver: zodResolver(createReceiptSchema),
    defaultValues: {
      partyType: "customer",
      partyId: "",
      sourceType: "flight",
      pnr: "",
      serviceName: "",
      sector: "",
      travelDate: "",
      airlinesFlightNo: "",
      tktNo: "",
      departureTime: "",
      arrivalTime: "",
      basicFare: 0,
      amount: 0,
      paymentMethod: "cash",
      description: "",
      referenceNumber: "",
    },
  });

  const selectedPartyType = form.watch("partyType");
  const selectedSourceType = form.watch("sourceType");

  const partyOptions = useMemo(() => {
    switch (selectedPartyType) {
      case "customer":
        return customers.map(c => ({ id: c.id, name: c.name }));
      case "agent":
        return agents.map(a => ({ id: a.id, name: a.name }));
      case "vendor":
        return vendors.map(v => ({ id: v.id, name: v.name }));
      default:
        return [];
    }
  }, [selectedPartyType, customers, agents, vendors]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateReceiptForm) => {
      const res = await apiRequest("POST", "/api/cash-receipts", {
        ...data,
        issuedBy: pinVerifiedUser?.userId || user?.id || "",
        createdByName: pinVerifiedUser?.username || user?.username || "",
      });
      return res.json();
    },
    onSuccess: (receipt) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-receipts"] });
      toast({ title: "Receipt Created", description: `Receipt ${receipt.receiptNumber} has been created.` });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create receipt.", variant: "destructive" });
    },
  });

  const onSubmit = (data: CreateReceiptForm) => {
    createMutation.mutate(data);
  };

  const getPartyName = (receipt: CashReceipt) => {
    switch (receipt.partyType) {
      case "customer":
        return customers.find(c => c.id === receipt.partyId)?.name || "Unknown";
      case "agent":
        return agents.find(a => a.id === receipt.partyId)?.name || "Unknown";
      case "vendor":
        return vendors.find(v => v.id === receipt.partyId)?.name || "Unknown";
      default:
        return "Unknown";
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Cash",
      card: "Card",
      cheque: "Cheque",
      bank_transfer: "Bank Transfer",
    };
    return labels[method] || method;
  };

  const filteredReceipts = useMemo(() => {
    let filtered = receipts;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.receiptNumber.toLowerCase().includes(q) ||
        getPartyName(r).toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q)
      );
    }

    if (dateRange !== "all") {
      const now = new Date();
      filtered = filtered.filter(r => {
        const date = parseISO(r.createdAt);
        switch (dateRange) {
          case "today":
            return isWithinInterval(date, { start: startOfDay(now), end: endOfDay(now) });
          case "this_month":
            return isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) });
          case "this_year":
            return isWithinInterval(date, { start: startOfYear(now), end: endOfYear(now) });
          case "custom":
            if (customStartDate && customEndDate) {
              return isWithinInterval(date, {
                start: startOfDay(parseISO(customStartDate)),
                end: endOfDay(parseISO(customEndDate)),
              });
            }
            return true;
          default:
            return true;
        }
      });
    }

    if (createdByFilter !== "all") {
      filtered = filtered.filter(r => r.createdByName === createdByFilter);
    }

    return filtered;
  }, [receipts, searchQuery, dateRange, customStartDate, customEndDate, customers, agents, vendors, createdByFilter]);

  const totalAmount = useMemo(() => {
    return filteredReceipts.reduce((sum, r) => sum + r.amount, 0);
  }, [filteredReceipts]);

  const toBase64 = async (src: string): Promise<string> => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return src;
    }
  };

  const getReceiptHtml = (receipt: CashReceipt, logoDataUrl: string, stampDataUrl: string) => {
    return `
      <div style="max-width: 700px; margin: 0 auto; padding: 30px 36px; font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b;">
        <!-- Header: Logo left, Contact right -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0;">
          <div style="flex-shrink: 0;">
            <img src="${logoDataUrl}" alt="Middle Class Tourism" style="height: 65px;" />
          </div>
          <div style="text-align: right;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1a5632; letter-spacing: 2px;">CASH RECEIPT</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b;">${receipt.receiptNumber}</p>
          </div>
        </div>
        <div style="height: 3px; background: linear-gradient(to right, #1a5632, #22c55e, #1a5632); margin: 14px 0 20px 0; border-radius: 2px;"></div>

        <!-- Company Info & Receipt Meta -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 24px;">
          <div style="font-size: 11px; color: #64748b; line-height: 1.7;">
            <p style="margin: 0;">Phone: 025 640 224 | 050 222 1042</p>
            <p style="margin: 0;">www.middleclass.ae | sales@middleclass.ae</p>
            <p style="margin: 0;">Shop 41, Al Dhannah Traditional Souq, Al Dhannah City, Abu Dhabi \u2013 UAE</p>
          </div>
          <div style="text-align: right; font-size: 12px;">
            <table style="border-collapse: collapse; margin-left: auto;">
              <tr>
                <td style="padding: 3px 12px 3px 0; color: #64748b; font-weight: 500;">Date:</td>
                <td style="padding: 3px 0; font-weight: 600;">${format(parseISO(receipt.createdAt), "dd MMM yyyy, hh:mm a")}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Received From -->
        <div style="background: #f0fdf4; border-left: 4px solid #1a5632; padding: 14px 16px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
          <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: 700; color: #1a5632; text-transform: uppercase; letter-spacing: 1px;">Received From (${receipt.partyType})</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1e293b;">${getPartyName(receipt)}</p>
        </div>

        <!-- Receipt Details Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 10px 12px; background: #1a5632; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 4px 0 0 0;">Detail</th>
              <th style="text-align: right; padding: 10px 12px; background: #1a5632; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 0 4px 0 0;">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #ffffff;">
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Source</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">${receipt.sourceType === "flight" ? "Flight Details" : "Other Service"}</td>
            </tr>
            ${receipt.sourceType === "flight" && receipt.sector ? `
            <tr style="background: #f8fafc;">
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Sector</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">${receipt.sector}</td>
            </tr>
            ` : ""}
            ${receipt.sourceType === "flight" && receipt.travelDate ? `
            <tr style="background: #ffffff;">
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Travel Date</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">${receipt.travelDate}</td>
            </tr>
            ` : ""}
            ${receipt.sourceType === "flight" && receipt.airlinesFlightNo ? `
            <tr style="background: #f8fafc;">
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Flight No</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">${receipt.airlinesFlightNo}</td>
            </tr>
            ` : ""}
            ${receipt.sourceType === "flight" && receipt.pnr ? `
            <tr style="background: #ffffff;">
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">PNR</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500; font-family: 'Courier New', monospace;">${receipt.pnr}</td>
            </tr>
            ` : ""}
            ${receipt.sourceType === "flight" && receipt.tktNo ? `
            <tr style="background: #f8fafc;">
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">TKT No</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500; font-family: 'Courier New', monospace;">${receipt.tktNo}</td>
            </tr>
            ` : ""}
            ${receipt.sourceType === "flight" && (receipt.departureTime || receipt.arrivalTime) ? `
            <tr style="background: #ffffff;">
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Departure / Arrival</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">${receipt.departureTime || "--"} / ${receipt.arrivalTime || "--"}</td>
            </tr>
            ` : ""}
            ${receipt.sourceType === "flight" && receipt.basicFare ? `
            <tr style="background: #f8fafc;">
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Basic Fare</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500; font-family: 'Courier New', monospace;">AED ${receipt.basicFare.toLocaleString("en-AE", { minimumFractionDigits: 2 })}</td>
            </tr>
            ` : ""}
            ${receipt.sourceType === "other" && receipt.serviceName ? `
            <tr style="background: #f8fafc;">
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Service</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">${receipt.serviceName}</td>
            </tr>
            ` : ""}
            <tr style="background: ${receipt.sourceType === "flight" && receipt.pnr ? "#ffffff" : "#f8fafc"};">
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Payment Method</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">${getPaymentMethodLabel(receipt.paymentMethod)}</td>
            </tr>
            ${receipt.referenceNumber ? `
            <tr style="background: #f8fafc;">
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Reference</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500; font-family: 'Courier New', monospace;">${receipt.referenceNumber}</td>
            </tr>
            ` : ""}
            ${receipt.description ? `
            <tr style="background: #ffffff;">
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Note</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">${receipt.description}</td>
            </tr>
            ` : ""}
          </tbody>
        </table>

        <!-- Amount Section -->
        <div style="display: flex; justify-content: flex-end;">
          <div style="width: 360px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td colspan="2" style="padding: 0;"><div style="height: 2px; background: linear-gradient(to right, #1a5632, #22c55e); margin: 0 0 8px 0; border-radius: 1px;"></div></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 700; font-size: 16px; color: #1a5632;">Amount Received</td>
                <td style="padding: 8px 0; text-align: right; font-family: 'Courier New', monospace; font-size: 18px; font-weight: 800; color: #1a5632;">AED ${receipt.amount.toLocaleString("en-AE", { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
            <p style="text-align: right; font-size: 11px; color: #94a3b8; margin: 2px 0 0 0; font-style: italic;">${numberToWords(receipt.amount)}</p>
          </div>
        </div>

        <!-- Created By & Stamp/Signature -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 60px;">
          <div>
            ${receipt.createdByName ? `<p style="margin: 0; font-size: 12px; color: #64748b;">Created by: <strong style="color: #1e293b;">${receipt.createdByName}</strong></p>` : ""}
          </div>
          <div style="text-align: center;">
            <img src="${stampDataUrl}" alt="Company Stamp" style="height: 150px; margin-bottom: 8px;" />
            <div style="width: 200px; border-top: 1px solid #333; margin: 0 auto 4px auto;"></div>
            <p style="margin: 0; font-size: 12px; color: #666; font-style: italic;">Authorized Sign</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 50px; padding-top: 16px; border-top: 2px solid #e2e8f0;">
          <div style="text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #1a5632; font-weight: 600;">Thank you for choosing Middle Class Tourism</p>
          </div>
        </div>
      </div>
    `;
  };

  const receiptStyles = `
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; color: #1e293b; }
  `;

  const handlePrint = async (receipt: CashReceipt) => {
    const [logoDataUrl, stampDataUrl] = await Promise.all([toBase64(mcLogo), toBase64(stampImg)]);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Cash Receipt - ${receipt.receiptNumber}</title>
          <style>${receiptStyles}</style>
        </head>
        <body>${getReceiptHtml(receipt, logoDataUrl, stampDataUrl)}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const handleDownload = async (receipt: CashReceipt) => {
    const [logoDataUrl, stampDataUrl] = await Promise.all([toBase64(mcLogo), toBase64(stampImg)]);
    const container = document.createElement("div");
    container.innerHTML = `<style>${receiptStyles}</style>${getReceiptHtml(receipt, logoDataUrl, stampDataUrl)}`;
    document.body.appendChild(container);

    const options = {
      margin: 10,
      filename: `Receipt-${receipt.receiptNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(options).from(container).save().then(() => {
      document.body.removeChild(container);
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-bold" data-testid="text-page-title">Cash Receipts</h1>
        <div className="ml-auto">
          <Button onClick={() => setIsPinDialogOpen(true)} data-testid="button-create-receipt">
            <Plus className="w-4 h-4 mr-2" />
            New Receipt
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[hsl(var(--primary)/0.1)]">
                <Receipt className="w-4 h-4 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Receipts</p>
                <p className="text-xl font-bold" data-testid="text-total-receipts">{filteredReceipts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[hsl(var(--primary)/0.1)]">
                <Receipt className="w-4 h-4 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold font-mono text-[hsl(var(--primary))]" data-testid="text-total-amount">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5 pb-4 px-5">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search receipts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-receipts"
              />
            </div>
            {(() => {
              const names = new Set(receipts.map(r => r.createdByName).filter(Boolean));
              const options = Array.from(names).sort();
              return options.length > 0 ? (
                <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-created-by-filter">
                    <User className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Created By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {options.map(name => (
                      <SelectItem key={name} value={name}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: getNameColor(name) }} />
                          {name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null;
            })()}
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[180px]" data-testid="select-date-range">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRange === "custom" && (
            <div className="flex gap-3 mb-4">
              <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} data-testid="input-start-date" />
              <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} data-testid="input-end-date" />
            </div>
          )}

          {isLoadingReceipts ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-receipts">
              No receipts found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Received From</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id} data-testid={`row-receipt-${receipt.id}`}>
                      <TableCell className="font-mono font-medium" data-testid={`text-receipt-num-${receipt.id}`}>{receipt.receiptNumber}</TableCell>
                      <TableCell>{format(parseISO(receipt.createdAt), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{getPartyName(receipt)}</span>
                          <Badge variant="outline" className="w-fit mt-1">{receipt.partyType === "customer" ? "Customer" : receipt.partyType === "agent" ? "Agent" : "Vendor"}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{receipt.sourceType === "flight" ? "Flight" : "Other"}</span>
                          {receipt.sourceType === "flight" && receipt.sector && (
                            <span className="text-xs text-muted-foreground">{receipt.sector}</span>
                          )}
                          {receipt.sourceType === "flight" && receipt.pnr && (
                            <span className="text-xs font-mono text-muted-foreground">PNR: {receipt.pnr}</span>
                          )}
                          {receipt.sourceType === "other" && receipt.serviceName && (
                            <span className="text-xs text-muted-foreground">{receipt.serviceName}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getPaymentMethodLabel(receipt.paymentMethod)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-[hsl(var(--primary))]" data-testid={`text-amount-${receipt.id}`}>
                        {formatCurrency(receipt.amount)}
                      </TableCell>
                      <TableCell data-testid={`text-created-by-receipt-${receipt.id}`}>
                        {receipt.createdByName ? (
                          <Badge variant="outline" className="text-xs font-medium" style={{ backgroundColor: getNameColor(receipt.createdByName), color: '#fff', borderColor: 'transparent' }}>
                            {receipt.createdByName}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedReceipt(receipt)} data-testid={`button-view-receipt-${receipt.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(receipt)} data-testid={`button-download-receipt-${receipt.id}`}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReceipt} onOpenChange={(open) => { if (!open) setSelectedReceipt(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Receipt {selectedReceipt?.receiptNumber}</DialogTitle>
            <DialogDescription>View receipt details</DialogDescription>
          </DialogHeader>
          {selectedReceipt && (
            <div className="p-8">
              {/* Header: Logo left, CASH RECEIPT right */}
              <div className="flex justify-between items-start">
                <div className="flex-shrink-0">
                  <img src={mcLogo} alt="Middle Class Tourism" className="h-14" />
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold tracking-widest text-[#1a5632]" data-testid="text-receipt-company">CASH RECEIPT</h2>
                  <p className="text-sm text-muted-foreground mt-1" data-testid="text-receipt-number">{selectedReceipt.receiptNumber}</p>
                </div>
              </div>
              <div className="h-[3px] bg-gradient-to-r from-[#1a5632] via-green-500 to-[#1a5632] rounded-full mt-3 mb-5" />

              {/* Company Info & Date */}
              <div className="flex justify-between mb-6 gap-4 flex-wrap">
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <p>Phone: 025 640 224 | 050 222 1042</p>
                  <p>www.middleclass.ae | sales@middleclass.ae</p>
                  <p>Shop 41, Al Dhannah Traditional Souq, Al Dhannah City, Abu Dhabi {"\u2013"} UAE</p>
                </div>
                <div className="text-right text-sm">
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-muted-foreground text-xs font-medium">Date:</span>
                    <span className="font-semibold text-xs" data-testid="text-receipt-date">{format(parseISO(selectedReceipt.createdAt), "dd MMM yyyy, hh:mm a")}</span>
                  </div>
                </div>
              </div>

              {/* Received From */}
              <div className="bg-green-50 dark:bg-green-950/30 py-3 px-4 mb-6 rounded-r-md" style={{ borderLeft: "4px solid #1a5632" }}>
                <p className="text-[10px] font-bold text-[#1a5632] uppercase tracking-wider mb-1">Received From ({selectedReceipt.partyType})</p>
                <p className="text-base font-semibold" data-testid="text-receipt-party-name">{getPartyName(selectedReceipt)}</p>
              </div>

              {/* Details Table */}
              <div className="mb-5 overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1a5632] text-white">
                      <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wider">Detail</th>
                      <th className="text-right px-3 py-2 font-semibold text-xs uppercase tracking-wider">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-3 py-2 text-muted-foreground">Source</td>
                      <td className="px-3 py-2 text-right font-medium" data-testid="text-receipt-source-type">{selectedReceipt.sourceType === "flight" ? "Flight Details" : "Other Service"}</td>
                    </tr>
                    {selectedReceipt.sourceType === "flight" && selectedReceipt.sector && (
                      <tr className="border-b bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground">Sector</td>
                        <td className="px-3 py-2 text-right font-medium" data-testid="text-receipt-sector">{selectedReceipt.sector}</td>
                      </tr>
                    )}
                    {selectedReceipt.sourceType === "flight" && selectedReceipt.travelDate && (
                      <tr className="border-b">
                        <td className="px-3 py-2 text-muted-foreground">Travel Date</td>
                        <td className="px-3 py-2 text-right font-medium" data-testid="text-receipt-travel-date">{selectedReceipt.travelDate}</td>
                      </tr>
                    )}
                    {selectedReceipt.sourceType === "flight" && selectedReceipt.airlinesFlightNo && (
                      <tr className="border-b bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground">Flight No</td>
                        <td className="px-3 py-2 text-right font-medium" data-testid="text-receipt-airlines">{selectedReceipt.airlinesFlightNo}</td>
                      </tr>
                    )}
                    {selectedReceipt.sourceType === "flight" && selectedReceipt.pnr && (
                      <tr className="border-b">
                        <td className="px-3 py-2 text-muted-foreground">PNR</td>
                        <td className="px-3 py-2 text-right font-mono font-medium" data-testid="text-receipt-pnr">{selectedReceipt.pnr}</td>
                      </tr>
                    )}
                    {selectedReceipt.sourceType === "flight" && selectedReceipt.tktNo && (
                      <tr className="border-b bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground">TKT No</td>
                        <td className="px-3 py-2 text-right font-mono font-medium" data-testid="text-receipt-tkt-no">{selectedReceipt.tktNo}</td>
                      </tr>
                    )}
                    {selectedReceipt.sourceType === "flight" && (selectedReceipt.departureTime || selectedReceipt.arrivalTime) && (
                      <tr className="border-b">
                        <td className="px-3 py-2 text-muted-foreground">Departure / Arrival</td>
                        <td className="px-3 py-2 text-right font-medium" data-testid="text-receipt-times">{selectedReceipt.departureTime || "--"} / {selectedReceipt.arrivalTime || "--"}</td>
                      </tr>
                    )}
                    {selectedReceipt.sourceType === "flight" && selectedReceipt.basicFare ? (
                      <tr className="border-b bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground">Basic Fare</td>
                        <td className="px-3 py-2 text-right font-mono font-medium" data-testid="text-receipt-basic-fare">{formatCurrency(selectedReceipt.basicFare)}</td>
                      </tr>
                    ) : null}
                    {selectedReceipt.sourceType === "other" && selectedReceipt.serviceName && (
                      <tr className="border-b bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground">Service</td>
                        <td className="px-3 py-2 text-right font-medium" data-testid="text-receipt-service-name">{selectedReceipt.serviceName}</td>
                      </tr>
                    )}
                    <tr className="border-b">
                      <td className="px-3 py-2 text-muted-foreground">Payment Method</td>
                      <td className="px-3 py-2 text-right font-medium" data-testid="text-receipt-payment-method">{getPaymentMethodLabel(selectedReceipt.paymentMethod)}</td>
                    </tr>
                    {selectedReceipt.referenceNumber && (
                      <tr className="border-b bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground">Reference</td>
                        <td className="px-3 py-2 text-right font-mono font-medium">{selectedReceipt.referenceNumber}</td>
                      </tr>
                    )}
                    {selectedReceipt.description && (
                      <tr className="border-b">
                        <td className="px-3 py-2 text-muted-foreground">Note</td>
                        <td className="px-3 py-2 text-right font-medium" data-testid="text-receipt-description">{selectedReceipt.description}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Amount */}
              <div className="flex justify-end mb-4">
                <div className="w-80">
                  <div className="h-[2px] bg-gradient-to-r from-[#1a5632] to-green-400 rounded mb-2" />
                  <div className="flex justify-between py-2">
                    <span className="font-bold text-base text-[#1a5632]">Amount Received</span>
                    <span className="font-mono font-extrabold text-lg text-[#1a5632]" data-testid="text-receipt-amount">{formatCurrency(selectedReceipt.amount)}</span>
                  </div>
                  <p className="text-right text-[11px] text-muted-foreground italic">{numberToWords(selectedReceipt.amount)}</p>
                </div>
              </div>

              {/* Stamp & Signature */}
              <div className="mt-12 flex justify-end">
                <div className="text-center">
                  <img src={stampImg} alt="Company Stamp" className="h-36 mx-auto mb-2" />
                  <div className="w-48 border-t border-foreground mb-1 mx-auto" />
                  <p className="text-xs text-muted-foreground italic">Authorized Sign</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-10 pt-4 border-t-2 text-center">
                <p className="text-sm text-[#1a5632] font-semibold">Thank you for choosing Middle Class Tourism</p>
              </div>

              <div className="flex items-center gap-2 pt-4 mt-4 border-t">
                <Button onClick={() => handlePrint(selectedReceipt)} data-testid="button-print-receipt">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" onClick={() => handleDownload(selectedReceipt)} data-testid="button-download-receipt">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Cash Receipt</DialogTitle>
            <DialogDescription>Record a payment received from a customer, agent, or vendor.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="partyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Received From</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue("partyId", "");
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-party-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="partyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{selectedPartyType === "customer" ? "Customer" : selectedPartyType === "agent" ? "Agent" : "Vendor"}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-party">
                          <SelectValue placeholder={`Select ${selectedPartyType}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {partyOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Source</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        if (v === "flight") {
                          form.setValue("serviceName", "");
                        } else {
                          form.setValue("pnr", "");
                          form.setValue("sector", "");
                          form.setValue("travelDate", "");
                          form.setValue("airlinesFlightNo", "");
                          form.setValue("tktNo", "");
                          form.setValue("departureTime", "");
                          form.setValue("arrivalTime", "");
                          form.setValue("basicFare", 0);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-source-type">
                          <SelectValue placeholder="Select source type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="flight">Flight Details</SelectItem>
                        <SelectItem value="other">Any Other Service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedSourceType === "flight" && (
                <div className="border border-dashed rounded-md p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Flight Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="sector"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sector *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. DXB-LHR" data-testid="input-sector" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="travelDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Travel Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-travel-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="airlinesFlightNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flight No</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. EK202" data-testid="input-airlines-flight-no" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pnr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PNR</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="PNR" data-testid="input-pnr" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tktNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>TKT No</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ticket No" data-testid="input-tkt-no" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="departureTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departure Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-departure-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="arrivalTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arrival Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-arrival-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="basicFare"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Basic Fare</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" {...field} data-testid="input-basic-fare" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (AED) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0.01" {...field} data-testid="input-flight-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {selectedSourceType === "other" && (
                <FormField
                  control={form.control}
                  name="serviceName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter service name" data-testid="input-service-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedSourceType !== "flight" && (
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (AED)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0.01" {...field} data-testid="input-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Add a note..." className="resize-none" data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-receipt">
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Receipt className="w-4 h-4 mr-2" />
                )}
                Create Receipt
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <PinDialog
        open={isPinDialogOpen}
        onOpenChange={setIsPinDialogOpen}
        onVerified={(result) => {
          setPinVerifiedUser(result);
          setIsCreateOpen(true);
        }}
        title="Enter PIN to Create Receipt"
        description="Enter your PIN code to create a new receipt. Your name will be recorded on this entry."
      />
    </div>
  );
}
