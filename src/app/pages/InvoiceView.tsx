import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  Download,
  Edit,
  Trash2,
  ArrowLeft,
  DollarSign,
  Share2,
  Mail,
  MessageCircle,
  Smartphone,
} from "lucide-react";
import {
  getInvoice,
  deleteInvoice,
  getBusiness,
  saveInvoice,
  savePayment,
  Invoice,
} from "../lib/store";

// Extend Business type for all custom fields
type Business = ReturnType<typeof getBusiness> & {
  pan?: string;
  website?: string;
  onlineStore?: string;
  subCompany?: string;
  bankName?: string;
  ifsc?: string;
  accountNo?: string;
  bankBranch?: string;
  upiId?: string;
  upiNo?: string;
  upiQrUrl?: string;
};

import { formatCurrency, formatDate } from "../lib/utils";
import { convertNumberToWords } from "../lib/numberToWords";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";

const sanitizePdfFileName = (value: string) =>
  value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").trim() || "invoice";

const formatPdfCurrency = (amount: number) => {
  const absoluteAmount = Math.abs(amount);
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absoluteAmount);

  return `${amount < 0 ? "-" : ""}Rs. ${formattedAmount}`;
};

export function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoicePrintRef = useRef<HTMLDivElement | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  // For split payments
  const [paymentRows, setPaymentRows] = useState([
    { method: "cash", amount: "" },
  ]);

  useEffect(() => {
    if (!id) {
      setInvoice(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      const [fetchedInvoice, fetchedBusiness] = await Promise.all([
        getInvoice(id),
        getBusiness(),
      ]);

      if (cancelled) {
        return;
      }

      setInvoice(fetchedInvoice || null);
      setBusiness(fetchedBusiness);
      setIsLoading(false);
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (isLoading) return;
    if (id && invoice === null) {
      navigate("/invoices");
    }
  }, [isLoading, invoice, navigate, id]);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      await deleteInvoice(invoice.id);
      toast.success("Invoice deleted successfully");
      navigate("/invoices");
    }
  };

  const handlePayment = async () => {
    const remainingAmount = invoice.total - invoice.paidAmount;
    let totalEntered = 0;
    const breakdown = [];
    for (const row of paymentRows) {
      const amt = parseFloat(row.amount);
      if (!row.method || isNaN(amt) || amt <= 0) {
        toast.error("Please enter valid payment details");
        return;
      }
      breakdown.push({ method: row.method, amount: amt });
      totalEntered += amt;
    }
    const EPSILON = 0.01;
    if (totalEntered - remainingAmount > EPSILON) {
      toast.error("Total payment cannot exceed remaining amount");
      return;
    }
    const newPaidAmount =
      Math.round((invoice.paidAmount + totalEntered) * 100) / 100;
    const totalRounded = Math.round(invoice.total * 100) / 100;
    let newStatus: "paid" | "unpaid" | "partial" = "partial";
    if (newPaidAmount === totalRounded) {
      newStatus = "paid";
    } else if (newPaidAmount === 0) {
      newStatus = "unpaid";
    } else if (newPaidAmount > 0 && newPaidAmount < totalRounded) {
      newStatus = "partial";
    }
    const updatedInvoice = {
      ...invoice,
      paidAmount: newPaidAmount,
      status: newStatus,
      paymentBreakdown: [...(invoice.paymentBreakdown || []), ...breakdown],
    };
    // Save each payment method as a Payment object for analysis
    await Promise.all(
      breakdown.map((row) =>
        savePayment({
          id: `${invoice.id}-${Date.now()}-${row.method}-${Math.random()}`,
          invoiceId: invoice.id,
          amount: row.amount,
          date: new Date().toISOString(),
          method: row.method,
        }),
      ),
    );
    await saveInvoice(updatedInvoice);
    setInvoice(updatedInvoice);
    setShowPaymentDialog(false);
    setPaymentRows([{ method: "cash", amount: "" }]);
    toast.success("Payment recorded successfully");
  };

  const generateInvoicePdf = async () => {
    if (!invoice || !business) {
      throw new Error("Invoice details are not ready yet");
    }

    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    let cursorY = 14;
    const businessLines = [
      business.name,
      business.pan ? `PAN: ${business.pan}` : "",
      [business.phone, business.email].filter(Boolean).join(" | "),
      [business.address, business.city, business.state]
        .filter(Boolean)
        .join(", "),
      business.website ? `Website: ${business.website}` : "",
      business.onlineStore ? `Store: ${business.onlineStore}` : "",
      business.subCompany ? `Sub Company: ${business.subCompany}` : "",
    ].filter(Boolean);

    const addLabelValue = (label: string, value: string, x: number, y: number) => {
      pdf.setFont("helvetica", "bold");
      pdf.text(label, x, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(value || "-", x + 26, y);
    };

    const ensureSpace = (requiredHeight: number) => {
      if (cursorY + requiredHeight <= pageHeight - margin) {
        return;
      }

      pdf.addPage();
      cursorY = 14;
    };

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text(business.name || "Business", margin, cursorY);
    pdf.setFontSize(18);
    pdf.text("TAX INVOICE", pageWidth - margin, cursorY, { align: "right" });
    cursorY += 7;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    businessLines.slice(1).forEach((line) => {
      pdf.text(line, margin, cursorY);
      cursorY += 4.5;
    });
    cursorY += 2;

    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 8;

    addLabelValue("Invoice No.", invoice.invoiceNumber, margin, cursorY);
    addLabelValue("Invoice Date", formatDate(invoice.date), margin + 70, cursorY);
    addLabelValue(
      "Due Date",
      invoice.dueDate ? formatDate(invoice.dueDate) : "N/A",
      margin + 132,
      cursorY,
    );
    cursorY += 10;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("Bill To", margin, cursorY);
    pdf.text(`Status: ${invoice.status.toUpperCase()}`, pageWidth - margin, cursorY, {
      align: "right",
    });
    cursorY += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    [
      invoice.customerName,
      invoice.customerAddress || "Address not provided",
      `Mobile ${invoice.customerPhone}`,
      invoice.customerGSTIN ? `GSTIN ${invoice.customerGSTIN}` : "",
    ]
      .filter(Boolean)
      .forEach((line) => {
        pdf.text(line, margin, cursorY);
        cursorY += 5;
      });
    cursorY += 2;

    autoTable(pdf, {
      startY: cursorY,
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      bodyStyles: { textColor: [31, 41, 55] },
      head: [[
        "No",
        "Items",
        "HSN No.",
        "Qty.",
        "MRP",
        "Rate",
        "Tax",
        "Total",
      ]],
      body: invoice.items.map((item, index) => {
        const gstValue = (item.amount * item.gstRate) / 100;
        return [
          String(index + 1),
          item.productName,
          String((item as { hsn?: string }).hsn || "9023000"),
          String(item.quantity),
          formatPdfCurrency(item.price),
          formatPdfCurrency(item.price),
          formatPdfCurrency(gstValue),
          formatPdfCurrency(item.amount),
        ];
      }),
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 48 },
        2: { cellWidth: 24 },
        3: { cellWidth: 14, halign: "right" },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: 22, halign: "right" },
        6: { cellWidth: 20, halign: "right" },
        7: { cellWidth: 24, halign: "right" },
      },
    });

    cursorY = (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
      ? ((pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? cursorY) + 8
      : cursorY + 8;

    ensureSpace(58);

    const summaryX = pageWidth - margin - 64;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("Summary", summaryX, cursorY);
    cursorY += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    [
      ["Taxable Amount", formatPdfCurrency(invoice.subtotal)],
      ["CGST", formatPdfCurrency(invoice.cgst)],
      ["SGST", formatPdfCurrency(invoice.sgst)],
      ...(invoice.igst > 0 ? [["IGST", formatPdfCurrency(invoice.igst)]] : []),
      ["Total Amount", formatPdfCurrency(invoice.total)],
      ["Received Amount", formatPdfCurrency(invoice.paidAmount)],
      ["Current Balance", formatPdfCurrency(invoice.total - invoice.paidAmount)],
    ].forEach(([label, value]) => {
      pdf.text(label, summaryX, cursorY);
      pdf.text(value, pageWidth - margin, cursorY, { align: "right" });
      cursorY += 5;
    });

    cursorY += 2;
    const notesStartY = cursorY - 41;
    pdf.setFont("helvetica", "bold");
    pdf.text("Terms & Conditions", margin, notesStartY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const terms = [
      "Payment is due at the time of purchase; no credit offered.",
      "Goods cannot be returned or exchanged unless defective.",
      "All products are subject to availability, and prices may change without prior notice.",
      "The customer is responsible for checking product quality before purchase.",
      "Taxes applicable as per government regulations will be added to the final bill.",
    ];
    let termsY = notesStartY + 6;
    terms.forEach((term) => {
      const wrapped = pdf.splitTextToSize(`- ${term}`, contentWidth - 76);
      pdf.text(wrapped, margin, termsY);
      termsY += wrapped.length * 4.2;
    });

    ensureSpace(28);
    pdf.setFont("helvetica", "bold");
    pdf.text("Amount in words", margin, cursorY);
    pdf.setFont("helvetica", "normal");
    const amountInWords = pdf.splitTextToSize(
      convertNumberToWords(invoice.total),
      contentWidth,
    );
    pdf.text(amountInWords, margin, cursorY + 5);
    cursorY += 11 + amountInWords.length * 4.2;

    ensureSpace(22);
    pdf.setFont("helvetica", "bold");
    pdf.text("Bank Details", margin, cursorY);
    pdf.setFont("helvetica", "normal");
    [
      `Name: ${business.bankName || "rohit"}`,
      `IFSC: ${business.ifsc || "sbin0001703"}`,
      `Account No: ${business.accountNo || "3425322435376423"}`,
      `Bank Branch: ${business.bankBranch || "State Bank of India, NARAINA"}`,
      `UPI: ${business.upiId || "ronitsoni506-1@oksbi"}`,
    ].forEach((line, index) => {
      pdf.text(line, margin, cursorY + 5 + index * 4.5);
    });

    pdf.setFont("helvetica", "bold");
    pdf.text(business.name || "Authorized Signature", pageWidth - margin, cursorY + 18, {
      align: "right",
    });

    return {
      pdf,
      blob: pdf.output("blob"),
      fileName: `${sanitizePdfFileName(invoice.invoiceNumber)}.pdf`,
    };
  };

  if (isLoading)
    return <div className="p-6 text-gray-500">Loading invoice...</div>;
  if (!invoice || !business) return null;

  const sharePdfFile = async () => {
    const { blob, fileName } = await generateInvoicePdf();
    return new File([blob], fileName, { type: "application/pdf" });
  };

  const downloadPDF = async () => {
    try {
      const { blob, fileName, pdf } = await generateInvoicePdf();

      if (typeof pdf.save === "function") {
        pdf.save(fileName);
        toast.success("Invoice downloaded successfully");
        return;
      }

      const fileUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error("Failed to generate invoice PDF:", error);
      toast.error("Unable to download invoice PDF");
    }
  };

  const remainingAmount = invoice.total - invoice.paidAmount;
  const shareMessage = `Invoice ${invoice.invoiceNumber} for ${invoice.customerName} - Total ${formatCurrency(invoice.total)}${invoice.dueDate ? `, due ${formatDate(invoice.dueDate)}` : ""}.`;

  const handleNativeShare = async () => {
    if (!navigator.share) {
      toast.error("Sharing is not supported on this device");
      return;
    }

    setIsSharing(true);

    try {
      const pdfFile = await sharePdfFile();

      if (navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({
          title: invoice.invoiceNumber,
          text: shareMessage,
          files: [pdfFile],
        });
      } else {
        await navigator.share({
          title: invoice.invoiceNumber,
          text: shareMessage,
        });
      }

      setShowShareDialog(false);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      console.error("Failed to share invoice:", error);
      toast.error("Unable to share invoice");
    } finally {
      setIsSharing(false);
    }
  };

  const handleEmailShare = async () => {
    if (navigator.share) {
      setIsSharing(true);

      try {
        const pdfFile = await sharePdfFile();

        if (navigator.canShare?.({ files: [pdfFile] })) {
          await navigator.share({
            title: `Invoice ${invoice.invoiceNumber}`,
            text: shareMessage,
            files: [pdfFile],
          });
          setShowShareDialog(false);
          return;
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Failed to share invoice by email:", error);
      } finally {
        setIsSharing(false);
      }
    }

    try {
      await downloadPDF();
      const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber}`);
      const body = encodeURIComponent(
        `${shareMessage}\n\nThe invoice PDF has been downloaded. Please attach it to this email before sending.`,
      );
      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
      setShowShareDialog(false);
      toast.info("PDF downloaded. Attach it to the email before sending.");
    } catch (error) {
      console.error("Failed to prepare email share:", error);
      toast.error("Unable to open email share");
    }
  };

  const handleWhatsAppShare = async () => {
    if (navigator.share) {
      setIsSharing(true);

      try {
        const pdfFile = await sharePdfFile();

        if (navigator.canShare?.({ files: [pdfFile] })) {
          await navigator.share({
            title: `Invoice ${invoice.invoiceNumber}`,
            text: shareMessage,
            files: [pdfFile],
          });
          setShowShareDialog(false);
          return;
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Failed to share invoice on WhatsApp:", error);
      } finally {
        setIsSharing(false);
      }
    }

    try {
      await downloadPDF();
      const message = encodeURIComponent(
        `${shareMessage}\n\nThe invoice PDF has been downloaded. Please attach it in WhatsApp before sending.`,
      );
      window.open(
        `https://wa.me/?text=${message}`,
        "_blank",
        "noopener,noreferrer",
      );
      setShowShareDialog(false);
      toast.info("PDF downloaded. Attach it in WhatsApp before sending.");
    } catch (error) {
      console.error("Failed to prepare WhatsApp share:", error);
      toast.error("Unable to open WhatsApp share");
    }
  };

  const renderInvoiceLayout = (mode: "screen" | "pdf") => {
    const isPdfMode = mode === "pdf";
    const wrapperClassName = isPdfMode
      ? "w-[794px] max-w-none bg-white p-8 text-black"
      : "surface-panel overflow-hidden p-4 sm:p-6 lg:p-8";

    return (
      <div className={wrapperClassName}>
        <div className="grid grid-cols-1 gap-4 border-b border-gray-200 pb-4 mb-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <p className="text-3xl font-extrabold tracking-tight sm:text-4xl break-words">
              {business.name}
            </p>
            <p className="text-sm font-semibold text-gray-500 mt-1">
              Pan No: {business.pan || ""}
            </p>
            <p className="text-sm mt-1">
              {business.phone} | {business.email || ""}
            </p>
            <p className="text-sm mt-1">
              {business.address}, {business.city}, {business.state}
            </p>
            <p className="text-sm mt-1">website: {business.website || ""}</p>
            <p className="text-sm mt-1">
              online store: {business.onlineStore || ""}
            </p>
            <p className="text-sm mt-1">
              Sub Company: {business.subCompany || "Annpurna Catering"}
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-2xl font-extrabold">TAX INVOICE</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 text-sm mb-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="border p-3 rounded text-left">
            <p className="font-semibold">Invoice No.</p>
            <p>{invoice.invoiceNumber}</p>
          </div>
          <div className="border p-3 rounded text-left">
            <p className="font-semibold">Invoice Date</p>
            <p>{formatDate(invoice.date)}</p>
          </div>
          <div className="border p-3 rounded text-left">
            <p className="font-semibold">Due Date</p>
            <p>{invoice.dueDate ? formatDate(invoice.dueDate) : "N/A"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Bill To
            </h3>
            <p className="text-xl font-bold">{invoice.customerName}</p>
            <p className="text-sm">
              {invoice.customerAddress || "Address not provided"}
            </p>
            <p className="text-sm">Mobile {invoice.customerPhone}</p>
            {invoice.customerGSTIN && (
              <p className="text-sm font-semibold">
                GSTIN {invoice.customerGSTIN}
              </p>
            )}
          </div>
          <div className="text-left md:text-right flex items-start justify-start md:justify-end">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                invoice.status === "paid"
                  ? "bg-green-100 text-green-800"
                  : invoice.status === "unpaid"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {invoice.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto   border border-page-hero  mb-4">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="page-hero text-white-700">
              <tr>
                <th className="px-3 py-2 text-left">No</th>
                <th className="px-3 py-2 text-left">Items</th>
                <th className="px-3 py-2 text-left">HSN No.</th>
                <th className="px-3 py-2 text-right">Qty.</th>
                <th className="px-3 py-2 text-right">MRP</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Tax</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {invoice.items.map((item, index) => {
                const gstValue = (item.amount * item.gstRate) / 100;
                return (
                  <tr key={index}>
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">{item.productName}</td>
                    <td className="px-3 py-2">
                      {(item as any).hsn || "9023000"}
                    </td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(gstValue)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="page-hero text-sm font-bold px-3 py-2 rounded mb-6 flex justify-between">
          <span>SUBTOTAL</span>
          <span>{formatCurrency(invoice.total)}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3 border border-gray-200 p-4 rounded">
            <h4 className="font-semibold">Terms & Conditions</h4>
            <ul className=" text-base text-gray-600 list-disc list-inside space-y-1">
              <li>
                Payment is due at the time of purchase; no credit offered.
              </li>
              <li>Goods cannot be returned or exchanged unless defective.</li>
              <li>
                All products are subject to availability, and prices may change
                without prior notice.
              </li>
              <li>
                The customer is responsible for checking product quality before
                purchase.
              </li>
              <li>
                Taxes applicable as per government regulations will be added to
                the final bill.
              </li>
            </ul>
          </div>
          <div className="border border-gray-200 p-4 rounded">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Taxable Amount</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST</span>
                <span>{formatCurrency(invoice.cgst)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST</span>
                <span>{formatCurrency(invoice.sgst)}</span>
              </div>
              {invoice.igst > 0 && (
                <div className="flex justify-between">
                  <span>IGST</span>
                  <span>{formatCurrency(invoice.igst)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 mt-2 pt-2 font-bold flex justify-between">
                <span>Total Amount</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Received Amount</span>
                <span>{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Previous Balance</span>
                <span>{formatCurrency(0)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Current Balance</span>
                <span>{formatCurrency(remainingAmount)}</span>
              </div>
              <div className="pt-2 text-xs">
                <span className="font-bold">Total Amount (in words)</span>
                <p>{convertNumberToWords(invoice.total)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 items-center md:grid-cols-3">
          <div className="min-h-24 border border-gray-200 rounded flex items-center justify-center p-3">
            <div className="space-y-1  ">
              <p className="text-xs font-semibold">Bank Details</p>
              <p className="text-xs">Name: {business.bankName || "rohit"}</p>
              <p className="text-xs">IFSC: {business.ifsc || "sbin0001703"}</p>
              <p className="text-xs">
                Account No: {business.accountNo || "3425322435376423"}
              </p>
              <p className="text-xs">
                Bank Name:{" "}
                {business.bankBranch || "State Bank of India, NARAINA"}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center">
            {business.upiQrUrl && (
              <img
                src={business.upiQrUrl}
                alt="UPI QR Code"
                className="mb-2 h-32 w-32 object-contain border rounded shadow"
                style={{ background: "#fff" }}
              />
            )}
            <p className="text-xs font-semibold justify-content">Pay Via UPI</p>
            <p className="text-xs">
              {business.upiId || "ronitsoni506-1@oksbi"}
            </p>
            <p className="text-xs">{business.upiNo || "8955219443"}</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-xs">Signature</p>
            <p className="font-bold">{business.name}</p>
          </div>
        </div>
        <h5 className="text-center p-5">
          This is computer generated invoice signature not needed
        </h5>
      </div>
    );
  };

  return (
    <div className="page-shell mx-auto max-w-5xl">
      <div className="page-hero">
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="page-kicker">Invoice preview</div>
            <h1 className="page-title">{invoice.invoiceNumber}</h1>
            <p className="page-subtitle">
              Review the document, record payments, share it, or export the
              finished PDF.
            </p>
          </div>
          <div className="soft-badge bg-white/15 text-white">
            {invoice.status.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          onClick={() => navigate("/invoices")}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {invoice.status !== "paid" && (
            <Button
              onClick={() => setShowPaymentDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowShareDialog(true)}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button onClick={downloadPDF} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Link to={`/invoices/${invoice.id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            onClick={handleDelete}
            variant="outline"
            className="text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div ref={invoicePrintRef}>{renderInvoiceLayout("screen")}</div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">
                Total Amount: {formatCurrency(invoice.total)}
              </p>
              <p className="text-sm text-gray-600">
                Paid: {formatCurrency(invoice.paidAmount)}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                Remaining: {formatCurrency(remainingAmount)}
              </p>
            </div>
            <div>
              <Label>Payment Breakdown</Label>
              {paymentRows.map((row, idx) => (
                <div key={idx} className="flex flex-col gap-2 mb-2 sm:flex-row">
                  <select
                    value={row.method}
                    onChange={(e) => {
                      const updated = [...paymentRows];
                      updated[idx].method = e.target.value;
                      setPaymentRows(updated);
                    }}
                    className="border rounded px-2 py-1"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.amount}
                    onChange={(e) => {
                      const updated = [...paymentRows];
                      updated[idx].amount = e.target.value;
                      setPaymentRows(updated);
                    }}
                    placeholder="Amount"
                  />
                  {paymentRows.length > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPaymentRows(paymentRows.filter((_, i) => i !== idx));
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  setPaymentRows([
                    ...paymentRows,
                    { method: "cash", amount: "" },
                  ])
                }
              >
                Add Method
              </Button>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                className="bg-green-600 hover:bg-green-700"
              >
                Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Share {invoice.invoiceNumber} with {invoice.customerName} through
              email, WhatsApp, or your device share menu.
            </p>
            {navigator.share && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleNativeShare}
                disabled={isSharing}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                {isSharing ? "Preparing share..." : "Share from device"}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleEmailShare}
            >
              <Mail className="w-4 h-4 mr-2" />
              Share by Email
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleWhatsAppShare}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Share on WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
