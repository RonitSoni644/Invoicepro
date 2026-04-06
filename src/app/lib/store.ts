import { customerAPI, invoiceAPI, paymentAPI, productAPI, settingsAPI } from "./api";
import { getCachedAuthUserId, waitForAuthUserId } from "./auth-state";
import type {
  BusinessSettings,
  Customer,
  Invoice,
  InvoiceItem,
  Payment,
  PaymentBreakdown,
  Product,
} from "./types";

export type {
  BusinessSettings as Business,
  Customer,
  Invoice,
  InvoiceItem,
  Payment,
  PaymentBreakdown,
  Product,
} from "./types";

let invoicesCache: Invoice[] | null = null;
let customersCache: Customer[] | null = null;
let productsCache: Product[] | null = null;
let paymentsCache: Payment[] | null = null;
let businessCache: BusinessSettings | null = null;
let invoicesPromise: Promise<Invoice[]> | null = null;
let customersPromise: Promise<Customer[]> | null = null;
let productsPromise: Promise<Product[]> | null = null;
let paymentsPromise: Promise<Payment[]> | null = null;
let businessPromise: Promise<BusinessSettings> | null = null;

const EMPTY_BUSINESS: BusinessSettings = {
  name: "",
  gstin: "",
  address: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  terms: "",
  signatureUrl: "",
  extraInfo: "",
  upiQrUrl: "",
  pan: "",
  website: "",
  onlineStore: "",
  subCompany: "",
  bankName: "",
  ifsc: "",
  accountNo: "",
  bankBranch: "",
  upiId: "",
  upiNo: "",
};

const getLegacyStorageKey = (baseKey: string, userId?: string) =>
  userId ? `${baseKey}:${userId}` : baseKey;

const writeLegacyStorage = <T>(
  baseKey: string,
  userId: string | undefined,
  value: T,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getLegacyStorageKey(baseKey, userId),
    JSON.stringify(value),
  );
};

const readLegacyStorage = <T>(
  baseKey: string,
  userId: string | undefined,
  defaultValue: T,
): T => {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  const scopedValue = window.localStorage.getItem(
    getLegacyStorageKey(baseKey, userId),
  );
  if (scopedValue) {
    return JSON.parse(scopedValue) as T;
  }

  const globalValue = window.localStorage.getItem(baseKey);
  return globalValue ? (JSON.parse(globalValue) as T) : defaultValue;
};

const getCurrentUserId = async (): Promise<string | undefined> => {
  const cachedUserId = getCachedAuthUserId();
  if (cachedUserId) {
    return cachedUserId;
  }

  return (await waitForAuthUserId()) ?? undefined;
};

const upsertById = <T extends { id: string }>(items: T[], item: T): T[] => {
  const index = items.findIndex((existingItem) => existingItem.id === item.id);
  if (index === -1) {
    return [item, ...items];
  }

  const nextItems = [...items];
  nextItems[index] = item;
  return nextItems;
};

const removeById = <T extends { id: string }>(items: T[], id: string): T[] =>
  items.filter((item) => item.id !== id);

const hasBusinessContent = (business: BusinessSettings | null | undefined) => {
  if (!business) {
    return false;
  }

  return Object.entries(business).some(([key, value]) => {
    if (key === "signatureUrl" || key === "upiQrUrl") {
      return typeof value === "string" && value.trim().length > 0;
    }

    return typeof value === "string" && value.trim().length > 0;
  });
};

export const clearCache = (): void => {
  invoicesCache = null;
  customersCache = null;
  productsCache = null;
  paymentsCache = null;
  businessCache = null;
  invoicesPromise = null;
  customersPromise = null;
  productsPromise = null;
  paymentsPromise = null;
  businessPromise = null;
};

