import { getSettings } from "@/hooks/SettingsContext";
import { formatInTimeZone } from "date-fns-tz";
import { DateTime } from "luxon";

const monthMap = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

export function formatTimezoneLabel(tz, timeFormat = "24", withFormat = true) {
  if (!tz) return timeFormat === "12" ? "UTC, AM/PM" : "UTC, 24hr";

  const appendSuffix = (label) =>
    withFormat
      ? timeFormat === "12"
        ? `${label}, AM/PM`
        : `${label}, 24hr`
      : label;

  // Handle ISO-style offset like +02:00 or -0530
  const isoOffsetMatch = tz.match(/^([+-])(\d{2}):?(\d{2})$/);
  if (isoOffsetMatch) {
    const sign = isoOffsetMatch[1];
    const hours = parseInt(isoOffsetMatch[2], 10);
    const mins = parseInt(isoOffsetMatch[3], 10);
    let label =
      mins === 0
        ? `UTC${sign}${hours}`
        : `UTC${sign}${hours}:${mins.toString().padStart(2, "0")}`;
    return appendSuffix(label);
  }

  // Handle normalized Etc/GMT±N
  if (tz.startsWith("Etc/GMT")) {
    const offset = tz.replace("Etc/GMT", "");
    const num = parseInt(offset, 10);
    let label =
      num === 0 ? "UTC" : `UTC${num >= 0 ? "+" : "-"}${Math.abs(num)}`;
    return appendSuffix(label);
  }

  // Raw numeric like +3 or -2
  if (!isNaN(parseFloat(tz)) && isFinite(tz)) {
    const offset = parseFloat(tz);
    let label = offset === 0 ? "UTC" : `UTC${offset >= 0 ? "+" : ""}${offset}`;
    return appendSuffix(label);
  }

  // Browser local
  if (tz.toLowerCase() === "local") {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let offsetStr = DateTime.now().setZone(zone).toFormat("ZZ");
    offsetStr = offsetStr.replace(":00", "").replace(/^(\+|-)0/, "$1");
    let label = `${zone} (UTC${offsetStr})`;
    return appendSuffix(label);
  }

  // Explicit UTC
  if (tz.toUpperCase() === "UTC") {
    return appendSuffix("UTC");
  }

  // Assume IANA → append offset
  const dt = DateTime.now().setZone(tz);
  if (dt.isValid) {
    let offsetStr = dt.toFormat("ZZ");
    offsetStr = offsetStr.replace(":00", "").replace(/^(\+|-)0/, "$1");
    let label = `${tz} (UTC${offsetStr})`;
    return appendSuffix(label);
  }

  return appendSuffix(tz);
}

/**
 * Build a human-readable event timeline in WP timezone for raw API data,
 * using the same formatting rules as the frontend buildTimeline().
 *
 * @param {Object} event Event object from EventKoi API (UTC dates)
 * @param {string} wpTz  WP/site timezone string
 * @returns {string|null}
 */
