import { forwardRef } from "react";
import type { Invoice, Customer, Agent, Vendor } from "@shared/schema";
import companyLogo from "@assets/Updated_Logo_1769092146053.png";

interface PrintableInvoiceProps {
  invoice: Invoice;
  customer?: Customer;
  agent?: Agent;
  vendor?: Vendor;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-AE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const scales = ["", "Thousand", "Million", "Billion"];

  const convertHundreds = (n: number): string => {
    let result = "";
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      result += ones[n] + " ";
    }
    return result;
  };

  let result = "";
  let scaleIndex = 0;
  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);
  
  let remaining = intPart;
  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      result = convertHundreds(chunk) + scales[scaleIndex] + " " + result;
    }
    remaining = Math.floor(remaining / 1000);
    scaleIndex++;
  }

  result = result.trim() || "Zero";
  if (decPart > 0) {
    result += " and " + convertHundreds(decPart).trim() + " Fils";
  } else {
    result += " Dirhams Only";
  }
  
  return result;
}

export const PrintableInvoice = forwardRef<HTMLDivElement, PrintableInvoiceProps>(
  ({ invoice, customer, agent, vendor }, ref) => {
    const party = customer || agent;
    const partyType = invoice.customerType === "agent" ? "Agent" : "Customer";
    
    return (
      <div ref={ref} className="printable-invoice bg-white text-black p-8 max-w-[210mm] mx-auto" style={{ fontFamily: "Arial, sans-serif" }}>
        <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-4">
          <div>
            <img src={companyLogo} alt="Middle Class Tourism" className="h-16 mb-2" />
            <p className="text-sm text-gray-600">Travel & Tourism Services</p>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold text-gray-800">INVOICE</h1>
            <p className="text-lg font-semibold mt-1">{invoice.invoiceNumber}</p>
            <p className="text-sm text-gray-600">Date: {formatDate(invoice.createdAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-gray-700 mb-2 uppercase text-sm">Bill To ({partyType}):</h3>
            <div className="text-sm">
              <p className="font-semibold text-lg">{party?.name || "N/A"}</p>
              {party?.company && <p>{party.company}</p>}
              {party?.address && <p>{party.address}</p>}
              {party?.phone && <p>Phone: {party.phone}</p>}
              {party?.email && <p>Email: {party.email}</p>}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-700 mb-2 uppercase text-sm">Vendor/Supplier:</h3>
            <div className="text-sm">
              <p className="font-semibold text-lg">{vendor?.name || "N/A"}</p>
              {vendor?.phone && <p>Phone: {vendor.phone}</p>}
              {vendor?.email && <p>Email: {vendor.email}</p>}
            </div>
          </div>
        </div>

        <table className="w-full mb-6 border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-gray-800 p-2 text-left">#</th>
              <th className="border border-gray-800 p-2 text-left">Description</th>
              <th className="border border-gray-800 p-2 text-center">Qty</th>
              <th className="border border-gray-800 p-2 text-right">Unit Price</th>
              <th className="border border-gray-800 p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <td className="border border-gray-300 p-2">{idx + 1}</td>
                <td className="border border-gray-300 p-2">{item.description}</td>
                <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                <td className="border border-gray-300 p-2 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                <td className="border border-gray-300 p-2 text-right font-mono">{formatCurrency(item.quantity * item.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="w-80">
            <div className="flex justify-between py-1 border-b">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between py-1 border-b text-green-700">
                <span>Discount ({invoice.discountPercent}%):</span>
                <span className="font-mono">-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            {invoice.depositUsed > 0 && (
              <div className="flex justify-between py-1 border-b text-blue-700">
                <span>Deposit Applied:</span>
                <span className="font-mono">-{formatCurrency(invoice.depositUsed)}</span>
              </div>
            )}
            {invoice.agentCreditUsed > 0 && (
              <div className="flex justify-between py-1 border-b text-purple-700">
                <span>Agent Credit Applied:</span>
                <span className="font-mono">-{formatCurrency(invoice.agentCreditUsed)}</span>
              </div>
            )}
            {invoice.vendorBalanceDeducted > 0 && (
              <div className="flex justify-between py-1 border-b text-orange-700">
                <span>Vendor {invoice.useVendorBalance === "credit" ? "Credit" : "Deposit"} Applied:</span>
                <span className="font-mono">-{formatCurrency(invoice.vendorBalanceDeducted)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b-2 border-gray-800 text-lg font-bold">
              <span>Total Due:</span>
              <span className="font-mono">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between py-2 border-b-2 border-gray-800 text-lg font-bold bg-gray-100">
              <span>Grand Total:</span>
              <span className="font-mono">{formatCurrency(invoice.subtotal - invoice.discountAmount)}</span>
            </div>
          </div>
        </div>

        <div className="mb-6 p-3 bg-gray-100 border border-gray-300 rounded">
          <p className="text-sm">
            <span className="font-semibold">Amount in Words: </span>
            {numberToWords(invoice.subtotal - invoice.discountAmount)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-gray-700 mb-2 text-sm">Payment Method:</h3>
            <p className="capitalize">{invoice.paymentMethod}</p>
          </div>
          <div>
            <h3 className="font-bold text-gray-700 mb-2 text-sm">Status:</h3>
            <p className="capitalize font-semibold">{invoice.status}</p>
          </div>
        </div>

        {invoice.notes && (
          <div className="mb-6">
            <h3 className="font-bold text-gray-700 mb-2 text-sm">Notes:</h3>
            <p className="text-sm text-gray-600">{invoice.notes}</p>
          </div>
        )}

        <div className="border-t-2 border-gray-800 pt-4 mt-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="border-t border-gray-400 mt-16 pt-2">
                <p className="text-sm text-center">Authorized Signature</p>
              </div>
            </div>
            <div>
              <div className="border-t border-gray-400 mt-16 pt-2">
                <p className="text-sm text-center">Customer Signature</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Thank you for your business!</p>
          <p>Middle Class Tourism - Your Travel Partner</p>
        </div>
      </div>
    );
  }
);

PrintableInvoice.displayName = "PrintableInvoice";
