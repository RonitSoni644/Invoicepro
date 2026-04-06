import {
  getBusiness,
  getCustomer,
  getCustomers,
  getInvoice,
  getInvoices,
  getNextInvoiceNumber,
  getPayments,
  getPaymentsByInvoice,
  getProduct,
  getProducts,
} from "./store";
import type { Business, Customer, Invoice, Payment, Product } from "./store";

type CsvValue = string | number | boolean | null | undefined;
type ExportUser = {
  name: string;
  email: string;
  phone: string;
};

type ExportFile = {
  filename: string;
  rows: CsvValue[][];
};

const EMPTY_EXPORT_USER: ExportUser = {
  name: "",
  email: "",
  phone: "",
};

export const getExportUser = (user: any): ExportUser => ({
  name:
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.name ||
    "",
  email: user?.email || "",
  phone:
    user?.user_metadata?.phone ||
    user?.user_metadata?.phone_number ||
    user?.phone ||
    "",
});

const formatDate = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN");
};

const escapeCsvValue = (value: CsvValue) => {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);
  const escapedValue = stringValue.replace(/"/g, '""');
  return `"${escapedValue}"`;
};

const createCsvContent = (rows: CsvValue[][]) =>
  rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");

export const downloadCsv = (filename: string, rows: CsvValue[][]) => {
  const csv = createCsvContent(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
};

export const exportMultipleCsvFiles = (files: ExportFile[]) => {
  files.forEach((file, index) => {
    window.setTimeout(() => {
      downloadCsv(file.filename, file.rows);
    }, index * 150);
  });
};

export const getExportDateSuffix = () =>
  new Date().toISOString().split("T")[0];

export const createInvoicesCsvRows = (invoices: Invoice[]) => {
  return [
    [
      "Invoice Number",
      "Invoice Date",
      "Due Date",
      "Customer Name",
      "Customer Phone",
      "Customer GSTIN",
      "Items",
      "Subtotal",
      "CGST",
      "SGST",
      "IGST",
      "Total",
      "Paid Amount",
      "Balance Due",
      "Status",
      "Notes",
    ],
    ...invoices.map((invoice) => [
      invoice.invoiceNumber,
      formatDate(invoice.date),
      formatDate(invoice.dueDate),
      invoice.customerName,
      invoice.customerPhone,
      invoice.customerGSTIN || "",
      invoice.items
        .map(
          (item) =>
            `${item.productName} x${item.quantity} @ ${item.price} (GST ${item.gstRate}%)`,
        )
        .join(" | "),
      invoice.subtotal,
      invoice.cgst,
      invoice.sgst,
      invoice.igst,
      invoice.total,
      invoice.paidAmount,
      invoice.total - invoice.paidAmount,
      invoice.status,
      invoice.notes || "",
    ]),
  ];
};

export const createInvoiceItemsCsvRows = (invoices: Invoice[]) => [
  [
    "Invoice Number",
    "Invoice Date",
    "Customer Name",
    "Product / Service",
    "Quantity",
    "Unit Price",
    "GST Rate",
    "Line Amount",
  ],
  ...invoices.flatMap((invoice) =>
    invoice.items.map((item) => [
      invoice.invoiceNumber,
      formatDate(invoice.date),
      invoice.customerName,
      item.productName,
      item.quantity,
      item.price,
      item.gstRate,
      item.amount,
    ]),
  ),
];

export const createCustomersCsvRows = (
  customers: Customer[],
  invoices: Invoice[],
) => [
  [
    "Customer Name",
    "Phone",
    "Email",
    "GSTIN",
    "Address",
    "City",
    "State",
    "Total Invoices",
    "Total Business",
  ],
  ...customers.map((customer) => {
    const customerInvoices = invoices.filter((inv) => inv.customerId === customer.id);
    const totalBusiness = customerInvoices.reduce((sum, inv) => sum + inv.total, 0);

    return [
      customer.name,
      customer.phone,
      customer.email || "",
      customer.gstin || "",
      customer.address || "",
      customer.city || "",
      customer.state || "",
      customerInvoices.length,
      totalBusiness,
    ];
  }),
];

export const createProductsCsvRows = (products: Product[]) => [
  [
    "Product / Service",
    "Description",
    "Price",
    "GST Rate",
    "Stock",
    "Stock Status",
  ],
  ...products.map((product) => [
    product.name,
    product.description || "",
    product.price,
    `${product.gstRate}%`,
    product.stock ?? "",
    product.stock === undefined
      ? "Not tracked"
      : product.stock > 10
        ? "In stock"
        : product.stock > 0
          ? "Low stock"
          : "Out of stock",
  ]),
];

export const createPaymentsCsvRows = (
  payments: Payment[],
  invoices: Invoice[],
) => [
  [
    "Payment Date",
    "Invoice Number",
    "Customer Name",
    "Method",
    "Amount",
    "Notes",
  ],
  ...payments.map((payment) => {
    const invoice = invoices.find((inv) => inv.id === payment.invoiceId);

    return [
      formatDate(payment.date),
      invoice?.invoiceNumber || payment.invoiceId,
      invoice?.customerName || "",
      payment.method,
      payment.amount,
      payment.notes || "",
    ];
  }),
];

export const createSettingsCsvRows = (business: Business) => [
  [
    "Business Name",
    "GSTIN",
    "Address",
    "City",
    "State",
    "Phone",
    "Email",
    "Terms & Conditions",
    "Other Info",
    "Has Signature",
    "Has UPI QR",
  ],
  [
    business.name,
    business.gstin,
    business.address,
    business.city,
    business.state,
    business.phone,
    business.email,
    business.terms || "",
    business.extraInfo || "",
    business.signatureUrl ? "Yes" : "No",
    business.upiQrUrl ? "Yes" : "No",
  ],
];

type DashboardExportInput = {
  business: Business;
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  payments: Payment[];
  exportedBy?: ExportUser;
};

export const exportDashboardData = ({
  business,
  customers,
  products,
  invoices,
  payments,
  exportedBy = EMPTY_EXPORT_USER,
}: DashboardExportInput) => {
  const dateSuffix = getExportDateSuffix();
  const totalSales = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const totalPaid = invoices.reduce(
    (sum, invoice) => sum + invoice.paidAmount,
    0,
  );
  const totalPending = totalSales - totalPaid;

  exportMultipleCsvFiles([
    {
      filename: `dashboard-summary-${dateSuffix}.csv`,
      rows: [
        ["Dashboard Summary"],
        ["Export Date", formatDate(new Date().toISOString())],
        [""],
        ["Exported By Name", exportedBy.name],
        ["Exported By Email", exportedBy.email],
        ["Exported By Phone", exportedBy.phone],
        [""],
        ["Business Name", business.name],
        ["Total Customers", customers.length],
        ["Total Products", products.length],
        ["Total Invoices", invoices.length],
        ["Total Payments", payments.length],
        ["Total Sales", totalSales],
        ["Total Paid", totalPaid],
        ["Pending Amount", totalPending],
      ],
    },
    {
      filename: `customers-${dateSuffix}.csv`,
      rows: createCustomersCsvRows(customers, invoices),
    },
    {
      filename: `products-${dateSuffix}.csv`,
      rows: createProductsCsvRows(products),
    },
    {
      filename: `invoices-${dateSuffix}.csv`,
      rows: createInvoicesCsvRows(invoices),
    },
    {
      filename: `invoice-items-${dateSuffix}.csv`,
      rows: createInvoiceItemsCsvRows(invoices),
    },
    {
      filename: `payments-${dateSuffix}.csv`,
      rows: createPaymentsCsvRows(payments, invoices),
    },
    {
      filename: `settings-${dateSuffix}.csv`,
      rows: createSettingsCsvRows(business),
    },
    {
      filename: `user-profile-${dateSuffix}.csv`,
      rows: [
        ["Name", "Email", "Phone"],
        [exportedBy.name, exportedBy.email, exportedBy.phone],
      ],
    },
  ]);
};

const getJsonDateSuffix = () => new Date().toISOString().slice(0, 10);

const sanitizeFileName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const downloadJson = (filename: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
};

const buildSummaryPayload = async () => {
  const [invoices, customers, payments] = await Promise.all([
    getInvoices(),
    getCustomers(),
    getPayments(),
  ]);
  const totalSales = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const totalPaid = invoices.reduce(
    (sum, invoice) => sum + invoice.paidAmount,
    0,
  );

  return {
    totals: {
      invoices: invoices.length,
      customers: customers.length,
      payments: payments.length,
      totalSales,
      totalPaid,
      pendingAmount: totalSales - totalPaid,
    },
    recentInvoices: invoices.slice(0, 5),
  };
};

export const exportPageData = async (pathname: string, user?: any) => {
  const exportedAt = new Date().toISOString();
  const segments = pathname.split("/").filter(Boolean);
  const exportedBy = getExportUser(user);

  let fileBase = "billbook-export";
  let page = "Export";
  let data: unknown;

  const [business, invoices, customers, products, payments] = await Promise.all([
    getBusiness(),
    getInvoices(),
    getCustomers(),
    getProducts(),
    getPayments(),
  ]);

  data = {
    business,
    invoices,
    customers,
    products,
    payments,
  };

  if (pathname === "/") {
    fileBase = "dashboard-summary";
    page = "Dashboard";
    data = await buildSummaryPayload();
  } else if (pathname === "/invoices") {
    fileBase = "invoices";
    page = "Invoices";
    data = {
      invoices,
      summary: (await buildSummaryPayload()).totals,
    };
  } else if (pathname === "/customers") {
    fileBase = "customers";
    page = "Customers";
    data = {
      customers: customers.map((customer) => {
        const customerInvoices = invoices.filter(
          (invoice) => invoice.customerId === customer.id,
        );

        return {
          ...customer,
          totalInvoices: customerInvoices.length,
          totalSpent: customerInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
        };
      }),
    };
  } else if (pathname === "/products") {
    fileBase = "products";
    page = "Products";
    data = {
      products,
    };
  } else if (pathname === "/analysis") {
    fileBase = "payments";
    page = "Payments";
    data = {
      payments: payments.map((payment) => ({
        ...payment,
        invoiceNumber:
          invoices.find((invoice) => invoice.id === payment.invoiceId)
            ?.invoiceNumber || null,
      })),
      summary: {
        totalPayments: payments.length,
        totalAmount: payments.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        ),
      },
    };
  } else if (pathname === "/reports") {
    fileBase = "reports";
    page = "Reports";
    const totalSales = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const totalPaid = invoices.reduce(
      (sum, invoice) => sum + invoice.paidAmount,
      0,
    );
    data = {
      summary: {
        totalSales,
        totalPaid,
        totalPending: totalSales - totalPaid,
        totalGST: invoices.reduce(
          (sum, invoice) => sum + invoice.cgst + invoice.sgst + invoice.igst,
          0,
        ),
        avgInvoiceValue: invoices.length ? totalSales / invoices.length : 0,
      },
      invoices,
      customers,
    };
  } else if (pathname === "/settings") {
    fileBase = "business-settings";
    page = "Settings";
    data = {
      business,
    };
  } else if (segments[0] === "invoices" && segments[1] === "new") {
    fileBase = "invoice-form-template";
    page = "New Invoice";
    data = {
      nextInvoiceNumber: await getNextInvoiceNumber(),
      customers,
      products,
      business,
    };
  } else if (
    segments[0] === "invoices" &&
    segments[1] &&
    segments[2] === "edit"
  ) {
    const invoice = await getInvoice(segments[1]);
    fileBase = invoice?.invoiceNumber || "invoice-edit";
    page = "Edit Invoice";
    data = {
      invoice,
      customer: invoice ? await getCustomer(invoice.customerId) : null,
      products,
      business,
    };
  } else if (segments[0] === "invoices" && segments[1]) {
    const invoice = await getInvoice(segments[1]);
    fileBase = invoice?.invoiceNumber || "invoice";
    page = "Invoice Detail";
    data = {
      invoice,
      customer: invoice ? await getCustomer(invoice.customerId) : null,
      payments: invoice ? await getPaymentsByInvoice(invoice.id) : [],
      business,
      items:
        invoice
          ? await Promise.all(
              invoice.items.map(async (item) => ({
                ...item,
                product: item.productId ? await getProduct(item.productId) : null,
              })),
            )
          : [],
    };
  }

  downloadJson(
    `${sanitizeFileName(fileBase)}-${getJsonDateSuffix()}.json`,
    {
      page,
      exportedAt,
      exportedBy,
      data,
    },
  );
};
