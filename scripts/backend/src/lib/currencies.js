const FALLBACK_CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "NZD",
  "JPY",
  "CNY",
  "HKD",
  "SGD",
  "INR",
  "AED",
  "SAR",
  "QAR",
  "KWD",
  "EGP",
  "MAD",
  "ZAR",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "TRY",
  "BRL",
  "MXN",
  "ARS",
  "CLP",
  "COP",
];

function safeCurrencyName(code) {
  try {
    if (typeof Intl.DisplayNames === "function") {
      const display = new Intl.DisplayNames(["en"], { type: "currency" });
      return display.of(code) || "";
    }
  } catch {
    // Ignore and fallback.
  }
  return "";
}

export function getCurrencyOptions() {
  const fromIntl =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("currency")
      : FALLBACK_CURRENCY_CODES;

  const normalized = Array.from(
    new Set(
      (Array.isArray(fromIntl) ? fromIntl : FALLBACK_CURRENCY_CODES).map((code) =>
        String(code || "").toUpperCase()
      )
    )
  )
    .filter((code) => /^[A-Z]{3}$/.test(code))
    .sort((a, b) => a.localeCompare(b));

  return normalized.map((code) => {
    const name = safeCurrencyName(code);
    return {
      code,
      label: name ? `${code} - ${name}` : code,
    };
  });
}

