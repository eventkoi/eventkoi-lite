import { formatTimezoneLabel } from "@/lib/date-utils";
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

// Commonly used timezones (curated list)
export const commonTimezones = [
  { value: "local", label: "Local Time" },
  { value: "UTC", label: "UTC" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "America/New_York", label: "America/New York" },
  { value: "Europe/London", label: "Europe/London" },
];

// Dynamically get all IANA timezones (browser must support it)
export function getAllTimezones() {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone").map((tz) => ({
      value: tz,
      label: tz,
    }));
  }
  return [];
}

// Combined list: common zones first, then the rest
export function getTimezoneList() {
  const allZones = getAllTimezones();
  return [
    ...commonTimezones,
    ...allZones.filter(
      (tz) => !commonTimezones.some((c) => c.value === tz.value)
    ),
  ];
}

export function groupTimezones() {
  // Figure out site default based on your priority
  const siteDefaultValue =
    eventkoi_params?.timezone_override || eventkoi_params?.timezone || "UTC";

  const siteDefault = {
    value: siteDefaultValue,
    label: `Site Default (${formatTimezoneLabel(
      siteDefaultValue,
      "24",
      false
    )})`,
  };

  // Browser-detected local timezone
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const popularZones = [
    siteDefault,
    { value: "local", label: `Local Time (${localTz})` },
    { value: "UTC", label: "UTC" },
  ];

  const allZones = getAllTimezones();

  // Remove duplicates so they don't appear again
  const filteredZones = allZones.filter(
    (tz) =>
      tz.value !== "UTC" &&
      tz.value !== "local" &&
      tz.value !== siteDefaultValue
  );

  // Group by first segment (continent/region)
  const grouped = filteredZones.reduce((acc, tz) => {
    const [region] = tz.value.split("/");
    if (!acc[region]) acc[region] = [];
    acc[region].push(tz);
    return acc;
  }, {});

  // Sort groups and items alphabetically for tidiness
  Object.keys(grouped).forEach((region) => {
    grouped[region].sort((a, b) => a.label.localeCompare(b.label));
  });

  const sortedGrouped = Object.fromEntries(
    Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  );

  // Popular group always first
  return {
    Popular: popularZones,
    ...sortedGrouped,
  };
}
