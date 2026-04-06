import {
  getCachedAuthUserId,
  isAuthResolved,
  requireAuthUserId,
  waitForAuthUserId,
} from "./auth-state";
import { supabase } from "./supabase";
import type {
  BusinessSettings,
  Customer,
  Invoice,
  Payment,
  Product,
} from "./types";

const TABLE_NAME = "kv_store_efa27997";

type KvRow<T> = {
  key: string;
  value: T;
};

async function ensureAuthenticatedUserId(): Promise<string> {
  const cachedUserId = getCachedAuthUserId();
  if (cachedUserId) {
    return cachedUserId;
  }

  if (!isAuthResolved()) {
    const resolvedUserId = await waitForAuthUserId();
    if (resolvedUserId) {
      return resolvedUserId;
    }
  }

  return requireAuthUserId();
}

function createEntityKey(userId: string, entity: string, id: string): string {
  return `user:${userId}:${entity}:${id}`;
}

function createEntityPrefix(userId: string, entity: string): string {
  return `user:${userId}:${entity}:`;
}

function createSettingsKey(userId: string): string {
  return `user:${userId}:settings`;
}

async function listValues<T>(entity: string): Promise<T[]> {
  const userId = await ensureAuthenticatedUserId();
  const prefix = createEntityPrefix(userId, entity);
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("key, value")
    .like("key", `${prefix}%`)
    .order("key", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as KvRow<T>[]).map((row) => row.value);
}

async function upsertValue<T>(entity: string, record: T & { id: string }): Promise<T> {
  const userId = await ensureAuthenticatedUserId();
  const { error } = await supabase.from(TABLE_NAME).upsert({
    key: createEntityKey(userId, entity, record.id),
    value: record,
  });

  if (error) {
    throw new Error(error.message);
  }

  return record;
}

async function deleteValue(entity: string, id: string): Promise<void> {
  const userId = await ensureAuthenticatedUserId();
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("key", createEntityKey(userId, entity, id));

  if (error) {
    throw new Error(error.message);
  }
}

async function getSettingsValue(): Promise<BusinessSettings | null> {
  const userId = await ensureAuthenticatedUserId();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("value")
    .eq("key", createSettingsKey(userId))
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as { value: BusinessSettings } | null)?.value ?? null;
}

async function saveSettingsValue(settings: BusinessSettings): Promise<BusinessSettings> {
  const userId = await ensureAuthenticatedUserId();
  const { error } = await supabase.from(TABLE_NAME).upsert({
    key: createSettingsKey(userId),
    value: settings,
  });

  if (error) {
    throw new Error(error.message);
  }

  return settings;
}

// Invoice API
export const invoiceAPI = {
  getAll: async (): Promise<Invoice[]> => {
    return listValues<Invoice>("invoice");
  },

  save: async (invoice: Invoice): Promise<Invoice> => {
    return upsertValue("invoice", invoice);
  },

  delete: async (id: string): Promise<void> => {
    await deleteValue("invoice", id);
  },
};

// Customer API
export const customerAPI = {
  getAll: async (): Promise<Customer[]> => {
    return listValues<Customer>("customer");
  },

  save: async (customer: Customer): Promise<Customer> => {
    return upsertValue("customer", customer);
  },

  delete: async (id: string): Promise<void> => {
    await deleteValue("customer", id);
  },
};

// Product API
export const productAPI = {
  getAll: async (): Promise<Product[]> => {
    return listValues<Product>("product");
  },

  save: async (product: Product): Promise<Product> => {
    return upsertValue("product", product);
  },

  delete: async (id: string): Promise<void> => {
    await deleteValue("product", id);
  },
};

// Payment API
export const paymentAPI = {
  getAll: async (): Promise<Payment[]> => {
    return listValues<Payment>("payment");
  },

  save: async (payment: Payment): Promise<Payment> => {
    return upsertValue("payment", payment);
  },

  delete: async (id: string): Promise<void> => {
    await deleteValue("payment", id);
  },
};

// Settings API
export const settingsAPI = {
  get: async (): Promise<BusinessSettings | null> => {
    return getSettingsValue();
  },

  save: async (settings: BusinessSettings): Promise<BusinessSettings> => {
    return saveSettingsValue(settings);
  },
};
