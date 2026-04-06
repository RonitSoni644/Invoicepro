// Utility to convert numbers to words (Indian system)
const a = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const b = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function numToWords(num: number): string {
  if (num === 0) return "Zero";
  if (num < 0) return "Minus " + numToWords(Math.abs(num));
  let str = "";
  if (Math.floor(num / 10000000) > 0) {
    str += numToWords(Math.floor(num / 10000000)) + " Crore ";
    num %= 10000000;
  }
  if (Math.floor(num / 100000) > 0) {
    str += numToWords(Math.floor(num / 100000)) + " Lakh ";
    num %= 100000;
  }
  if (Math.floor(num / 1000) > 0) {
    str += numToWords(Math.floor(num / 1000)) + " Thousand ";
    num %= 1000;
  }
  if (Math.floor(num / 100) > 0) {
    str += numToWords(Math.floor(num / 100)) + " Hundred ";
    num %= 100;
  }
  if (num > 0) {
    if (str !== "") str += "and ";
    if (num < 20) str += a[num];
    else {
      str += b[Math.floor(num / 10)];
      if (num % 10 > 0) str += " " + a[num % 10];
    }
  }
  return str.trim();
}

export function convertNumberToWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = numToWords(rupees) + " Rupees";
  if (paise > 0) {
    words += " and " + numToWords(paise) + " Paise";
  }
  words += " Only";
  return words;
}
