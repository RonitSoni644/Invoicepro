import { Navigate, Link } from "react-router";
import { ArrowRight, FileText, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../lib/auth-context";

export function WelcomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-100">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.18),_transparent_26%),linear-gradient(135deg,_#020617_0%,_#0f172a_35%,_#0c4a6e_100%)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden text-white lg:block">
          <div className="page-kicker">Billing reimagined</div>
          <h1 className="mt-6 max-w-3xl text-6xl font-semibold tracking-tight">
            Run invoices, customers, and payments from a sharper modern workspace.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            QuickBill brings your billing operations into one polished system built for speed, clarity, and daily business momentum.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              [Layers3, "Unified workflow", "Create invoices, review customer records, and manage products in one connected flow."],
              [ShieldCheck, "Secure access", "Keep business data tied to your account with synced login-based access."],
              [Sparkles, "Modern reporting", "See payments, GST, and revenue insights in a cleaner visual dashboard."],
            ].map(([Icon, title, copy]) => {
              const FeatureIcon = Icon as typeof FileText;
              return (
                <div key={title as string} className="rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur">
                  <FeatureIcon className="h-5 w-5 text-sky-300" />
                  <p className="mt-4 text-lg font-semibold">{title as string}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{copy as string}</p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="relative z-10 flex w-full max-w-md flex-col items-center space-y-8 rounded-[32px] border border-white/20 bg-white/92 p-6 sm:p-8 text-center shadow-[0_40px_120px_-45px_rgba(15,23,42,0.9)] backdrop-blur">
          <div className="flex flex-col items-center space-y-4">
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,_#0f172a,_#0369a1)] text-white shadow-lg">
              <FileText className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                QuickBill
              </h1>
              <p className="max-w-[320px] text-sm leading-6 text-slate-600">
                A new-generation invoicing workspace for businesses that want cleaner operations and faster billing.
              </p>
            </div>
          </div>

          <div className="w-full space-y-3">
          <Button
            asChild
            className="h-12 w-full rounded-2xl bg-slate-950 text-base font-semibold shadow-lg shadow-slate-950/20 hover:bg-slate-800"
          >
            <Link to="/login">
              Enter Workspace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-12 w-full rounded-2xl text-base">
            <Link to="/signup">Create an Account</Link>
          </Button>
        </div>

          <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-700/80">
            Fast. Clear. Professional.
          </p>
          <p className="text-xs text-slate-500">
            By continuing, you agree to our Terms of Service and Privacy
            Policy.
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
