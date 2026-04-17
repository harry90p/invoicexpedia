export function formatCurrency(amount: number, currency: string = "PKR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

// Convert amount to words
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function convertNumberToWordsLessThanThousand(n: number): string {
  if (n === 0) {
    return "";
  }
  if (n < 20) {
    return ones[n];
  }
  if (n < 100) {
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
  }
  return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convertNumberToWordsLessThanThousand(n % 100) : "");
}

export function numberToWords(amount: number): string {
  if (amount === 0) {
    return "Zero";
  }

  const integerPart = Math.floor(amount);
  const fractionalPart = Math.round((amount - integerPart) * 100);

  let words = "";

  if (integerPart > 0) {
    if (integerPart < 1000) {
      words = convertNumberToWordsLessThanThousand(integerPart);
    } else if (integerPart < 1000000) {
      words = convertNumberToWordsLessThanThousand(Math.floor(integerPart / 1000)) + " Thousand" + (integerPart % 1000 !== 0 ? " " + convertNumberToWordsLessThanThousand(integerPart % 1000) : "");
    } else if (integerPart < 1000000000) {
      words = convertNumberToWordsLessThanThousand(Math.floor(integerPart / 1000000)) + " Million" + (integerPart % 1000000 !== 0 ? " " + numberToWords(integerPart % 1000000) : "");
    }
  }

  if (fractionalPart > 0) {
    words += (words ? " and " : "") + fractionalPart + "/100";
  }

  return words.trim();
}
