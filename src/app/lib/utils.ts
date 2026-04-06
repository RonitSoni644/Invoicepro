// Utility functions for the invoice system

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const validateGSTIN = (gstin: string): boolean => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};

export const calculateGST = (
  subtotal: number,
  gstRate: number,
  isSameState: boolean = true
): { cgst: number; sgst: number; igst: number } => {
  const gstAmount = (subtotal * gstRate) / 100;
  
  if (isSameState) {
    return {
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      igst: 0
    };
  } else {
    return {
      cgst: 0,
      sgst: 0,
      igst: gstAmount
    };
  }
};
