import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { AlertCircle, Lock, LogIn, Mail, Shield, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../lib/auth-context";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    new URLSearchParams(location.search).get("redirectTo") || "/dashboard";

  const getLoginErrorMessage = (message?: string) => {
    if (!message) {
      return "Invalid email or password";
    }

    if (message === "Email not confirmed") {
      return "Your email is not confirmed yet. Open the Supabase confirmation email, verify your account, then sign in again.";
    }

    if (message === "Invalid login credentials") {
      return "Incorrect email or password. If you just created this account, verify your email first and then try again.";
    }

    return message;
  };

  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [authLoading, navigate, redirectTo, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(getLoginErrorMessage(err?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(160deg,_#0f172a_0%,_#1e293b_48%,_#fff7ed_100%)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden rounded-[36px] border border-white/10 bg-white/8 p-8 text-white shadow-[0_40px_120px_-50px_rgba(15,23,42,0.95)] backdrop-blur lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">
            <Shield className="h-4 w-4" />
            Secure workspace
          </div>
          <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-tight">
            Billing, customers, invoices, and reports in one clean workflow.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-200">
            Sign in to continue managing your business data, payment collections, customer records, and reports from anywhere.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/30 p-5">
              <Sparkles className="h-5 w-5 text-sky-300" />
              <p className="mt-4 text-lg font-semibold">Fast invoice flow</p>
              <p className="mt-2 text-sm text-slate-300">Create invoices, track paid amounts, and keep customer data synced with Supabase.</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-slate-950/30 p-5">
              <Shield className="h-5 w-5 text-cyan-300" />
              <p className="mt-4 text-lg font-semibold">Secure account access</p>
              <p className="mt-2 text-sm text-slate-300">Keep your billing data, customer records, and business settings protected behind your login.</p>
            </div>
          </div>
        </section>

        <section className="w-full max-w-xl justify-self-center">
          <div className="rounded-[36px] border border-white/50 bg-white/95 p-6 shadow-[0_35px_120px_-45px_rgba(15,23,42,0.75)] backdrop-blur sm:p-8">
            <div className="mb-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,_#0f172a,_#0f766e)] text-white shadow-lg">
                <LogIn className="h-8 w-8" />
              </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Use your account to open the dashboard and manage your billing workspace.
            </p>
            </div>

            {error ? (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full rounded-2xl py-6 text-base" disabled={loading}>
                {loading ? "Signing in..." : <><LogIn className="mr-2 h-4 w-4" />Sign In</>}
              </Button>
            </form>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Need a new account?{" "}
              <Link to="/signup" className="font-semibold text-slate-950 transition hover:text-sky-700">
                Create one here
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-200/90">
            Invoice & Billing System for modern small businesses
          </p>
        </section>
      </div>
    </div>
  );
}
