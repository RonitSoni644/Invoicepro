import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const TABLE_NAME = "kv_store_efa27997";

function parseEnv(contents) {
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .reduce((acc, line) => {
      const index = line.indexOf("=");
      if (index === -1) return acc;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadConfig() {
  const env = parseEnv(await readFile(new URL("../.env", import.meta.url), "utf8"));
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  assert(supabaseUrl, "Missing VITE_SUPABASE_URL in .env");
  assert(supabaseAnonKey, "Missing VITE_SUPABASE_ANON_KEY in .env");

  return {
    supabaseUrl,
    supabaseAnonKey,
    functionBaseUrl: `${supabaseUrl}/functions/v1/server`,
  };
}

async function createSession(config) {
  const suppliedEmail = process.env.TEST_EMAIL?.trim();
  const suppliedPassword = process.env.TEST_PASSWORD?.trim();
  const emailBase = `codex.live.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const primaryEmail = `${emailBase}@gmail.com`;
  const password = `Codex!${Date.now().toString().slice(-8)}`;
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  if (suppliedEmail && suppliedPassword) {
    const existingLogin = await supabase.auth.signInWithPassword({
      email: suppliedEmail,
      password: suppliedPassword,
    });

    if (existingLogin.error || !existingLogin.data.session?.access_token || !existingLogin.data.user) {
      throw new Error(
        `Credential login failed for ${suppliedEmail}: ${
          existingLogin.error?.message ?? "No session returned."
        }`,
      );
    }

    return {
      supabase,
      accessToken: existingLogin.data.session.access_token,
      user: existingLogin.data.user,
      email: suppliedEmail,
      createdVia: "provided-credentials",
    };
  }

  const publicSignup = await supabase.auth.signUp({
    email: primaryEmail,
    password,
    options: {
      data: {
        name: "Codex Live Test",
        phone: "9999999999",
      },
    },
  });

  if (publicSignup.error) {
    throw new Error(`Public sign-up failed: ${publicSignup.error.message}`);
  }

  let accessToken = publicSignup.data.session?.access_token ?? null;
  let user = publicSignup.data.user ?? null;
  let createdVia = "public-signup";

  if (!accessToken) {
    const passwordLogin = await supabase.auth.signInWithPassword({
      email: primaryEmail,
      password,
    });

    if (passwordLogin.error || !passwordLogin.data.session?.access_token) {
      throw new Error(
        `Public sign-up created no usable session, and password login failed: ${
          passwordLogin.error?.message ?? "No session returned."
        }`,
      );
    }

    accessToken = passwordLogin.data.session.access_token;
    user = passwordLogin.data.user;
    createdVia = "public-signup-then-login";
  }

  assert(accessToken, "Unable to establish an authenticated session.");
  assert(user?.id, "Authenticated user id missing.");

  return {
    supabase,
    accessToken,
    user,
    email: primaryEmail,
    createdVia,
  };
}

function getAuthHeaders(config, accessToken) {
  return {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

async function run() {
  const config = await loadConfig();
  const session = await createSession(config);
  const results = [];
  const cleanupTasks = [];
  const userId = session.user.id;

  async function step(name, fn) {
    try {
      const detail = await fn();
      results.push({ name, status: "passed", detail });
    } catch (error) {
      results.push({
        name,
        status: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function fetchJson(path, init = {}) {
    const response = await fetch(`${config.functionBaseUrl}${path}`, {
      ...init,
      headers: {
        ...getAuthHeaders(config, session.accessToken),
        ...(init.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => null);
    return { response, payload };
  }

  async function upsertKvRecord(key, value) {
    const { error } = await session.supabase.from(TABLE_NAME).upsert({ key, value });
    if (error) {
      throw new Error(error.message);
    }
  }

  async function listKvRecords(prefix) {
    const { data, error } = await session.supabase
      .from(TABLE_NAME)
      .select("key, value")
      .like("key", `${prefix}%`)
      .order("key", { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return data ?? [];
  }

  async function deleteKvRecord(key) {
    const { error } = await session.supabase.from(TABLE_NAME).delete().eq("key", key);
    if (error) {
      throw new Error(error.message);
    }
  }

  const customerId = `cust-${crypto.randomUUID()}`;
  const productId = `prod-${crypto.randomUUID()}`;
  const invoiceId = `inv-${crypto.randomUUID()}`;
  const paymentId = `pay-${crypto.randomUUID()}`;
  const settingsKey = `user:${userId}:settings`;
  const customerKey = `user:${userId}:customer:${customerId}`;
  const productKey = `user:${userId}:product:${productId}`;
  const invoiceKey = `user:${userId}:invoice:${invoiceId}`;
  const paymentKey = `user:${userId}:payment:${paymentId}`;

  await step("Health endpoint", async () => {
    const response = await fetch(`${config.functionBaseUrl}/make-server-efa27997/health`);
    const payload = await response.json();
    assert(response.ok, `Health request failed with ${response.status}`);
    assert(payload.status === "ok", `Health returned status '${payload.status}'`);
    return payload;
  });

  await step("User authentication bootstrap", async () => {
    const {
      data: { user },
      error,
    } = await session.supabase.auth.getUser(session.accessToken);
    if (error) {
      throw new Error(error.message);
    }
    assert(user?.id === userId, "Authenticated user lookup did not match the created user.");
    return { email: session.email, createdVia: session.createdVia, userId };
  });

  await step("Settings save and fetch", async () => {
    const settings = {
      name: "Codex Test Company",
      gstin: "22AAAAA0000A1Z5",
      address: "42 Test Street",
      city: "Pune",
      state: "Maharashtra",
      phone: "9999999999",
      email: session.email,
    };
    await upsertKvRecord(settingsKey, settings);
    cleanupTasks.push(() => deleteKvRecord(settingsKey));
    const { data, error } = await session.supabase
      .from(TABLE_NAME)
      .select("value")
      .eq("key", settingsKey)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    assert(data?.value?.name === settings.name, "Saved settings could not be fetched back.");
    return { businessName: data.value.name };
  });

  await step("Customer save, list, and delete", async () => {
    const customer = {
      id: customerId,
      name: "Smoke Test Customer",
      phone: "8888888888",
    };
    await upsertKvRecord(customerKey, customer);
    const customers = await listKvRecords(`user:${userId}:customer:`);
    assert(customers.some((row) => row.key === customerKey), "Customer was not returned in the list query.");
    await deleteKvRecord(customerKey);
    const customersAfterDelete = await listKvRecords(`user:${userId}:customer:`);
    assert(!customersAfterDelete.some((row) => row.key === customerKey), "Customer delete did not remove the record.");
    return { listed: customers.length, deleted: customerId };
  });

  await step("Product save, list, and delete", async () => {
    const product = {
      id: productId,
      name: "Smoke Test Product",
      price: 2500,
      gstRate: 18,
    };
    await upsertKvRecord(productKey, product);
    const products = await listKvRecords(`user:${userId}:product:`);
    assert(products.some((row) => row.key === productKey), "Product was not returned in the list query.");
    await deleteKvRecord(productKey);
    const productsAfterDelete = await listKvRecords(`user:${userId}:product:`);
    assert(!productsAfterDelete.some((row) => row.key === productKey), "Product delete did not remove the record.");
    return { listed: products.length, deleted: productId };
  });

  await step("Invoice save, list, and delete", async () => {
    const invoice = {
      id: invoiceId,
      invoiceNumber: "INV-9001",
      customerId,
      customerName: "Smoke Test Customer",
      customerPhone: "8888888888",
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      items: [],
      subtotal: 2500,
      cgst: 225,
      sgst: 225,
      igst: 0,
      total: 2950,
      paidAmount: 0,
      status: "unpaid",
      paymentBreakdown: [],
    };
    await upsertKvRecord(invoiceKey, invoice);
    const invoices = await listKvRecords(`user:${userId}:invoice:`);
    assert(invoices.some((row) => row.key === invoiceKey), "Invoice was not returned in the list query.");
    await deleteKvRecord(invoiceKey);
    const invoicesAfterDelete = await listKvRecords(`user:${userId}:invoice:`);
    assert(!invoicesAfterDelete.some((row) => row.key === invoiceKey), "Invoice delete did not remove the record.");
    return { listed: invoices.length, deleted: invoiceId };
  });

  await step("Payment save, list, and delete", async () => {
    const payment = {
      id: paymentId,
      invoiceId,
      amount: 500,
      date: new Date().toISOString().slice(0, 10),
      method: "upi",
    };
    await upsertKvRecord(paymentKey, payment);
    const payments = await listKvRecords(`user:${userId}:payment:`);
    assert(payments.some((row) => row.key === paymentKey), "Payment was not returned in the list query.");
    await deleteKvRecord(paymentKey);
    const paymentsAfterDelete = await listKvRecords(`user:${userId}:payment:`);
    assert(!paymentsAfterDelete.some((row) => row.key === paymentKey), "Payment delete did not remove the record.");
    return { listed: payments.length, deleted: paymentId };
  });

  await step("Server CRUD invoice endpoint", async () => {
    const serverInvoice = {
      id: invoiceId,
      invoiceNumber: "INV-SERVER-1",
      customerId,
      customerName: "Server Endpoint Customer",
      customerPhone: "7777777777",
      date: new Date().toISOString().slice(0, 10),
      items: [],
      subtotal: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0,
      paidAmount: 0,
      status: "unpaid",
    };
    const saveResult = await fetchJson("/make-server-efa27997/invoices", {
      method: "POST",
      body: JSON.stringify(serverInvoice),
    });
    assert(saveResult.response.ok, `Server invoice save failed with ${saveResult.response.status}`);
    const listResult = await fetchJson("/make-server-efa27997/invoices");
    assert(listResult.response.ok, `Server invoice list failed with ${listResult.response.status}`);
    assert(
      Array.isArray(listResult.payload?.invoices) &&
        listResult.payload.invoices.some((invoice) => invoice.id === invoiceId),
      "Saved invoice was not returned by the server invoice list endpoint.",
    );
    const deleteResult = await fetchJson(`/make-server-efa27997/invoices/${invoiceId}`, {
      method: "DELETE",
    });
    assert(deleteResult.response.ok, `Server invoice delete failed with ${deleteResult.response.status}`);
    return { listed: listResult.payload.invoices.length };
  });

  await step("Server CRUD customer endpoint", async () => {
    const customer = {
      id: customerId,
      name: "Server Endpoint Customer",
      phone: "7777777777",
    };
    const saveResult = await fetchJson("/make-server-efa27997/customers", {
      method: "POST",
      body: JSON.stringify(customer),
    });
    assert(saveResult.response.ok, `Server customer save failed with ${saveResult.response.status}`);
    const listResult = await fetchJson("/make-server-efa27997/customers");
    assert(listResult.response.ok, `Server customer list failed with ${listResult.response.status}`);
    assert(
      Array.isArray(listResult.payload?.customers) &&
        listResult.payload.customers.some((entry) => entry.id === customerId),
      "Saved customer was not returned by the server customer list endpoint.",
    );
    const deleteResult = await fetchJson(`/make-server-efa27997/customers/${customerId}`, {
      method: "DELETE",
    });
    assert(deleteResult.response.ok, `Server customer delete failed with ${deleteResult.response.status}`);
    return { listed: listResult.payload.customers.length };
  });

  await step("Server CRUD product endpoint", async () => {
    const product = {
      id: productId,
      name: "Server Endpoint Product",
      price: 1000,
      gstRate: 18,
    };
    const saveResult = await fetchJson("/make-server-efa27997/products", {
      method: "POST",
      body: JSON.stringify(product),
    });
    assert(saveResult.response.ok, `Server product save failed with ${saveResult.response.status}`);
    const listResult = await fetchJson("/make-server-efa27997/products");
    assert(listResult.response.ok, `Server product list failed with ${listResult.response.status}`);
    assert(
      Array.isArray(listResult.payload?.products) &&
        listResult.payload.products.some((entry) => entry.id === productId),
      "Saved product was not returned by the server product list endpoint.",
    );
    const deleteResult = await fetchJson(`/make-server-efa27997/products/${productId}`, {
      method: "DELETE",
    });
    assert(deleteResult.response.ok, `Server product delete failed with ${deleteResult.response.status}`);
    return { listed: listResult.payload.products.length };
  });

  await step("Server CRUD payment endpoint", async () => {
    const payment = {
      id: paymentId,
      invoiceId,
      amount: 250,
      date: new Date().toISOString().slice(0, 10),
      method: "cash",
    };
    const saveResult = await fetchJson("/make-server-efa27997/payments", {
      method: "POST",
      body: JSON.stringify(payment),
    });
    assert(saveResult.response.ok, `Server payment save failed with ${saveResult.response.status}`);
    const listResult = await fetchJson("/make-server-efa27997/payments");
    assert(listResult.response.ok, `Server payment list failed with ${listResult.response.status}`);
    assert(
      Array.isArray(listResult.payload?.payments) &&
        listResult.payload.payments.some((entry) => entry.id === paymentId),
      "Saved payment was not returned by the server payment list endpoint.",
    );
    const deleteResult = await fetchJson(`/make-server-efa27997/payments/${paymentId}`, {
      method: "DELETE",
    });
    assert(deleteResult.response.ok, `Server payment delete failed with ${deleteResult.response.status}`);
    return { listed: listResult.payload.payments.length };
  });

  await step("Server settings endpoint", async () => {
    const settings = {
      name: "Server Endpoint Company",
      gstin: "",
      address: "",
      city: "Pune",
      state: "Maharashtra",
      phone: "9999999999",
      email: session.email,
    };
    const saveResult = await fetchJson("/make-server-efa27997/settings", {
      method: "POST",
      body: JSON.stringify(settings),
    });
    assert(saveResult.response.ok, `Server settings save failed with ${saveResult.response.status}`);
    const getResult = await fetchJson("/make-server-efa27997/settings");
    assert(getResult.response.ok, `Server settings get failed with ${getResult.response.status}`);
    assert(getResult.payload?.settings?.name === settings.name, "Server settings fetch did not return the saved payload.");
    return { businessName: getResult.payload.settings.name };
  });

  for (const cleanup of cleanupTasks.reverse()) {
    try {
      await cleanup();
    } catch {
      // Keep cleanup best-effort so the report still surfaces test results.
    }
  }

  const summary = {
    total: results.length,
    passed: results.filter((item) => item.status === "passed").length,
    failed: results.filter((item) => item.status === "failed").length,
    createdUser: {
      email: session.email,
      createdVia: session.createdVia,
    },
    results,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(
    JSON.stringify(
      {
        fatal: true,
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
