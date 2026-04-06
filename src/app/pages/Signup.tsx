import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { AlertCircle, CheckCircle, Lock, Mail, Phone, ShieldCheck, User, UserPlus } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../lib/auth-context";

export function Signup() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const normalizedPhone = phone.trim();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!normalizedName) {
      setError("Please enter your full name");
      return;
    }

    if (!normalizedPhone) {
      setError("Please enter your phone number");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(normalizedEmail, password, normalizedName, normalizedPhone);

      if (result.requiresEmailConfirmation) {
        setSuccessMessage(
          'Account created successfully. Check your email, confirm your account, then sign in.',
        );
        setPassword('');
        setConfirmPassword('');
        return;
      }

      navigate("/dashboard");
    } catch (err: any) {
      if (err?.message === 'Email not confirmed') {
        setSuccessMessage(
          'Account created successfully. Check your email, confirm your account, then sign in.',
        );
      } else {
        setError(err.message || "Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.18),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.2),_transparent_28%),linear-gradient(160deg,_#082f49_0%,_#0f172a_42%,_#fff7ed_100%)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="order-2 hidden rounded-[36px] border border-white/10 bg-white/8 p-8 text-white shadow-[0_40px_120px_-50px_rgba(15,23,42,0.95)] backdrop-blur lg:block lg:order-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">
            <ShieldCheck className="h-4 w-4" />
            Supabase synced
          </div>
          <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-tight">
            Build your customer and invoice workspace in minutes.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-200">
            Create your account to manage customers, products, invoices, payment tracking, business profile details, and downloadable reports from one place.
          </p>
          <div className="mt-8 space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/30 p-5">
              <p className="text-lg font-semibold">Everything tied to your account</p>
              <p className="mt-2 text-sm text-slate-300">Invoices, customer records, products, services, and business settings stay scoped to your own login.</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-slate-950/30 p-5">
              <p className="text-lg font-semibold">Reports when you need them</p>
              <p className="mt-2 text-sm text-slate-300">Keep company information and billing activity organized so reports stay easy to review and export.</p>
            </div>
          </div>
        </section>

        <section className="order-1 w-full max-w-xl justify-self-center lg:order-2">
          <div className="rounded-[36px] border border-white/50 bg-white/95 p-6 shadow-[0_35px_120px_-45px_rgba(15,23,42,0.75)] backdrop-blur sm:p-8">
            <div className="mb-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,_#0f172a,_#ea580c)] text-white shadow-lg">
                <UserPlus className="h-8 w-8" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">Create Account</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Start managing invoices, customers, services, and company details today.
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-700">
                Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white"
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
              </div>

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
                    placeholder="At least 6 characters"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">
                Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full rounded-2xl py-6 text-base" disabled={loading}>
                {loading ? (
                  "Creating account..."
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-slate-950 transition hover:text-sky-700">
                Sign in
              </Link>
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <p>Your data is securely stored and scoped to your own account</p>
              </div>
            </div>
          </div>
        </section>

        <p className="order-3 text-center text-sm text-slate-200/90 lg:col-span-2">
          Invoice & Billing System for modern small businesses
        </p>
      </div>
    </div>
  );
}
