import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Invoice, Customer, Agent, Vendor } from "@shared/schema";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
};

export default function PrintInvoicePage() {
  const params = useParams();
  const invoiceId = params.id;

  const { data: invoice, isLoading: invoiceLoading } = useQuery<Invoice>({
    queryKey: ["/api/invoices", invoiceId],
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

  if (invoiceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Invoice not found</p>
      </div>
    );
  }

  const customer = invoice.customerType === "customer"
    ? customers.find((c) => c.id === invoice.customerId)
    : agents.find((a) => a.id === invoice.customerId);

  const vendor = vendors.find((v) => v.id === invoice.vendorId);
  const items = (invoice.items as { description: string; quantity: number; unitPrice: number }[]) || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden fixed top-4 right-4 z-50">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          Print Invoice
        </Button>
      </div>

      <div className="max-w-3xl mx-auto p-8 print:p-4">
        <div className="border border-gray-300 rounded-lg p-8 print:border-0 print:p-0">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Middle Class Tourism</h1>
              <p className="text-gray-600 mt-1">Travel & Tourism Services</p>
              <p className="text-gray-500 text-sm mt-2">Abu Dhabi, UAE</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold text-gray-900">INVOICE</h2>
              <p className="text-gray-600 font-mono mt-1">#{invoice.invoiceNumber}</p>
              <p className="text-gray-500 text-sm mt-2">
                Date: {invoice.createdAt ? format(new Date(invoice.createdAt), "MMM d, yyyy") : "N/A"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 pb-6 border-b border-gray-200">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
              <p className="font-medium text-gray-900">{customer?.name || "Walk-in Customer"}</p>
              {customer && "phone" in customer && customer.phone && (
                <p className="text-gray-600 text-sm">{customer.phone}</p>
              )}
              {customer && "email" in customer && customer.email && (
                <p className="text-gray-600 text-sm">{customer.email}</p>
              )}
              {customer && "address" in customer && customer.address && (
                <p className="text-gray-600 text-sm">{customer.address}</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Vendor</h3>
              <p className="font-medium text-gray-900">{vendor?.name || "Direct Airline"}</p>
              {vendor?.phone && <p className="text-gray-600 text-sm">{vendor.phone}</p>}
              {vendor?.email && <p className="text-gray-600 text-sm">{vendor.email}</p>}
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-sm font-semibold text-gray-500 uppercase">Description</th>
                <th className="text-center py-3 text-sm font-semibold text-gray-500 uppercase w-20">Qty</th>
                <th className="text-right py-3 text-sm font-semibold text-gray-500 uppercase w-32">Unit Price</th>
                <th className="text-right py-3 text-sm font-semibold text-gray-500 uppercase w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 text-gray-900">{item.description}</td>
                  <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                  <td className="py-3 text-right text-gray-600 font-mono">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 text-right text-gray-900 font-mono font-medium">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-72">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-mono">{formatCurrency(invoice.subtotal || 0)}</span>
              </div>
              {(invoice.discountPercent || 0) > 0 && (
                <div className="flex justify-between py-2 text-green-600">
                  <span>Discount ({invoice.discountPercent}%)</span>
                  <span className="font-mono">-{formatCurrency(invoice.discountAmount || 0)}</span>
                </div>
              )}
              {(invoice.depositUsed || 0) > 0 && (
                <div className="flex justify-between py-2 text-blue-600">
                  <span>Deposit Applied</span>
                  <span className="font-mono">-{formatCurrency(invoice.depositUsed || 0)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t border-gray-200 mt-2">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-lg font-bold font-mono text-primary">
                  {formatCurrency(invoice.total || 0)}
                </span>
              </div>
              {(invoice.paidAmount || 0) > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="font-mono text-green-600">{formatCurrency(invoice.paidAmount || 0)}</span>
                </div>
              )}
              {((invoice.total || 0) - (invoice.paidAmount || 0) - (invoice.depositUsed || 0)) > 0 && (
                <div className="flex justify-between py-2 border-t border-gray-200">
                  <span className="font-medium">Balance Due</span>
                  <span className="font-mono font-semibold text-red-600">
                    {formatCurrency((invoice.total || 0) - (invoice.paidAmount || 0) - (invoice.depositUsed || 0))}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-500 text-sm">
              Thank you for your business!
            </p>
            {invoice.notes && (
              <p className="text-center text-gray-400 text-xs mt-2">
                Note: {invoice.notes}
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:p-4 {
            padding: 1rem !important;
          }
          .print\\:border-0 {
            border: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
