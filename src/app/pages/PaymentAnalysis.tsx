import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router";
import { Search, CreditCard, Download } from "lucide-react";
import { getPayments, getInvoices } from "../lib/store";
import type { Invoice, Payment } from "../lib/store";
import { formatCurrency } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  createPaymentsCsvRows,
  downloadCsv,
  getExportDateSuffix,
} from "../lib/export";
import { toast } from "sonner";

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank: "Bank Transfer",
  cheque: "Cheque",
};

export function PaymentAnalysis() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const [nextPayments, nextInvoices] = await Promise.all([
        getPayments(),
        getInvoices(),
      ]);

      if (cancelled) {
        return;
      }

      setPayments(nextPayments);
      setInvoices(nextInvoices);
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const invoice = invoices.find((inv) => inv.id === payment.invoiceId);
      const matchesSearch =
        invoice?.invoiceNumber
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ?? false;
      const matchesMethod =
        methodFilter === "all" || payment.method === methodFilter;
      return matchesSearch && matchesMethod;
    });
  }, [payments, invoices, searchTerm, methodFilter]);

  const totalPaid = filteredPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  const handleExportPayments = () => {
    downloadCsv(
      `payments-${getExportDateSuffix()}.csv`,
      createPaymentsCsvRows(filteredPayments, invoices),
    );
    toast.success("Payments exported successfully");
  };

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="page-kicker">Collection tracker</div>
            <h1 className="page-title">Payments</h1>
            <p className="page-subtitle">Review incoming payments, filter by method, and follow the money connected to each invoice.</p>
          </div>
          <Button onClick={handleExportPayments} variant="outline" className="w-full rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Export Payments
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="surface-panel border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Payments
            </CardTitle>
            <CreditCard className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPayments.length}</div>
          </CardContent>
        </Card>

        <Card className="surface-panel border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Amount
            </CardTitle>
            <CreditCard className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPaid)}
            </div>
          </CardContent>
        </Card>

        <Card className="surface-panel border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              All Payments
            </CardTitle>
            <CreditCard className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-gray-500 mt-1">Total recorded</p>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-panel border-0 shadow-none">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by invoice number or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:w-auto"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="surface-panel border-0 shadow-none">
        <CardHeader>
          <CardTitle>All Payments ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Invoice No.
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Method
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Reference
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">
                      {searchTerm || methodFilter !== "all"
                        ? "No payments match your search"
                        : "No payments recorded yet."}
                    </td>
                  </tr>
                ) : (
                  filteredPayments
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime(),
                    )
                    .map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          {new Date(payment.date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            const invoice = invoices.find(
                              (inv) => inv.id === payment.invoiceId,
                            );
                            return invoice ? (
                              <Link
                                to={`/invoices/${invoice.id}`}
                                className="text-blue-600 hover:underline font-medium"
                              >
                                {invoice.invoiceNumber}
                              </Link>
                            ) : (
                              payment.invoiceId || "-"
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {paymentMethodLabels[payment.method] ||
                              payment.method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">-</td>
                        <td className="py-3 px-4 font-medium">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {payment.notes || "-"}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
