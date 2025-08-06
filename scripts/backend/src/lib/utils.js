import { __ } from "@wordpress/i18n";
import { clsx } from "clsx";
import { formatInTimeZone } from "date-fns-tz";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getWordPressTimezone() {
  const offset = parseFloat(eventkoi_params?.timezone_offset / 3600) || 0;
  const tz = eventkoi_params?.timezone_string?.trim();
  return tz || `Etc/GMT${offset > 0 ? "+" : ""}${-offset}`;
}

export function formatTimezone(dateString, format = "yyyy-MM-dd hh:mm a") {
  const tz = getWordPressTimezone();
  return formatInTimeZone(dateString, tz, format);
}

export function formatCurrency(amount, currency = "usd") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `$${amount}`;
  }
}

export function getCountryName(code) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code);
  } catch {
    return code;
  }
}

export function getStatusLabel(status) {
  switch (status) {
    case "pending":
      return __("Pending payment", "eventkoi");
    case "complete":
      return __("Completed", "eventkoi");
    case "failed":
      return __("Payment failed", "eventkoi");
    case "refunded":
      return __("Refunded", "eventkoi");
    case "partially_refunded":
      return __("Partially refunded", "eventkoi");
    default:
      return status;
  }
}
