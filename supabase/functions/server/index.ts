import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.ts";

const app = new Hono();
const corsOptions = {
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

app.use("*", logger(console.log));
app.use("/*", cors(corsOptions));
app.options("/*", cors(corsOptions));

function getServerConfigError() {
  if (!supabaseUrl) {
    return "Missing SUPABASE_URL secret for the server function.";
  }

  if (!supabaseServiceRoleKey) {
    return "Missing SUPABASE_SERVICE_ROLE_KEY secret for the server function.";
  }

  return null;
}

function requireServerConfig(c: any) {
  const configError = getServerConfigError();

  if (configError) {
    console.log("Server configuration error:", configError);
    return c.json({ error: configError }, 500);
  }

  return null;
}

async function verifyAuth(c: any, next: any) {
  const configResponse = requireServerConfig(c);
  if (configResponse) {
    return configResponse;
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "No authorization header" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.log("Auth error:", error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("userId", user.id);
  c.set("userEmail", user.email);
  await next();
}

const getClientMetadata = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const buildUserMetadata = (name: unknown, phone: unknown) => {
  const normalizedName = getClientMetadata(name);
  const normalizedPhone = getClientMetadata(phone);

  return {
    name: normalizedName,
    full_name: normalizedName,
    phone: normalizedPhone,
    phone_number: normalizedPhone,
    role: "customer",
    accountStatus: "active",
  };
};

app.get("/make-server-efa27997/health", (c) => {
  const configError = getServerConfigError();
  return c.json({
    status: configError ? "misconfigured" : "ok",
    error: configError,
  });
});

app.post("/make-server-efa27997/auth/signup", async (c) => {
  try {
    const configResponse = requireServerConfig(c);
    if (configResponse) {
      return configResponse;
    }

    const { email, password, name, phone } = await c.req.json();

    if (!email || !password || !name || !phone) {
      return c.json({ error: "Email, password, name, and phone are required" }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: buildUserMetadata(name, phone),
      app_metadata: {
        role: "customer",
        accountStatus: "active",
      },
      email_confirm: true,
    });

    if (error) {
      console.log("Signup error:", error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user, message: "User created successfully" });
  } catch (error) {
    console.log("Signup exception:", error);
    return c.json({ error: "Signup failed" }, 500);
  }
});

app.get("/make-server-efa27997/invoices", verifyAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const invoices = await kv.getByPrefix(`user:${userId}:invoice:`);
    return c.json({ invoices: invoices || [] });
  } catch (error) {
    console.log("Get invoices error:", error);
    return c.json({ error: "Failed to fetch invoices" }, 500);
  }
});

app.post("/make-server-efa27997/invoices", verifyAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const invoice = await c.req.json();

    await kv.set(`user:${userId}:invoice:${invoice.id}`, invoice);
    return c.json({ success: true, invoice });
  } catch (error) {
    console.log("Save invoice error:", error);
    return c.json({ error: "Failed to save invoice" }, 500);
  }
});

app.delete("/make-server-efa27997/invoices/:id", verifyAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    await kv.del(`user:${userId}:invoice:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log("Delete invoice error:", error);
    return c.json({ error: "Failed to delete invoice" }, 500);
  }
});

app.get("/make-server-efa27997/customers", verifyAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const customers = await kv.getByPrefix(`user:${userId}:customer:`);
    return c.json({ customers: customers || [] });
  } catch (error) {
    console.log("Get customers error:", error);
    return c.json({ error: "Failed to fetch customers" }, 500);
  }
});

app.post("/make-server-efa27997/customers", verifyAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const customer = await c.req.json();

    await kv.set(`user:${userId}:customer:${customer.id}`, customer);
    return c.json({ success: true, customer });
  } catch (error) {
    console.log("Save customer error:", error);
    return c.json({ error: "Failed to save customer" }, 500);
  }
});

app.delete("/make-server-efa27997/customers/:id", verifyAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    await kv.del(`user:${userId}:customer:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log("Delete customer error:", error);
    return c.json({ error: "Failed to delete customer" }, 500);
  }
});

app.get("/make-server-efa27997/products", verifyAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const products = await kv.getByPrefix(`user:${userId}:product:`);
    return c.json({ products: products || [] });
  } catch (error) {
    console.log("Get products error:", error);
    return c.json({ error: "Failed to fetch products" }, 500);
  }
});

app.post("/make-server-efa27997/products", verifyAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const product = await c.req.json();

    await kv.set(`user:${userId}:product:${product.id}`, product);
    return c.json({ success: true, product });
  } catch (error) {
    console.log("Save product error:", error);
    return c.json({ error: "Failed to save product" }, 500);
  }
});

app.delete("/make-server-efa27997/products/:id", verifyAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    await kv.del(`user:${userId}:product:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log("Delete product error:", error);
    return c.json({ error: "Failed to delete product" }, 500);
  }
});

app.get("/make-server-efa27997/payments", verifyAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const payments = await kv.getByPrefix(`user:${userId}:payment:`);
    return c.json({ payments: payments || [] });
  } catch (error) {
    console.log("Get payments error:", error);
    return c.json({ error: "Failed to fetch payments" }, 500);
  }
});

app.post("/make-server-efa27997/payments", verifyAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const payment = await c.req.json();

    await kv.set(`user:${userId}:payment:${payment.id}`, payment);
    return c.json({ success: true, payment });
  } catch (error) {
    console.log("Save payment error:", error);
    return c.json({ error: "Failed to save payment" }, 500);
  }
});

app.delete("/make-server-efa27997/payments/:id", verifyAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    await kv.del(`user:${userId}:payment:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log("Delete payment error:", error);
    return c.json({ error: "Failed to delete payment" }, 500);
  }
});

app.get("/make-server-efa27997/settings", verifyAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const settings = await kv.get(`user:${userId}:settings`);
    return c.json({ settings: settings || null });
  } catch (error) {
    console.log("Get settings error:", error);
    return c.json({ error: "Failed to fetch settings" }, 500);
  }
});

app.post("/make-server-efa27997/settings", verifyAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const settings = await c.req.json();

    await kv.set(`user:${userId}:settings`, settings);
    return c.json({ success: true, settings });
  } catch (error) {
    console.log("Save settings error:", error);
    return c.json({ error: "Failed to save settings" }, 500);
  }
});

Deno.serve(app.fetch);
