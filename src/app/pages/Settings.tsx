import { useState, useEffect } from "react";
import { Save, Building2, Download } from "lucide-react";
import {
  getBusiness,
  saveBusiness,
  Business as BaseBusiness,
} from "../lib/store";

// Extend Business type with additional fields used in Settings
type Business = BaseBusiness & {
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
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { downloadCsv, getExportDateSuffix } from "../lib/export";

export function Settings() {
  const [formData, setFormData] = useState<Business>({
    name: "",
    gstin: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    email: "",
  });
  const fieldClassName = "space-y-2";

  useEffect(() => {
    let cancelled = false;

    const loadBusiness = async () => {
      const data = await getBusiness();
      if (!cancelled) {
        setFormData(data);
      }
    };

    void loadBusiness();

    return () => {
      cancelled = true;
    };
  }, []);

  // Handles signature image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData({ ...formData, signatureUrl: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handles QR code image upload
  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData({ ...formData, upiQrUrl: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveBusiness(formData);
    toast.success("Business settings saved successfully");
  };

  const handleExportSettings = () => {
    downloadCsv(`settings-${getExportDateSuffix()}.csv`, [
      [
        "Business Name",
        "GSTIN",
        "Phone",
        "Email",
        "Address",
        "City",
        "State",
        "PAN",
        "Website",
        "Online Store",
        "Sub Company",
        "Bank Name",
        "IFSC",
        "Account Number",
        "Bank Branch",
        "UPI ID",
        "UPI Number",
        "Terms & Conditions",
        "Other Info",
        "Has Signature",
        "Has UPI QR",
      ],
      [
        formData.name,
        formData.gstin,
        formData.phone,
        formData.email,
        formData.address,
        formData.city,
        formData.state,
        formData.pan || "",
        formData.website || "",
        formData.onlineStore || "",
        formData.subCompany || "",
        formData.bankName || "",
        formData.ifsc || "",
        formData.accountNo || "",
        formData.bankBranch || "",
        formData.upiId || "",
        formData.upiNo || "",
        formData.terms || "",
        formData.extraInfo || "",
        formData.signatureUrl ? "Yes" : "No",
        formData.upiQrUrl ? "Yes" : "No",
      ],
    ]);
    toast.success("Settings exported successfully");
  };

  return (
    <div className="page-shell max-w-5xl">
      <div className="page-hero">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="page-kicker">Business identity</div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">
              Shape the company profile, payment details, and invoice metadata that appears across your workspace.
            </p>
          </div>
          <Button onClick={handleExportSettings} variant="outline" className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white">
            <Download className="w-4 h-4 mr-2" />
            Export Settings
          </Button>
        </div>
      </div>

      <div className="surface-panel">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="section-title">
                Business Information
              </h3>
              <p className="section-copy">
                This information will appear on your invoices
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-2 sm:px-6">
          <div className={`md:col-span-2 ${fieldClassName} mt-6`}>
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={formData.terms || ""}
              onChange={(e) =>
                setFormData({ ...formData, terms: e.target.value })
              }
              rows={3}
              placeholder="Enter your terms and conditions here..."
            />
          </div>
          <div className={`md:col-span-2 ${fieldClassName}`}>
            <Label htmlFor="upiQr">UPI QR Code (Image Upload)</Label>
            <Input
              id="upiQr"
              type="file"
              accept="image/*"
              onChange={handleQrChange}
            />
            {formData.upiQrUrl && (
              <img
                src={formData.upiQrUrl}
                alt="UPI QR Preview"
                className="mt-2 h-32 border rounded shadow"
                style={{ objectFit: "contain", background: "#fff" }}
              />
            )}
          </div>
          <div className={`md:col-span-2 ${fieldClassName}`}>
            <Label htmlFor="signature">Signature (Image Upload)</Label>
            <Input
              id="signature"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {formData.signatureUrl && (
              <img
                src={formData.signatureUrl}
                alt="Signature Preview"
                className="mt-2 h-16 border rounded shadow"
                style={{ objectFit: "contain", background: "#fff" }}
              />
            )}
          </div>
          <div className={`md:col-span-2 ${fieldClassName}`}>
            <Label htmlFor="extraInfo">Other Info</Label>
            <Textarea
              id="extraInfo"
              value={formData.extraInfo || ""}
              onChange={(e) =>
                setFormData({ ...formData, extraInfo: e.target.value })
              }
              rows={2}
              placeholder="Any additional information..."
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`md:col-span-2 ${fieldClassName}`}>
              <Label htmlFor="name">Business Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className={`md:col-span-2 ${fieldClassName}`}>
              <Label htmlFor="gstin">GSTIN *</Label>
              <Input
                id="gstin"
                value={formData.gstin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gstin: e.target.value.toUpperCase(),
                  })
                }
                placeholder="27AAACD1234E1Z5"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Your 15-character GST Identification Number
              </p>
            </div>

            <div className={`md:col-span-2 ${fieldClassName}`}>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                required
              />
            </div>

            <div className={fieldClassName}>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                required
              />
            </div>

            <div className={fieldClassName}>
              <Label htmlFor="state">State *</Label>
              <select
                id="state"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                <option value="">Select State</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                <option value="Assam">Assam</option>
                <option value="Bihar">Bihar</option>
                <option value="Chhattisgarh">Chhattisgarh</option>
                <option value="Goa">Goa</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Haryana">Haryana</option>
                <option value="Himachal Pradesh">Himachal Pradesh</option>
                <option value="Jharkhand">Jharkhand</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Kerala">Kerala</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Manipur">Manipur</option>
                <option value="Meghalaya">Meghalaya</option>
                <option value="Mizoram">Mizoram</option>
                <option value="Nagaland">Nagaland</option>
                <option value="Odisha">Odisha</option>
                <option value="Punjab">Punjab</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Sikkim">Sikkim</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Telangana">Telangana</option>
                <option value="Tripura">Tripura</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Uttarakhand">Uttarakhand</option>
                <option value="West Bengal">West Bengal</option>
                <option value="Delhi">Delhi</option>
              </select>
            </div>

            <div className={fieldClassName}>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
              />
            </div>

            <div className={fieldClassName}>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            <div className={fieldClassName}>
              <Label htmlFor="pan">PAN</Label>
              <Input
                id="pan"
                value={formData.pan || ""}
                onChange={(e) =>
                  setFormData({ ...formData, pan: e.target.value })
                }
              />
            </div>
            <div className={fieldClassName}>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website || ""}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
              />
            </div>
            <div className={fieldClassName}>
              <Label htmlFor="onlineStore">Online Store</Label>
              <Input
                id="onlineStore"
                value={formData.onlineStore || ""}
                onChange={(e) =>
                  setFormData({ ...formData, onlineStore: e.target.value })
                }
              />
            </div>
            <div className={fieldClassName}>
              <Label htmlFor="subCompany">Sub Company</Label>
              <Input
                id="subCompany"
                value={formData.subCompany || ""}
                onChange={(e) =>
                  setFormData({ ...formData, subCompany: e.target.value })
                }
              />
            </div>
            <div className={fieldClassName}>
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={formData.bankName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, bankName: e.target.value })
                }
              />
            </div>
            <div className={fieldClassName}>
              <Label htmlFor="ifsc">IFSC</Label>
              <Input
                id="ifsc"
                value={formData.ifsc || ""}
                onChange={(e) =>
                  setFormData({ ...formData, ifsc: e.target.value })
                }
              />
            </div>
            <div className={fieldClassName}>
              <Label htmlFor="accountNo">Account No</Label>
              <Input
                id="accountNo"
                value={formData.accountNo || ""}
                onChange={(e) =>
                  setFormData({ ...formData, accountNo: e.target.value })
                }
              />
            </div>
            <div className={fieldClassName}>
              <Label htmlFor="bankBranch">Bank Branch</Label>
              <Input
                id="bankBranch"
                value={formData.bankBranch || ""}
                onChange={(e) =>
                  setFormData({ ...formData, bankBranch: e.target.value })
                }
              />
            </div>
            <div className={fieldClassName}>
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                value={formData.upiId || ""}
                onChange={(e) =>
                  setFormData({ ...formData, upiId: e.target.value })
                }
              />
            </div>
            <div className={fieldClassName}>
              <Label htmlFor="upiNo">UPI No</Label>
              <Input
                id="upiNo"
                value={formData.upiNo || ""}
                onChange={(e) =>
                  setFormData({ ...formData, upiNo: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <Button type="submit" className="w-full rounded-2xl sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </form>
      </div>

      {/* Additional Settings Sections */}
      <div className="surface-panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Preferences
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Data Storage</p>
              <p className="text-sm text-gray-500">
                Your data is linked to your account and syncs after login
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Invoice Numbering</p>
              <p className="text-sm text-gray-500">
                Format: INV-XXX (Auto-incrementing)
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">Currency</p>
              <p className="text-sm text-gray-500">Indian Rupee (₹)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Notice */}
      <div className="rounded-[28px] border border-sky-200 bg-sky-50/90 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-sm font-bold">i</span>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Account Sync</h4>
            <p className="text-sm text-blue-800 mb-2">
              Your invoices, customers, products, payments, and business
              settings now save to your logged-in account so they can be loaded
              from another browser after sign-in.
            </p>
            <p className="text-sm text-blue-800">
              If you already had old data in one browser, sign in there once so
              it can be moved into your account and then become available
              elsewhere.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