export function buildTimelineFromApi(event, wpTz) {
  if (event.tbc) {
    return event.tbc_note || "Date and time to be confirmed";
  }

  const tz = normalizeTimeZone(wpTz || "UTC");
  const timeFormat = eventkoi_params?.time_format || "12"; // "12" | "24"

  // --- Helpers ---
  const formatTime = (dt) => {
    if (!dt?.isValid) return "";
    if (timeFormat === "24") return dt.toFormat("HH:mm");
    return dt
      .toFormat(dt.minute === 0 ? "ha" : "h:mma")
      .toLowerCase()
      .replace(":00", "");
  };

  const parseDate = (iso) => {
    if (!iso) return null;
    const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(tz);
    return dt.isValid ? dt : null;
  };

  // --- Recurring ---
  if (event.date_type === "recurring") {
    const start = parseDate(event.start_date_iso || event.start_date);
    const end =
      parseDate(event.end_real) ||
      parseDate(event.end_date_iso || event.end_date);

    if (!start) return null;

    const allDay = !!event.all_day;
    const isSameDay = end && start.hasSame(end, "day");

    if (isSameDay && !allDay) {
      return `${start.toFormat("d MMM yyyy")}, ${formatTime(
        start
      )} – ${formatTime(end)}`;
    }

    if (!end || isSameDay) {
      return start.toFormat("d MMM yyyy");
    }

    return `${start.toFormat("d MMM yyyy")} – ${end.toFormat("d MMM yyyy")}`;
  }

  // --- Standard / multi-day ---
  if (event.date_type === "standard" || event.date_type === "multi") {
    const start = parseDate(event.start_date_iso || event.start_date);
    const end =
      parseDate(event.end_real) ||
      parseDate(event.end_date_iso || event.end_date);

    if (!start) return null;

    const allDay = !!event.all_day;
    const isSameDay = end && start.hasSame(end, "day");

    if (isSameDay && !allDay) {
      return `${start.toFormat("d MMM yyyy")}, ${formatTime(
        start
      )} – ${formatTime(end)}`;
    }

    if (!end) {
      return allDay
        ? start.toFormat("d MMM yyyy")
        : `${start.toFormat("d MMM yyyy, ")}${formatTime(start)}`;
    }

    return `${start.toFormat("d MMM yyyy, ")}${formatTime(
      start
    )} – ${end.toFormat("d MMM yyyy, ")}${formatTime(end)}`;
  }

  return null;
}

/**
 * Build a human-readable event timeline in WP timezone.
 *
 * @param {Object} event Event object from API (UTC dates)
 * @param {string} wpTz  WP/site timezone string
 * @param {"12"|"24"} timeFormat Preferred time format
 * @returns {string|null}
 */
export function buildTimeline(event, wpTz, timeFormat = "12") {
  if (event.tbc) {
    return event.tbc_note || "Date and time to be confirmed";
  }

  const tz = normalizeTimeZone(wpTz || "UTC");

  // --- Helpers ---
  const formatTime = (dt) => {
    if (!dt?.isValid) return "";
    if (timeFormat === "24") return dt.toFormat("HH:mm");
    return dt
      .toFormat(dt.minute === 0 ? "ha" : "h:mma")
      .toLowerCase()
      .replace(":00", "");
  };

  const parseDate = (iso) => {
    if (!iso) return null;
    const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(tz);
    return dt.isValid ? dt : null;
  };

  // --- Recurring ---
  if (event.date_type === "recurring" && event.timeline) {
    const start = parseDate(event.start);
    const end = parseDate(event.end_real) || parseDate(event.end);

    if (!start) return null;

    const allDay = !!event.allDay;
    const isSameDay = end && start.hasSame(end, "day");

    if (isSameDay && !allDay) {
      return `${start.toFormat("d MMM yyyy")}, ${formatTime(
        start
      )} – ${formatTime(end)}`;
    }

    if (!end || isSameDay) {
      return start.toFormat("d MMM yyyy");
    }

    return `${start.toFormat("d MMM yyyy")} – ${end.toFormat("d MMM yyyy")}`;
  }

  // --- Standard / multi-day ---
  if (event.date_type === "standard" || event.date_type === "multi") {
    const start = parseDate(event.start);
    const end = parseDate(event.end_real) || parseDate(event.end);

    if (!start) return null;

    const allDay = !!event.allDay;
    const isSameDay = end && start.hasSame(end, "day");

    if (isSameDay && !allDay) {
      return `${start.toFormat("d MMM yyyy")}, ${formatTime(
        start
      )} – ${formatTime(end)}`;
    }

    if (!end) {
      return allDay
        ? start.toFormat("d MMM yyyy")
        : `${start.toFormat("d MMM yyyy, ")}${formatTime(start)}`;
    }

    return `${start.toFormat("d MMM yyyy, ")}${formatTime(
      start
    )} – ${end.toFormat("d MMM yyyy, ")}${formatTime(end)}`;
  }

  return null;
}

