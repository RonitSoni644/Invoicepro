import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Plus, Trash2, Save, X } from "lucide-react";
import {
  getInvoice,
  saveInvoice,
  getNextInvoiceNumber,
  getCustomers,
  getProducts,
  Invoice,
  InvoiceItem,
  Customer,
  Product,
} from "../lib/store";
import { generateId, calculateGST } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";

export function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState("");
  const [applyGST, setApplyGST] = useState(true); // Toggle for CGST/SGST
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const fieldClassName = "space-y-2";
  const selectedCustomer = customers.find((customer) => customer.id === customerId);

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      const [nextCustomers, nextProducts] = await Promise.all([
        getCustomers(),
        getProducts(),
      ]);

      if (cancelled) {
        return;
      }

      setCustomers(nextCustomers);
      setProducts(nextProducts);
    };

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInvoice = async () => {
      if (isEditing && id) {
        const invoice = await getInvoice(id);
        if (!invoice || cancelled) {
          return;
        }

        setInvoiceNumber(invoice.invoiceNumber);
        setCustomerId(invoice.customerId);
        setDate(invoice.date);
        setItems(invoice.items);
        setNotes(invoice.notes || "");
        setApplyGST(
          invoice.cgst !== undefined && invoice.sgst !== undefined
            ? invoice.cgst > 0 || invoice.sgst > 0
            : true,
        );
        return;
      }

      const nextInvoiceNumber = await getNextInvoiceNumber();
      if (!cancelled) {
        setInvoiceNumber(nextInvoiceNumber || "INV-001");
      }
    };

    void loadInvoice().catch((error) => {
      console.error("Failed to load invoice details:", error);
      if (!cancelled && !isEditing) {
        setInvoiceNumber("INV-001");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

  const addItem = () => {
    setItems([
      ...items,
      {
        productId: "",
        productName: "",
        quantity: 1,
        price: 0,
        gstRate: 18,
        amount: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "productId" && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].productName = product.name;
        newItems[index].price = product.price;
        newItems[index].gstRate = product.gstRate;
      }
    }

    if (field === "quantity" || field === "price") {
      newItems[index].amount = newItems[index].quantity * newItems[index].price;
    }

    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    if (applyGST) {
      items.forEach((item) => {
        const gst = calculateGST(item.amount, item.gstRate, true);
        totalCGST += gst.cgst;
        totalSGST += gst.sgst;
        totalIGST += gst.igst;
      });
    }

    const total = subtotal + totalCGST + totalSGST + totalIGST;

    return {
      subtotal,
      cgst: totalCGST,
      sgst: totalSGST,
      igst: totalIGST,
      total,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    setSaving(true);

    try {
      const resolvedInvoiceNumber =
        invoiceNumber.trim() || (await getNextInvoiceNumber()) || "INV-001";

      if (!isEditing && invoiceNumber !== resolvedInvoiceNumber) {
        setInvoiceNumber(resolvedInvoiceNumber);
      }

      const invoice: Invoice = {
        id: isEditing && id ? id : generateId(),
        invoiceNumber: resolvedInvoiceNumber,
        customerId,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerGSTIN: customer.gstin,
        customerAddress: customer.address,
        date,
        items,
        ...totals,
        status: "unpaid",
        paidAmount: 0,
        notes,
      };

      await saveInvoice(invoice);
      toast.success(
        isEditing
          ? "Invoice updated successfully"
          : "Invoice created successfully",
      );
      navigate("/invoices");
    } catch (error) {
      console.error("Failed to save invoice:", error);
      toast.error("Unable to save invoice. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const totals = calculateTotals();
  return (
    <div className="page-shell mx-auto max-w-5xl">
      <div className="page-hero">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="page-kicker">Invoice builder</div>
            <h1 className="page-title">
            {isEditing ? "Edit Invoice" : "New Invoice"}
            </h1>
            <p className="page-subtitle">
            {isEditing ? "Update invoice details" : "Create a new invoice"}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/invoices")} className="w-full rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white sm:w-auto">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <div className="surface-panel p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Basic Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClassName}>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
                readOnly={!isEditing}
                disabled={isEditing}
              />
            </div>
            <div className={fieldClassName}>
              <Label htmlFor="date">Invoice Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className={`md:col-span-2 ${fieldClassName}`}>
              <Label htmlFor="customer">Customer</Label>
              <select
                id="customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
            </div>
            <div className={fieldClassName}>
              <Label htmlFor="customerMobile">Mobile</Label>
              <Input
                id="customerMobile"
                value={selectedCustomer?.phone || ""}
                placeholder="Select a customer first"
                readOnly
              />
            </div>
            <div className={fieldClassName}>
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                value={selectedCustomer?.email || ""}
                placeholder="Optional customer email"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* GST Toggle */}
        <div className="surface-panel p-6">
          <div className="flex items-start gap-4">
            <input
              type="checkbox"
              id="applyGST"
              checked={applyGST}
              onChange={() => setApplyGST((v) => !v)}
              className="w-4 h-4"
            />
            <Label htmlFor="applyGST">Apply CGST & SGST</Label>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Uncheck if GST is not required for this invoice.
          </p>
        </div>

        {/* Items */}
        <div className="surface-panel p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Items</h3>
            <Button type="button" onClick={addItem} variant="outline" size="sm" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-3 rounded-[22px] border border-slate-200 bg-slate-50/90 p-4 sm:gap-4"
              >
                <div className={`col-span-12 md:col-span-4 ${fieldClassName}`}>
                  <Label>Product/Service</Label>
                  <select
                    value={item.productId}
                    onChange={(e) =>
                      updateItem(index, "productId", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={`col-span-6 md:col-span-2 ${fieldClassName}`}>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", parseInt(e.target.value))
                    }
                    required
                  />
                </div>
                <div className={`col-span-6 md:col-span-2 ${fieldClassName}`}>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(index, "price", parseFloat(e.target.value))
                    }
                    required
                  />
                </div>
                <div className={`col-span-6 md:col-span-2 ${fieldClassName}`}>
                  <Label>GST %</Label>
                  <select
                    value={item.gstRate}
                    onChange={(e) =>
                      updateItem(index, "gstRate", parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                <div className="col-span-12 sm:col-span-6 md:col-span-2 flex items-end justify-between gap-3">
                  <div className={fieldClassName}>
                    <Label>Amount</Label>
                    <div className="text-sm font-medium">
                      ₹{item.amount.toFixed(2)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No items added yet. Click "Add Item" to get started.
              </div>
            )}
          </div>
        </div>

        {/* Totals */}
        {items.length > 0 && (
          <div className="surface-panel p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Totals</h3>
            <div className="space-y-2 w-full max-w-md ml-auto">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">
                  ₹{totals.subtotal.toFixed(2)}
                </span>
              </div>
              {applyGST && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CGST:</span>
                    <span className="font-medium">
                      ₹{totals.cgst.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SGST:</span>
                    <span className="font-medium">
                      ₹{totals.sgst.toFixed(2)}
                    </span>
                  </div>
                  {totals.igst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">IGST:</span>
                      <span className="font-medium">
                        ₹{totals.igst.toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total:</span>
                <span>₹{totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="surface-panel p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any additional notes..."
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="w-full sm:w-fit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving
              ? isEditing
                ? "Updating..."
                : "Creating..."
              : isEditing
                ? "Update Invoice"
                : "Create Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}
