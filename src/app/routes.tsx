import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

const Customers = lazy(() =>
  import("./pages/Customers").then((module) => ({ default: module.Customers })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })),
);
const InvoiceForm = lazy(() =>
  import("./pages/InvoiceForm").then((module) => ({ default: module.InvoiceForm })),
);
const Invoices = lazy(() =>
  import("./pages/Invoices").then((module) => ({ default: module.Invoices })),
);
const InvoiceView = lazy(() =>
  import("./pages/InvoiceView").then((module) => ({ default: module.InvoiceView })),
);
const Login = lazy(() =>
  import("./pages/Login").then((module) => ({ default: module.Login })),
);
const PaymentAnalysis = lazy(() =>
  import("./pages/PaymentAnalysis").then((module) => ({ default: module.PaymentAnalysis })),
);
const Products = lazy(() =>
  import("./pages/Products").then((module) => ({ default: module.Products })),
);
const Reports = lazy(() =>
  import("./pages/Reports").then((module) => ({ default: module.Reports })),
);
const Settings = lazy(() =>
  import("./pages/Settings").then((module) => ({ default: module.Settings })),
);
const Signup = lazy(() =>
  import("./pages/Signup").then((module) => ({ default: module.Signup })),
);
const WelcomePage = lazy(() =>
  import("./pages/WelcomePage").then((module) => ({ default: module.WelcomePage })),
);

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/",
    element: <WelcomePage />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Layout>
          <Dashboard />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/invoices",
    element: (
      <ProtectedRoute>
        <Layout>
          <Invoices />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/invoices/new",
    element: (
      <ProtectedRoute>
        <Layout>
          <InvoiceForm />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/invoices/:id",
    element: (
      <ProtectedRoute>
        <Layout>
          <InvoiceView />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/invoices/:id/edit",
    element: (
      <ProtectedRoute>
        <Layout>
          <InvoiceForm />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/customers",
    element: (
      <ProtectedRoute>
        <Layout>
          <Customers />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/products",
    element: (
      <ProtectedRoute>
        <Layout>
          <Products />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/analysis",
    element: (
      <ProtectedRoute>
        <Layout>
          <PaymentAnalysis />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/reports",
    element: (
      <ProtectedRoute>
        <Layout>
          <Reports />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <Layout>
          <Settings />
        </Layout>
      </ProtectedRoute>
    ),
  },
]);