export const migrateLocalDataToCloud = async (userId?: string): Promise<void> => {
  if (!userId || typeof window === "undefined") {
    return;
  }

  const [
    legacyInvoices,
    legacyCustomers,
    legacyProducts,
    legacyPayments,
    legacyBusiness,
    remoteInvoices,
    remoteCustomers,
    remoteProducts,
    remotePayments,
    remoteBusiness,
  ] = await Promise.all([
    Promise.resolve(readLegacyStorage<Invoice[]>("invoices", userId, [])),
    Promise.resolve(readLegacyStorage<Customer[]>("customers", userId, [])),
    Promise.resolve(readLegacyStorage<Product[]>("products", userId, [])),
    Promise.resolve(readLegacyStorage<Payment[]>("payments", userId, [])),
    Promise.resolve(readLegacyStorage<BusinessSettings>("business", userId, EMPTY_BUSINESS)),
    invoiceAPI.getAll(),
    customerAPI.getAll(),
    productAPI.getAll(),
    paymentAPI.getAll(),
    settingsAPI.get(),
  ]);

  const uploads: Promise<unknown>[] = [];

  if (remoteInvoices.length === 0 && legacyInvoices.length > 0) {
    uploads.push(...legacyInvoices.map((invoice) => invoiceAPI.save(invoice)));
  }
  if (remoteCustomers.length === 0 && legacyCustomers.length > 0) {
    uploads.push(...legacyCustomers.map((customer) => customerAPI.save(customer)));
  }
  if (remoteProducts.length === 0 && legacyProducts.length > 0) {
    uploads.push(...legacyProducts.map((product) => productAPI.save(product)));
  }
  if (remotePayments.length === 0 && legacyPayments.length > 0) {
    uploads.push(...legacyPayments.map((payment) => paymentAPI.save(payment)));
  }
  if (!remoteBusiness && hasBusinessContent(legacyBusiness)) {
    uploads.push(settingsAPI.save(legacyBusiness));
  }

  if (uploads.length > 0) {
    await Promise.all(uploads);
    clearCache();
  }
};

export const getInvoices = async (): Promise<Invoice[]> => {
  if (invoicesCache) {
    return invoicesCache;
  }

  if (!invoicesPromise) {
    invoicesPromise = (async () => {
      try {
        invoicesCache = await invoiceAPI.getAll();
      } catch (error) {
        const userId = await getCurrentUserId();
        invoicesCache = readLegacyStorage<Invoice[]>("invoices", userId, []);
        console.warn("Falling back to local invoice storage:", error);
      } finally {
        invoicesPromise = null;
      }

      return invoicesCache;
    })();
  }

  return invoicesPromise;
};

export const getInvoice = async (id: string): Promise<Invoice | undefined> => {
  const invoices = await getInvoices();
  return invoices.find((invoice) => invoice.id === id);
};

export const saveInvoice = async (invoice: Invoice): Promise<void> => {
  try {
    await invoiceAPI.save(invoice);
    invoicesCache = null;
  } catch (error) {
    const userId = await getCurrentUserId();
    const invoices = readLegacyStorage<Invoice[]>("invoices", userId, []);
    writeLegacyStorage("invoices", userId, upsertById(invoices, invoice));
    invoicesCache = null;
    console.warn("Saved invoice locally after cloud sync failure:", error);
  }
};

export const deleteInvoice = async (id: string): Promise<void> => {
  try {
    await invoiceAPI.delete(id);
    invoicesCache = null;
  } catch (error) {
    const userId = await getCurrentUserId();
    const invoices = readLegacyStorage<Invoice[]>("invoices", userId, []);
    writeLegacyStorage("invoices", userId, removeById(invoices, id));
    invoicesCache = null;
    console.warn("Deleted invoice locally after cloud sync failure:", error);
  }
};

