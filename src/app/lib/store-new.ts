// API-based data store for the invoice system
import { invoiceAPI, customerAPI, productAPI, paymentAPI, settingsAPI } from './api';
import type { Invoice, Customer, Product, Payment, BusinessSettings } from './types';

// Cache for data
let invoicesCache: Invoice[] | null = null;
let customersCache: Customer[] | null = null;
let productsCache: Product[] | null = null;
let paymentsCache: Payment[] | null = null;
let settingsCache: BusinessSettings | null = null;

// Invoice functions
export const getInvoices = async (): Promise<Invoice[]> => {
  if (!invoicesCache) {
    invoicesCache = await invoiceAPI.getAll();
  }
  return invoicesCache;
};

export const saveInvoice = async (invoice: Invoice): Promise<void> => {
  await invoiceAPI.save(invoice);
  invoicesCache = null; // Invalidate cache
};

export const deleteInvoice = async (id: string): Promise<void> => {
  await invoiceAPI.delete(id);
  invoicesCache = null;
};

export const getInvoiceById = async (id: string): Promise<Invoice | undefined> => {
  const invoices = await getInvoices();
  return invoices.find(inv => inv.id === id);
};

export const getNextInvoiceNumber = async (): Promise<string> => {
  const invoices = await getInvoices();
  if (invoices.length === 0) return 'INV-001';
  
  const numbers = invoices
    .map(inv => parseInt(inv.invoiceNumber.split('-')[1]))
    .filter(n => !isNaN(n));
  
  const maxNumber = Math.max(...numbers, 0);
  return `INV-${String(maxNumber + 1).padStart(3, '0')}`;
};

// Customer functions
export const getCustomers = async (): Promise<Customer[]> => {
  if (!customersCache) {
    customersCache = await customerAPI.getAll();
  }
  return customersCache;
};

export const saveCustomer = async (customer: Customer): Promise<void> => {
  await customerAPI.save(customer);
  customersCache = null;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await customerAPI.delete(id);
  customersCache = null;
};

export const getCustomerById = async (id: string): Promise<Customer | undefined> => {
  const customers = await getCustomers();
  return customers.find(c => c.id === id);
};

// Product functions
export const getProducts = async (): Promise<Product[]> => {
  if (!productsCache) {
    productsCache = await productAPI.getAll();
  }
  return productsCache;
};

export const saveProduct = async (product: Product): Promise<void> => {
  await productAPI.save(product);
  productsCache = null;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await productAPI.delete(id);
  productsCache = null;
};

export const getProductById = async (id: string): Promise<Product | undefined> => {
  const products = await getProducts();
  return products.find(p => p.id === id);
};

// Payment functions
export const getPayments = async (): Promise<Payment[]> => {
  if (!paymentsCache) {
    paymentsCache = await paymentAPI.getAll();
  }
  return paymentsCache;
};

export const savePayment = async (payment: Payment): Promise<void> => {
  await paymentAPI.save(payment);
  paymentsCache = null;
  invoicesCache = null; // Also invalidate invoices as payment affects them
};

export const deletePayment = async (id: string): Promise<void> => {
  await paymentAPI.delete(id);
  paymentsCache = null;
  invoicesCache = null;
};

export const getPaymentsByInvoice = async (invoiceId: string): Promise<Payment[]> => {
  const payments = await getPayments();
  return payments.filter(p => p.invoiceId === invoiceId);
};

// Business settings functions
export const getBusinessSettings = async (): Promise<BusinessSettings | null> => {
  if (!settingsCache) {
    settingsCache = await settingsAPI.get();
  }
  return settingsCache;
};

export const saveBusinessSettings = async (settings: BusinessSettings): Promise<void> => {
  await settingsAPI.save(settings);
  settingsCache = null;
};

// Clear all caches (useful for logout)
export const clearCache = (): void => {
  invoicesCache = null;
  customersCache = null;
  productsCache = null;
  paymentsCache = null;
  settingsCache = null;
};

// Synchronous versions for backward compatibility (return cached data or empty)
export function getInvoicesSync(): Invoice[] {
  return invoicesCache || [];
}

export function getCustomersSync(): Customer[] {
  return customersCache || [];
}

export function getProductsSync(): Product[] {
  return productsCache || [];
}

export function getPaymentsSync(): Payment[] {
  return paymentsCache || [];
}