/**
 * Format a UTC ISO date string into the WordPress timezone date and/or time.
 *
 * @param {string} isoString UTC ISO date string (with Z).
 * @param {Object} [options] Optional formatting options.
 * @param {string} [options.format="date-time"] Either "date-time", "date", or "time".
 * @param {string} [options.timezone] IANA timezone name or offset. Defaults to eventkoi_params.timezone_string.
 * @returns {string} Formatted date/time string.
 */
export function formatWPtime(isoString, options = {}) {
  if (!isoString) {
    return "";
  }

  const { time_format } = getSettings() || {};

  // Pick timezone: explicit > WP > UTC.
  const rawTz =
    options.timezone ||
    (typeof eventkoi_params !== "undefined" &&
      eventkoi_params.timezone_string) ||
    "UTC";

  const tz = normalizeTimeZone(rawTz);
  const date = new Date(isoString);

  // Manually build YYYY-MM-DD in WP timezone.
  const datePart = date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  });

  const is24 = time_format === "24";

  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !is24,
    timeZone: tz,
  });

  if (options.format === "date") {
    return datePart;
  }

  if (options.format === "time") {
    return timePart;
  }

  return `${datePart}\n${timePart}`;
}

/**
 * Safely format a timestamp generated as local (no Z) without being shifted by JS Date().
 *
 * Use when `start_date` and `end_date` are generated in local time (e.g. Asia/Singapore)
 * and saved as `"yyyy-MM-dd'T'HH:mm:ss.SSS"` without timezone suffix.
 */
export function formatLocalTimestamp(
  isoString,
  timezone = "UTC",
  isAllDay = false
) {
  if (!isoString || typeof isoString !== "string") return "";

  const dt = DateTime.fromFormat(isoString, "yyyy-MM-dd'T'HH:mm:ss.SSS", {
    zone: timezone,
  });

  if (!dt.isValid) return "";

  const dateStr = dt.toFormat("yyyy-MM-dd");

  if (isAllDay) return dateStr;

  const timeStr = dt.toFormat("h:mm a");

  return `${dateStr}\n${timeStr}`;
}

/**
 * Shift a date + time combo (from UTC) into target timezone with compact format.
 * @param {string} dateString e.g. "2025-08-11"
 * @param {string} timeString e.g. "8am" or "8:30am"
 * @param {string} targetZone IANA timezone or "local"
 * @returns {string} formatted compact time
 */
export function shiftTime(dateString, timeString, targetZone = false, locale) {
  if (!dateString || !timeString) return "";

  // If no shifting wanted
  if (!targetZone || targetZone === false || targetZone === "utc") {
    return timeString
      .toLowerCase()
      .replace(/\s*(am|pm)/, "$1")
      .replace(/:00(am|pm)/, "$1");
  }

  const tz = normalizeTimeZone(targetZone);

  const match = timeString
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!match) return "";

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2] || "0", 10);
  const period = match[3];

  if (period === "pm" && hours < 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;

  // Build UTC date from the plain date portion
  const base = new Date(dateString);
  const utcDate = new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate(),
      hours,
      minutes
    )
  );

  return formatTimeCompact(utcDate, tz, locale);
}

export function ensureUtcZ(value) {
  if (!value) return undefined;

  // Already ISO with offset or Z
  if (/[+-]\d\d:\d\d|Z$/.test(value)) return value;

  // MySQL DATETIME "YYYY-MM-DD HH:mm:ss"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return value.replace(" ", "T") + "Z";
  }

  // Last resort, just append Z
  return value + "Z";
}

/**
 * Convert stored UTC ISO string to a JS Date in a target timezone (wpTz).
 * Auto-fixes strings missing 'Z' or offset by treating them as UTC.
 */