export const getNextInvoiceNumber = async (): Promise<string> => {
  const invoices = await getInvoices();
  const numbers = invoices
    .map((invoice) => {
      const match = invoice.invoiceNumber?.match(/(\d+)(?!.*\d)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((num) => !Number.isNaN(num));
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  return `INV-${String(maxNumber + 1).padStart(3, "0")}`;
};

export const getCustomers = async (): Promise<Customer[]> => {
  if (customersCache) {
    return customersCache;
  }

  if (!customersPromise) {
    customersPromise = (async () => {
      try {
        customersCache = await customerAPI.getAll();
      } catch (error) {
        const userId = await getCurrentUserId();
        customersCache = readLegacyStorage<Customer[]>("customers", userId, []);
        console.warn("Falling back to local customer storage:", error);
      } finally {
        customersPromise = null;
      }

      return customersCache;
    })();
  }

  return customersPromise;
};

export const getCustomer = async (id: string): Promise<Customer | undefined> => {
  const customers = await getCustomers();
  return customers.find((customer) => customer.id === id);
};

export const saveCustomer = async (customer: Customer): Promise<void> => {
  try {
    await customerAPI.save(customer);
    customersCache = null;
  } catch (error) {
    const userId = await getCurrentUserId();
    const customers = readLegacyStorage<Customer[]>("customers", userId, []);
    writeLegacyStorage("customers", userId, upsertById(customers, customer));
    customersCache = null;
    console.warn("Saved customer locally after cloud sync failure:", error);
  }
};

export const deleteCustomer = async (id: string): Promise<void> => {
  try {
    await customerAPI.delete(id);
    customersCache = null;
  } catch (error) {
    const userId = await getCurrentUserId();
    const customers = readLegacyStorage<Customer[]>("customers", userId, []);
    writeLegacyStorage("customers", userId, removeById(customers, id));
    customersCache = null;
    console.warn("Deleted customer locally after cloud sync failure:", error);
  }
};

export const getProducts = async (): Promise<Product[]> => {
  if (productsCache) {
    return productsCache;
  }

  if (!productsPromise) {
    productsPromise = (async () => {
      try {
        productsCache = await productAPI.getAll();
      } catch (error) {
        const userId = await getCurrentUserId();
        productsCache = readLegacyStorage<Product[]>("products", userId, []);
        console.warn("Falling back to local product storage:", error);
      } finally {
        productsPromise = null;
      }

      return productsCache;
    })();
  }

  return productsPromise;
};

export const getProduct = async (id: string): Promise<Product | undefined> => {
  const products = await getProducts();
  return products.find((product) => product.id === id);
};

export const saveProduct = async (product: Product): Promise<void> => {
  try {
    await productAPI.save(product);
    productsCache = null;
  } catch (error) {
    const userId = await getCurrentUserId();
    const products = readLegacyStorage<Product[]>("products", userId, []);
    writeLegacyStorage("products", userId, upsertById(products, product));
    productsCache = null;
    console.warn("Saved product locally after cloud sync failure:", error);
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    await productAPI.delete(id);
    productsCache = null;
  } catch (error) {
    const userId = await getCurrentUserId();
    const products = readLegacyStorage<Product[]>("products", userId, []);
    writeLegacyStorage("products", userId, removeById(products, id));
    productsCache = null;
    console.warn("Deleted product locally after cloud sync failure:", error);
  }
};

export const getPayments = async (): Promise<Payment[]> => {
  if (paymentsCache) {
    return paymentsCache;
  }

  if (!paymentsPromise) {
    paymentsPromise = (async () => {
      try {
        paymentsCache = await paymentAPI.getAll();
      } catch (error) {
        const userId = await getCurrentUserId();
        paymentsCache = readLegacyStorage<Payment[]>("payments", userId, []);
        console.warn("Falling back to local payment storage:", error);
      } finally {
        paymentsPromise = null;
      }

      return paymentsCache;
    })();
  }

  return paymentsPromise;
};

export const savePayment = async (payment: Payment): Promise<void> => {
  await paymentAPI.save(payment);
  paymentsCache = null;
};

export const deletePayment = async (id: string): Promise<void> => {
  await paymentAPI.delete(id);
  paymentsCache = null;
};

export const getPaymentsByInvoice = async (invoiceId: string): Promise<Payment[]> => {
  const payments = await getPayments();
  return payments.filter((payment) => payment.invoiceId === invoiceId);
};

export const getBusiness = async (): Promise<BusinessSettings> => {
  if (businessCache) {
    return businessCache;
  }

  if (!businessPromise) {
    businessPromise = (async () => {
      try {
        businessCache = (await settingsAPI.get()) || EMPTY_BUSINESS;
      } catch (error) {
        const userId = await getCurrentUserId();
        businessCache = readLegacyStorage<BusinessSettings>("business", userId, EMPTY_BUSINESS);
        console.warn("Falling back to local business storage:", error);
      } finally {
        businessPromise = null;
      }

      return businessCache;
    })();
  }

  return businessPromise;
};

export const saveBusiness = async (business: BusinessSettings): Promise<void> => {
  await settingsAPI.save(business);
  businessCache = null;
};
