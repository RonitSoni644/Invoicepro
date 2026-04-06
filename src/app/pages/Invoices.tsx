import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import { getInvoices, deleteInvoice, Invoice } from "../lib/store";
import { formatCurrency } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { createInvoicesCsvRows, downloadCsv, getExportDateSuffix } from "../lib/export";
import { toast } from "sonner";

export function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    const loadInvoices = async () => {
      const data = await getInvoices();
      if (!cancelled) {
        setInvoices(data);
      }
    };

    void loadInvoices();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.invoiceNumber
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      await deleteInvoice(id);
      setInvoices(await getInvoices());
    }
  };

  const handleExportInvoices = () => {
    downloadCsv(
      `invoices-${getExportDateSuffix()}.csv`,
      createInvoicesCsvRows(filteredInvoices),
    );
    toast.success("Invoices exported successfully");
  };

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="page-kicker">Billing flow</div>
            <h1 className="page-title">Invoices</h1>
            <p className="page-subtitle">Search, filter, review statuses, and jump into new invoice creation with a cleaner workflow.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={handleExportInvoices} variant="outline" className="w-full rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Export Invoices
            </Button>
            <Link to="/invoices/new">
              <Button className="w-full rounded-2xl bg-white text-slate-950 hover:bg-slate-100 sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Invoice
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="surface-panel p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:w-auto"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-label">Total Invoices</p>
          <p className="stat-value">
            {invoices.length}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Amount</p>
          <p className="stat-value">
            {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total, 0))}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Pending Amount</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-orange-600">
            {formatCurrency(
              invoices.reduce(
                (sum, inv) => sum + (inv.total - inv.paidAmount),
                0,
              ),
            )}
          </p>
        </div>
      </div>

      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th>Invoice No.</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-gray-500">No invoices found</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="table-row">
                    <td className="whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-900">
                        {invoice.invoiceNumber}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm font-medium text-slate-900">
                        {invoice.customerName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {invoice.customerPhone}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-500">
                      {new Date(invoice.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="whitespace-nowrap text-sm font-semibold text-slate-900">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-500">
                      {formatCurrency(invoice.paidAmount)}
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className={`soft-badge ${
                          invoice.status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : invoice.status === "unpaid"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {invoice.status.charAt(0).toUpperCase() +
                          invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="rounded-xl p-2 text-sky-700 transition hover:bg-sky-50 hover:text-sky-800"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/invoices/${invoice.id}/edit`}
                          className="rounded-xl p-2 text-emerald-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="rounded-xl p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
