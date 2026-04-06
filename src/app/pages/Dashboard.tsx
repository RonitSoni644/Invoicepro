import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/auth-context";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  IndianRupee,
  Clock,
  ArrowRight,
  Download,
} from "lucide-react";
import { getBusiness, getCustomers, getInvoices, getPayments, getProducts, type Business, type Customer, type Invoice, type Payment, type Product } from "../lib/store";
import { formatCurrency } from "../lib/utils";
import { Button } from "../components/ui/button";
import { exportDashboardData, getExportUser } from "../lib/export";
import { toast } from "sonner";

export function Dashboard() {
  const { user, loading } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [business, setBusiness] = useState<Business>({
    name: "",
    gstin: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        const [nextInvoices, nextCustomers, nextProducts, nextPayments, nextBusiness] =
          await Promise.all([
            getInvoices(),
            getCustomers(),
            getProducts(),
            getPayments(),
            getBusiness(),
          ]);

        if (cancelled) {
          return;
        }

        setInvoices(nextInvoices);
        setCustomers(nextCustomers);
        setProducts(nextProducts);
        setPayments(nextPayments);
        setBusiness(nextBusiness);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        if (!cancelled) {
          toast.error("Unable to load dashboard data right now.");
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  const stats = useMemo(() => {
    const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const paidAmount = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const pendingAmount = totalSales - paidAmount;
    const paidInvoices = invoices.filter((inv) => inv.status === "paid").length;

    return {
      totalSales,
      paidAmount,
      pendingAmount,
      totalInvoices: invoices.length,
      paidInvoices,
      totalCustomers: customers.length,
    };
  }, [invoices, customers]);

  const monthlyData = useMemo(() => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return months.map((month, index) => {
      const monthInvoices = invoices.filter((inv) => {
        const invMonth = new Date(inv.date).getMonth();
        return invMonth === index;
      });
      return {
        id: `month-${index}`,
        month,
        sales: monthInvoices.reduce((sum, inv) => sum + inv.total, 0),
        invoices: monthInvoices.length,
      };
    });
  }, [invoices]);

  const statusData = useMemo(
    () =>
      [
        {
          id: "status-paid",
          name: "Paid",
          value: invoices.filter((inv) => inv.status === "paid").length,
          color: "#10b981",
        },
        {
          id: "status-unpaid",
          name: "Unpaid",
          value: invoices.filter((inv) => inv.status === "unpaid").length,
          color: "#ef4444",
        },
        {
          id: "status-partial",
          name: "Partial",
          value: invoices.filter((inv) => inv.status === "partial").length,
          color: "#f59e0b",
        },
      ].filter((item) => item.value > 0),
    [invoices],
  );

  const recentInvoices = invoices.slice(0, 5);

  const handleExportAllData = () => {
    exportDashboardData({
      business,
      customers,
      products,
      invoices,
      payments,
      exportedBy: getExportUser(user),
    });
    toast.success("All business data exported to CSV files");
  };

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="page-kicker">Business command center</div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Track revenue, pending payments, customer growth, and recent billing activity from one modern overview.
            </p>
          </div>
          <Button
            onClick={handleExportAllData}
            variant="outline"
            className="w-full rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            Export All Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Sales</p>
              <p className="stat-value">
                {formatCurrency(stats.totalSales)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500">+12.5%</span>
              </div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <IndianRupee className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Pending Payments</p>
              <p className="stat-value">
                {formatCurrency(stats.pendingAmount)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-orange-500">
                  {invoices.filter((inv) => inv.status !== "paid").length}{" "}
                  invoices
                </span>
              </div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Invoices</p>
              <p className="stat-value">
                {stats.totalInvoices}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-sm text-gray-500">
                  {stats.paidInvoices} paid
                </span>
              </div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Customers</p>
              <p className="stat-value">
                {stats.totalCustomers}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500">+3 this month</span>
              </div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
              <Users className="w-6 h-6 text-cyan-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="surface-panel lg:col-span-2 p-4 sm:p-6">
          <h3 className="section-title mb-4">
            Monthly Revenue
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              />
              <Bar dataKey="sales" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="surface-panel p-4 sm:p-6">
          <h3 className="section-title mb-4">
            Invoice Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="table-wrap">
        <div className="section-header">
          <div>
            <h3 className="section-title">
            Recent Invoices
            </h3>
            <p className="section-copy">A quick snapshot of your latest issued documents.</p>
          </div>
          <Link
            to="/invoices"
            className="flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-800"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="table-head">
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {recentInvoices.map((invoice) => (
                <tr key={invoice.id} className="table-row">
                  <td className="whitespace-nowrap">
                    <Link
                      to={`/invoices/${invoice.id}`}
                      className="text-sm font-semibold text-sky-700 hover:text-sky-800"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
