import { formatInTimeZone } from "date-fns-tz";
import { DateTime } from "luxon";

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

  // --- Recurring ---
  if (event.date_type === "recurring") {
    const start = DateTime.fromISO(event.start_date_iso || event.start_date, {
      zone: "utc",
    }).setZone(tz);
    const end = event.end_real
      ? DateTime.fromISO(event.end_real, { zone: "utc" }).setZone(tz)
      : event.end_date_iso || event.end_date
      ? DateTime.fromISO(event.end_date_iso || event.end_date, {
          zone: "utc",
        }).setZone(tz)
      : null;

    const allDay = !!event.all_day;
    const isSameDay = end && start.hasSame(end, "day");

    if (isSameDay && !allDay) {
      const datePart = start.toFormat("d MMM yyyy");
      const startTime = start
        .toFormat(start.minute === 0 ? "ha" : "h:mma")
        .toLowerCase();
      const endTime = end
        .toFormat(end.minute === 0 ? "ha" : "h:mma")
        .toLowerCase();
      return `${datePart}, ${startTime} – ${endTime}`;
    }

    if (!end || isSameDay) {
      return start.toFormat("d MMM yyyy");
    }

    return `${start.toFormat("d MMM yyyy")} – ${end.toFormat("d MMM yyyy")}`;
  }

  // --- Standard / multi-day ---
  if (event.date_type === "standard" || event.date_type === "multi") {
    const start = DateTime.fromISO(event.start_date_iso || event.start_date, {
      zone: "utc",
    }).setZone(tz);
    const end = event.end_real
      ? DateTime.fromISO(event.end_real, { zone: "utc" }).setZone(tz)
      : event.end_date_iso || event.end_date
      ? DateTime.fromISO(event.end_date_iso || event.end_date, {
          zone: "utc",
        }).setZone(tz)
      : null;

    const allDay = !!event.all_day;
    const isSameDay = end && start.hasSame(end, "day");

    if (isSameDay && !allDay) {
      const datePart = start.toFormat("d MMM yyyy");
      const startTime = start
        .toFormat(start.minute === 0 ? "ha" : "h:mma")
        .toLowerCase();
      const endTime = end
        .toFormat(end.minute === 0 ? "ha" : "h:mma")
        .toLowerCase();
      return `${datePart}, ${startTime} – ${endTime}`;
    }

    if (!end) {
      return allDay
        ? start.toFormat("d MMM yyyy")
        : `${start.toFormat("d MMM yyyy, ")}${start
            .toFormat(start.minute === 0 ? "ha" : "h:mma")
            .toLowerCase()}`;
    }

    return `${start.toFormat("d MMM yyyy, ")}${start
      .toFormat(start.minute === 0 ? "ha" : "h:mma")
      .toLowerCase()} – ${end.toFormat("d MMM yyyy, ")}${end
      .toFormat(end.minute === 0 ? "ha" : "h:mma")
      .toLowerCase()}`;
  }

  return null;
}

/**
 * Build a human-readable event timeline in WP timezone.
 *
 * @param {Object} event Event object from API (UTC dates)
 * @param {string} wpTz  WP/site timezone string
 * @returns {string|null}
 */
export function buildTimeline(event, wpTz) {
  if (event.tbc) {
    return event.tbc_note || "Date and time to be confirmed";
  }

  const tz = normalizeTimeZone(wpTz || "UTC");

  // --- Recurring: replace only date part in existing timeline ---
  if (event.date_type === "recurring" && event.timeline) {
    const [datePart, ...rest] = event.timeline.split(" · ");
    const adjustedDate = DateTime.fromISO(event.start, { zone: "utc" })
      .setZone(tz)
      .toFormat("d MMM yyyy");
    return [adjustedDate, ...rest].join(" · ");
  }

  // --- Standard / multi-day: build fully in JS ---
  if (event.date_type === "standard" || event.date_type === "multi") {
    const start = DateTime.fromISO(event.start, { zone: "utc" }).setZone(tz);
    const end = event.end
      ? DateTime.fromISO(event.end, { zone: "utc" }).setZone(tz)
      : null;
    const allDay = !!event.allDay;
    const isSameDay = end && start.hasSame(end, "day");

    if (isSameDay && !allDay) {
      const datePart = start.toFormat("d MMM yyyy");
      const startTime = start
        .toFormat(start.minute === 0 ? "ha" : "h:mma")
        .toLowerCase();
      const endTime = end
        .toFormat(end.minute === 0 ? "ha" : "h:mma")
        .toLowerCase();
      return `${datePart}, ${startTime} – ${endTime}`;
    }

    if (!end || isSameDay) {
      return start.toFormat("d MMM yyyy");
    }

    return `${start.toFormat("d MMM yyyy")} – ${end.toFormat("d MMM yyyy")}`;
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

  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
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

export function ensureUtcZ(value) {
  if (!value) return value;
  // Already has Z or an explicit offset
  if (/[+-]\d\d:\d\d|Z$/.test(value)) return value;
  // Append Z to mark it as UTC
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

  // ✅ Force UTC for date
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  if (isAllDay) {
    return dateStr;
  }

  // ✅ Force UTC for time
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
