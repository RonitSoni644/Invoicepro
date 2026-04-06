import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "/utils/supabase/info";

function normalizeSupabaseUrl(rawUrl?: string) {
  if (!rawUrl) {
    return `https://${projectId}.supabase.co`;
  }

  const trimmedUrl = rawUrl.trim();
  const dashboardMatch = trimmedUrl.match(
    /^https:\/\/supabase\.com\/dashboard\/project\/([a-z0-9-]+)/i,
  );

  if (dashboardMatch) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  return trimmedUrl;
}

export const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? publicAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const supabaseFunctionBaseUrl = `${supabaseUrl}/functions/v1/server`;
