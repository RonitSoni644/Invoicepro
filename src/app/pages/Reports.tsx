import { useEffect, useMemo, useState } from "react";
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
import { TrendingUp, FileText } from "lucide-react";
import { getInvoices, getCustomers, type Customer, type Invoice } from "../lib/store";
import { formatCurrency } from "../lib/utils";

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "2-digit",
});

const STATUS_META = {
  paid: { label: "Paid", color: "#10b981" },
  partial: { label: "Partial", color: "#f59e0b" },
  unpaid: { label: "Unpaid", color: "#ef4444" },
} as const;

export function Reports() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const [nextInvoices, nextCustomers] = await Promise.all([
        getInvoices(),
        getCustomers(),
      ]);

      if (cancelled) {
        return;
      }

      setInvoices(nextInvoices);
      setCustomers(nextCustomers);
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const salesData = useMemo(() => {
    const now = new Date();
    const monthBuckets = Array.from({ length: 6 }, (_, offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - offset), 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      return {
        id: `sales-${key}`,
        key,
        month: MONTH_LABEL_FORMATTER.format(date),
        sales: 0,
        paid: 0,
        pending: 0,
        invoiceCount: 0,
      };
    });

    const bucketMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));

    invoices.forEach((invoice) => {
      const invoiceDate = new Date(invoice.date);

      if (Number.isNaN(invoiceDate.getTime())) {
        return;
      }

      const key = `${invoiceDate.getFullYear()}-${invoiceDate.getMonth()}`;
      const bucket = bucketMap.get(key);

      if (!bucket) {
        return;
      }

      bucket.sales += invoice.total;
      bucket.paid += invoice.paidAmount;
      bucket.pending += Math.max(invoice.total - invoice.paidAmount, 0);
      bucket.invoiceCount += 1;
    });

    return monthBuckets;
  }, [invoices]);

  const paymentStatusData = useMemo(() => {
    const statusCounts = {
      paid: 0,
      partial: 0,
      unpaid: 0,
    };

    invoices.forEach((invoice) => {
      if (invoice.status === "paid" || invoice.status === "partial" || invoice.status === "unpaid") {
        statusCounts[invoice.status] += 1;
      }
    });

    return (Object.entries(STATUS_META) as Array<
      [keyof typeof STATUS_META, (typeof STATUS_META)[keyof typeof STATUS_META]]
    >)
      .map(([status, meta]) => ({
        id: `status-${status}`,
        status: meta.label,
        count: statusCounts[status],
        fill: meta.color,
      }))
      .filter((item) => item.count > 0);
  }, [invoices]);

  const gstData = useMemo(() => {
    const totalCGST = invoices.reduce((sum, inv) => sum + inv.cgst, 0);
    const totalSGST = invoices.reduce((sum, inv) => sum + inv.sgst, 0);
    const totalIGST = invoices.reduce((sum, inv) => sum + inv.igst, 0);

    return [
      { name: "CGST", value: totalCGST, color: "#3b82f6", id: "cgst" },
      { name: "SGST", value: totalSGST, color: "#10b981", id: "sgst" },
      { name: "IGST", value: totalIGST, color: "#f59e0b", id: "igst" },
    ].filter((item) => item.value > 0);
  }, [invoices]);

  const topCustomers = useMemo(() => {
    return customers
      .map((customer) => {
        const customerInvoices = invoices.filter(
          (inv) => inv.customerId === customer.id,
        );
        const totalSpent = customerInvoices.reduce(
          (sum, inv) => sum + inv.total,
          0,
        );
        return {
          name: customer.name,
          totalSpent,
          invoiceCount: customerInvoices.length,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }, [customers, invoices]);

  const gstRateBreakdown = useMemo(() => {
    const breakdown: { [key: number]: number } = {};

    invoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        const gstAmount = (item.amount * item.gstRate) / 100;
        breakdown[item.gstRate] = (breakdown[item.gstRate] || 0) + gstAmount;
      });
    });

    return Object.entries(breakdown).map(([rate, amount]) => ({
      rate: `${rate}%`,
      amount,
    }));
  }, [invoices]);

  const overallStats = useMemo(() => {
    const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalPending = totalSales - totalPaid;
    const totalGST = invoices.reduce(
      (sum, inv) => sum + inv.cgst + inv.sgst + inv.igst,
      0,
    );
    const avgInvoiceValue =
      invoices.length > 0 ? totalSales / invoices.length : 0;

    return {
      totalSales,
      totalPaid,
      totalPending,
      totalGST,
      avgInvoiceValue,
      totalInvoices: invoices.length,
    };
  }, [invoices]);

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="relative z-10">
          <div className="page-kicker">Insight engine</div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">
            Turn invoices and customer activity into clear revenue trends, GST summaries, and performance signals.
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">Total Sales</p>
          </div>
          <p className="stat-value">
            {formatCurrency(overallStats.totalSales)}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">Total Collected</p>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-green-600">
            {formatCurrency(overallStats.totalPaid)}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-orange-600">
            {formatCurrency(overallStats.totalPending)}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600">Avg Invoice</p>
          </div>
          <p className="stat-value">
            {formatCurrency(overallStats.avgInvoiceValue)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="surface-panel p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sales Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
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
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Total Sales"
              />
              <Line
                type="monotone"
                dataKey="paid"
                stroke="#10b981"
                strokeWidth={2}
                name="Paid"
              />
              <Line
                type="monotone"
                dataKey="pending"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Pending"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* GST Collection */}
        <div className="surface-panel p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            GST Collection Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={gstData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {gstData.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total GST Collected:</span>
              <span className="font-bold text-gray-900">
                {formatCurrency(overallStats.totalGST)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="surface-panel p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={paymentStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="status" stroke="#6b7280" />
              <YAxis allowDecimals={false} stroke="#6b7280" />
              <Tooltip
                formatter={(value: number) => [`${value} invoices`, "Count"]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              />
              <Legend />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Invoices">
                {paymentStatusData.map((entry) => (
                  <Cell key={entry.id} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* GST Rate Breakdown */}
        <div className="surface-panel p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            GST by Rate
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gstRateBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="rate" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              />
              <Bar dataKey="amount" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Customers */}
      <div className="table-wrap">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoices
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topCustomers.map((customer, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {customer.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(customer.totalSpent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.invoiceCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GST Summary for Filing */}
      <div className="surface-panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          GST Summary (For Filing)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Total CGST</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                gstData.find((d) => d.name === "CGST")?.value || 0,
              )}
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Total SGST</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(
                gstData.find((d) => d.name === "SGST")?.value || 0,
              )}
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Total IGST</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(
                gstData.find((d) => d.name === "IGST")?.value || 0,
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