export function getDateInTimezone(isoString, tz = "UTC") {
  if (!isoString) return null;
  const targetTz = normalizeTimeZone(tz);

  let parsed;
  if (/[+-]\d\d:\d\d|Z$/.test(isoString)) {
    // String already has offset → parse in UTC
    parsed = DateTime.fromISO(isoString, { zone: "utc" });
  } else {
    parsed = DateTime.fromISO(isoString, { zone: targetTz });
  }

  return parsed.setZone(targetTz).toJSDate();
}

/**
 * Converts a wall-time string in your site TZ back to a true UTC ISO.
 */
export function getUtcISOString(wallTime, tz = "UTC") {
  if (!wallTime) return null;

  const targetTz = normalizeTimeZone(tz);

  return DateTime.fromISO(wallTime, { zone: targetTz })
    .setZone("utc")
    .toISO({ suppressMilliseconds: true });
}

/**
 * Weekday constants with key, short label, and full label.
 *
 * @type {Array<{ key: number, short: string, label: string }>}
 */
export const WEEKDAYS = [
  { key: 0, short: "Mo", label: "Monday" },
  { key: 1, short: "Tu", label: "Tuesday" },
  { key: 2, short: "We", label: "Wednesday" },
  { key: 3, short: "Th", label: "Thursday" },
  { key: 4, short: "Fr", label: "Friday" },
  { key: 5, short: "Sa", label: "Saturday" },
  { key: 6, short: "Su", label: "Sunday" },
];

/**
 * Converts offset-style timezones like 'UTC+5' to valid IANA format like 'Etc/GMT-5'.
 * Note: Sign is inverted for 'Etc/GMT±X' zone names.
 *
 * @param {string} tz Timezone string
 * @returns {string} Normalized IANA timezone string
 */
export function normalizeTimeZone(tz) {
  if (!tz) return "UTC";

  if (tz === "local") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  if (tz.toLowerCase() === "utc") {
    return "UTC";
  }

  // Handle UTC±offset formats from WP settings (e.g. "UTC+2", "UTC-3.5")
  const utcOffsetMatch = tz.match(/^UTC([+-]?\d+(\.\d+)?)$/i);
  if (utcOffsetMatch) {
    const offset = parseFloat(utcOffsetMatch[1]);
    // IANA Etc/GMT offsets are reversed: UTC+2 → Etc/GMT-2
    const sign = offset >= 0 ? "-" : "+";
    return `Etc/GMT${sign}${Math.abs(offset)}`;
  }

  // Handle pure numeric offsets (e.g. "3", "-2")
  if (!isNaN(parseFloat(tz)) && isFinite(tz)) {
    const offset = parseFloat(tz);
    const sign = offset >= 0 ? "-" : "+";
    return `Etc/GMT${sign}${Math.abs(offset)}`;
  }

  // Assume it's already a valid IANA timezone
  return tz;
}

/**
 * Returns weekdays reordered to start from the specified index.
 *
 * @param {number} startIndex Index to start from (0 = Monday).
 * @returns {Array<{ key: number, short: string, label: string }>} Ordered array of weekdays.
 */
export function getOrderedWeekdays(startIndex = 0) {
  return [...WEEKDAYS.slice(startIndex), ...WEEKDAYS.slice(0, startIndex)];
}

/**
 * Formats a UTC date string into local time in the given timezone.
 *
 * @param {string} isoString UTC date string (e.g., '2025-06-01T06:45:00Z')
 * @param {string} timezone IANA time zone (e.g., 'Asia/Singapore')
 * @param {object} options Optional settings, e.g. { dateOnly: true }
 * @returns {string} Formatted date string
 */
