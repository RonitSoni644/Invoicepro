import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
  Settings,
  Menu,
  X,
  IndianRupee,
  LogOut,
  Download,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { clearCache } from "../lib/store";
import { exportPageData } from "../lib/export";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const userPhone =
    user?.user_metadata?.phone ||
    user?.user_metadata?.phone_number ||
    user?.phone ||
    "No phone number";

  const menuItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/invoices", icon: FileText, label: "Invoices" },
    { path: "/customers", icon: Users, label: "Customers" },
    { path: "/products", icon: Package, label: "Products" },
    { path: "/analysis", icon: IndianRupee, label: "Payments" },
    { path: "/reports", icon: BarChart3, label: "Reports" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const currentPage =
    menuItems.find((item) => isActive(item.path))?.label ??
    (location.pathname === "/" ? "Welcome" : "Workspace");

  const handleLogout = async () => {
    await signOut();
    clearCache();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleExport = async () => {
    try {
      await exportPageData(location.pathname, user);
      toast.success("Page data exported successfully");
    } catch (error) {
      console.error(error);
      toast.error("Unable to export page data");
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 border-r border-white/10 bg-[linear-gradient(180deg,rgba(9,18,33,0.96),rgba(15,23,42,0.92)_42%,rgba(8,47,73,0.92))] text-white shadow-2xl shadow-slate-950/40 backdrop-blur-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl from-sky-400 via-cyan-300 to-amber-300 text-white  shadow-sky-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide stroke-current lucide-file-text h-8 w-8"
              aria-hidden="true"
            >
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              <path d="M10 9H8" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">Invoice Hub</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">Next-gen billing</p>
          </div>
          </div>
          
        </div>

        <nav className="px-4 py-3">
          <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Navigation
          </p>
          <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`group flex min-h-[48px] items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all ${
                  active
                    ? "border-white/70 bg-white text-slate-950 shadow-lg shadow-slate-950/10"
                    : "border-white/8 bg-white/[0.03] text-slate-200 hover:border-white/15 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                    active
                      ? "bg-slate-100 text-sky-700"
                      : "bg-white/8 text-slate-200 group-hover:bg-white/12"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-sm font-medium tracking-tight">{item.label}</span>
              </Link>
            );
          })}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 px-4 py-1">
          <button
            onClick={handleLogout}
            className="flex min-h-[46px] w-full items-center gap-2.5 rounded-xl border border-white/10 px-3 py-2.5 text-slate-200 transition hover:border-red-400/30 hover:bg-red-500/12 hover:text-red-200"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8">
              <LogOut className="h-[18px] w-[18px]" />
            </span>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/65 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:bg-slate-50 lg:hidden"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Workspace
              </p>
              <p className="truncate text-xl font-semibold tracking-tight text-slate-950">
                {currentPage}
              </p>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-3 flex-wrap sm:flex-nowrap">
              <Button
                variant="outline"
                onClick={handleExport}
                className="w-full rounded-2xl border-slate-200 bg-white/90 sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <div className="hidden min-w-0 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-right shadow-sm sm:block ">
                <p className="text-center text-sm font-medium text-slate-900">
                  {user?.user_metadata?.name || "User"}
                </p>

                <p className="text-center truncate text-xs text-slate-500">{userPhone}</p>
                <p className="text-center truncate text-xs text-slate-500" >{user?.email}</p>
              </div>
             <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-sky-800 to-cyan-500 font-semibold text-white shadow-lg shadow-sky-900/20">
                {user?.user_metadata?.name?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  "U"}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
