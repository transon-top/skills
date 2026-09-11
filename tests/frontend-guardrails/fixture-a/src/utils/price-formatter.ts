export interface FormatterConfig {
  currency: string;
  locale: string;
  withSymbol: boolean;
}

const SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  JPY: "¥",
  CNY: "¥",
};

export function formatPrice(cents: number, config?: Partial<FormatterConfig>): string {
  const currency = config?.currency ?? "USD";
  const locale = config?.locale ?? "en-US";
  const withSymbol = config?.withSymbol ?? true;

  const units = Math.floor(cents / 100);
  const fraction = Math.abs(cents % 100);

  const grouped = units.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const padded = fraction.toString().padStart(2, "0");

  if (withSymbol) {
    const symbol = SYMBOLS[currency] ?? currency;
    return `${symbol}${grouped}.${padded}`;
  }

  return `${grouped}.${padded} ${currency}`;
}