export function formatDateInTimezone(
  isoString,
  timezone = "UTC",
  options = {}
) {
  if (!isoString || typeof isoString !== "string") return "";

  const safeZone = normalizeTimeZone(timezone);
  const date = new Date(isoString);

  if (options.dateOnly) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: safeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}\n${parts.hour}:${
    parts.minute
  } ${parts.dayPeriod.toLowerCase()}`;
}

/**
 * Formats a date string as:
 * - `YYYY-MM-DD\nhh:mm AM/PM` for timed events
 * - `YYYY-MM-DD` for all-day events
 *
 * @param {string} isoString ISO date string
 * @param {string} timezone IANA timezone (e.g. 'Asia/Singapore')
 * @param {boolean} isAllDay Whether the event is all day
 * @returns {string}
 */
export function formatAdminDateCell(
  isoString,
  _timezone = "UTC", // ignore incoming timezone
  isAllDay = false
) {
  if (!isoString || typeof isoString !== "string") return "";

  const date = new Date(isoString);

  // Force UTC for date
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  if (isAllDay) {
    return dateStr;
  }

  // Force UTC for time
  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${dateStr}\n${timeStr}`;
}

/**
 * Formats a wall-time range using a given timezone.
 *
 * @param {Date|string} start Start Date (Date object or ISO string)
 * @param {Date|string} end End Date (Date object or ISO string)
 * @param {string} timezone IANA timezone (e.g. 'Asia/Singapore')
 * @returns {string}
 */
export function formatWallTimeRange(start, end, timezone = "UTC") {
  if (!start) return "";

  const safeZone = normalizeTimeZone(timezone);

  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;

  const datePart = formatInTimeZone(startDate, safeZone, "MMM d, yyyy");
  const startTime = formatInTimeZone(startDate, safeZone, "h:mm a");
  const endTime = endDate
    ? formatInTimeZone(endDate, safeZone, "h:mm a")
    : null;

  return `${datePart}, ${startTime}${endTime ? ` – ${endTime}` : ""}`;
}

export function safeNormalizeTimeZone(tz) {
  if (!tz) return "UTC";
  const normalized = normalizeTimeZone(tz);
  return DateTime.now().setZone(normalized).isValid ? normalized : "UTC";
}

/**
 * Build the initial calendar date for FullCalendar from block attributes.
 *
 * @param {Object} attributes Block attributes (with default_month, default_year).
 * @returns {string} ISO date string (YYYY-MM-DD) at UTC, safe for FullCalendar.
 */
export function getInitialDate(attributes) {
  const now = DateTime.utc();
  let year = now.year;
  let month = now.month;

  // Parse year
  if (attributes?.default_year && attributes.default_year !== "") {
    const parsed = parseInt(attributes.default_year, 10);
    if (!isNaN(parsed)) {
      year = parsed;
    }
  }

  // Parse month
  if (attributes?.default_month && attributes.default_month !== "") {
    month = monthMap[attributes.default_month.toLowerCase()] ?? now.month;
  }

  // Always return explicit first-of-month in UTC
  return DateTime.utc(year, month, 1).toISODate();
}

/**
 * Build the initial calendar date for FullCalendar.
 *
 * @param {Object} calendar Calendar object from API (has default_month, default_year).
 * @returns {string} ISO date string (YYYY-MM-DD) at UTC, safe for FullCalendar.
 */
export function getInitialCalendarDate(calendar) {
  const now = DateTime.utc();
  let year = now.year;
  let month = now.month;

  // Parse year
  if (
    calendar?.default_year &&
    calendar.default_year !== "" &&
    calendar.default_year !== "current"
  ) {
    const parsed = parseInt(calendar.default_year, 10);
    if (!isNaN(parsed)) {
      year = parsed;
    }
  }

  // Parse month
  if (
    calendar?.default_month &&
    calendar.default_month !== "" &&
    calendar.default_month !== "current"
  ) {
    month = monthMap[calendar.default_month.toLowerCase()] ?? now.month;
  }

  // Always return explicit first-of-month in UTC
  return DateTime.utc(year, month, 1).toISODate();
}
