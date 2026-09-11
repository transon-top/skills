export interface PriceOptions {
  currency: string;
  locale: string;
  withSymbol: boolean;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  JPY: "¥",
  CNY: "¥",
};

export function formatPrice(cents: number, options?: Partial<PriceOptions>): string {
  const currency = options?.currency ?? "USD";
  const locale = options?.locale ?? "en-US";
  const withSymbol = options?.withSymbol ?? true;

  const units = Math.floor(cents / 100);
  const fraction = Math.abs(cents % 100);

  const grouped = units.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const padded = fraction.toString().padStart(2, "0");

  if (withSymbol) {
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
    return `${symbol}${grouped}.${padded}`;
  }

  return `${grouped}.${padded} ${currency}`;
}
