export type PaymentMethod = "cash" | "upi" | "card" | "bank_transfer" | "cheque" | "other";

export type PaymentBreakdown = {
  method: PaymentMethod | string;
  amount: number;
};

export type InvoiceItem = {
  productId?: string;
  productName: string;
  quantity: number;
  price: number;
  gstRate: number;
  amount: number;
};

export type InvoiceStatus = "paid" | "unpaid" | "partial";

export type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerGSTIN?: string;
  customerAddress?: string;
  date: string;
  dueDate?: string;
  items: InvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  paidAmount: number;
  status: InvoiceStatus;
  notes?: string;
  paymentBreakdown?: PaymentBreakdown[];
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  gstRate: number;
  stock?: number;
  description?: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: PaymentMethod | string;
  notes?: string;
};

export type BusinessSettings = {
  name: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  terms?: string;
  signatureUrl?: string;
  extraInfo?: string;
  upiQrUrl?: string;
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
};
