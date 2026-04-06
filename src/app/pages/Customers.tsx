import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Download } from "lucide-react";
import {
  getCustomers,
  saveCustomer,
  deleteCustomer,
  Customer,
  Invoice,
  getInvoices,
} from "../lib/store";
import { generateId, formatCurrency } from "../lib/utils";
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
import {
  createCustomersCsvRows,
  downloadCsv,
  getExportDateSuffix,
} from "../lib/export";

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({});

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const [nextCustomers, nextInvoices] = await Promise.all([
        getCustomers(),
        getInvoices(),
      ]);

      if (cancelled) {
        return;
      }

      setCustomers(nextCustomers);
      setInvoices(nextInvoices);
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAdd = () => {
    setEditingCustomer(null);
    setFormData({});
    setShowDialog(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData(customer);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      try {
        await deleteCustomer(id);
        setCustomers(await getCustomers());
        toast.success("Customer deleted successfully");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete customer",
        );
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const customer: Customer = {
      id: editingCustomer?.id || generateId(),
      name: formData.name || "",
      phone: formData.phone || "",
      email: formData.email,
      gstin: formData.gstin,
      address: formData.address,
      city: formData.city,
      state: formData.state,
    };

    try {
      await saveCustomer(customer);
      setCustomers(await getCustomers());
      setShowDialog(false);
      toast.success(
        editingCustomer
          ? "Customer updated successfully"
          : "Customer added successfully",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save customer",
      );
    }
  };

  const getCustomerStats = (customerId: string) => {
    const relatedInvoices = invoices.filter(
      (inv) => inv.customerId === customerId,
    );
    const totalSpent = relatedInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalInvoices = relatedInvoices.length;
    return { totalSpent, totalInvoices };
  };

  const handleExportCustomers = () => {
    downloadCsv(
      `customers-${getExportDateSuffix()}.csv`,
      createCustomersCsvRows(filteredCustomers, invoices),
    );
    toast.success("Customers exported successfully");
  };

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="page-kicker">Relationship hub</div>
            <h1 className="page-title">Customers</h1>
            <p className="page-subtitle">Keep your customer list organized with better visibility into billing history, GST records, and contact details.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={handleExportCustomers} variant="outline" className="w-full rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Export Customers
            </Button>
            <Button onClick={handleAdd} className="w-full rounded-2xl bg-white text-slate-950 hover:bg-slate-100 sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>
      </div>

      <div className="surface-panel p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-label">Total Customers</p>
          <p className="stat-value">
            {customers.length}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Active This Month</p>
          <p className="stat-value">
            {
              customers.filter((c) => {
                const customerInvoices = invoices.filter(
                  (inv) =>
                    inv.customerId === c.id &&
                    new Date(inv.date).getMonth() === new Date().getMonth(),
                );
                return customerInvoices.length > 0;
              }).length
            }
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">With GST</p>
          <p className="stat-value">
            {customers.filter((c) => c.gstin).length}
          </p>
        </div>
      </div>

      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px]">
            <thead className="table-head">
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>GSTIN</th>
                <th>Location</th>
                <th>Total Spent</th>
                <th>Invoices</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-gray-500">No customers found</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const stats = getCustomerStats(customer.id);
                  return (
                    <tr key={customer.id} className="table-row">
                      <td>
                        <div className="text-sm font-semibold text-slate-900">
                          {customer.name}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm font-medium text-slate-900">
                          {customer.phone}
                        </div>
                        {customer.email && (
                          <div className="text-xs text-slate-500">
                            {customer.email}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-sm text-slate-500">
                        {customer.gstin || "-"}
                      </td>
                      <td className="text-sm text-slate-500">
                        {customer.city && customer.state
                          ? `${customer.city}, ${customer.state}`
                          : "-"}
                      </td>
                      <td className="whitespace-nowrap text-sm font-semibold text-slate-900">
                        {formatCurrency(stats.totalSpent)}
                      </td>
                      <td className="whitespace-nowrap text-sm text-slate-500">
                        {stats.totalInvoices}
                      </td>
                      <td className="whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="rounded-xl p-2 text-sky-700 transition hover:bg-sky-50 hover:text-sky-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="rounded-xl p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Mobile *</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter mobile number"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={formData.gstin || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gstin: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="27AAPFU0939F1ZV"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingCustomer ? "Update" : "Add"} Customer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
