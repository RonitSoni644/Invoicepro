import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Download } from "lucide-react";
import { getProducts, saveProduct, deleteProduct, Product } from "../lib/store";
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
  createProductsCsvRows,
  downloadCsv,
  getExportDateSuffix,
} from "../lib/export";

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      const data = await getProducts();
      if (!cancelled) {
        setProducts(data);
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({ gstRate: 18 });
    setShowDialog(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData(product);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(id);
        setProducts(await getProducts());
        toast.success("Product deleted successfully");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete product",
        );
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const product: Product = {
      id: editingProduct?.id || generateId(),
      name: formData.name?.trim() || "",
      price: Number.isFinite(formData.price) ? formData.price : 0,
      gstRate: formData.gstRate || 18,
      stock: Number.isFinite(formData.stock) ? formData.stock : undefined,
      description: formData.description?.trim() || undefined,
    };

    try {
      await saveProduct(product);
      setProducts(await getProducts());
      setShowDialog(false);
      toast.success(
        editingProduct
          ? "Product updated successfully"
          : "Product added successfully",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save product",
      );
    }
  };

  const handleExportProducts = () => {
    downloadCsv(
      `products-${getExportDateSuffix()}.csv`,
      createProductsCsvRows(filteredProducts),
    );
    toast.success("Products exported successfully");
  };

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="page-kicker">Catalog control</div>
            <h1 className="page-title">Products & Services</h1>
            <p className="page-subtitle">Organize pricing, GST rates, and stock details inside a more flexible product catalog experience.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={handleExportProducts} variant="outline" className="w-full rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Export Products
            </Button>
            <Button onClick={handleAdd} className="w-full rounded-2xl bg-white text-slate-950 hover:bg-slate-100 sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>
      </div>

      <div className="surface-panel p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-label">Total Products</p>
          <p className="stat-value">
            {products.length}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Average Price</p>
          <p className="stat-value">
            {products.length > 0
              ? formatCurrency(
                  products.reduce((sum, p) => sum + p.price, 0) /
                    products.length,
                )
              : formatCurrency(0)}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">With Stock Info</p>
          <p className="stat-value">
            {products.filter((p) => p.stock !== undefined).length}
          </p>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.length === 0 ? (
          <div className="surface-panel col-span-full p-12 text-center">
            <p className="text-slate-500">No products found</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="surface-panel transition-all hover:-translate-y-1 hover:shadow-[0_30px_80px_-42px_rgba(14,116,144,0.35)]"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">GST Rate:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {product.gstRate}%
                    </span>
                  </div>
                  {product.stock !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Stock:</span>
                      <span
                        className={`text-sm font-medium ${
                          product.stock > 10
                            ? "text-green-600"
                            : product.stock > 0
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {product.stock} units
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => handleEdit(product)}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(product.id)}
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Product/Service Name *</Label>
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
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="gstRate">GST Rate *</Label>
                <select
                  id="gstRate"
                  value={formData.gstRate || 18}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gstRate: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
              <div>
                <Label htmlFor="stock">Stock (Optional)</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: e.target.value
                        ? parseInt(e.target.value, 10)
                        : undefined,
                    })
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
                {editingProduct ? "Update" : "Add"} Product
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
