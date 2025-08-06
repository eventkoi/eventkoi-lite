import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { DateTime } from "luxon";

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
 * Converts a UTC ISO string into a Date object localized to the given time zone.
 */
export function getDateInTimezone(utcISOString, timeZone = "UTC") {
  if (!utcISOString || !timeZone) return null;
  const safeZone = normalizeTimezone(timeZone);
  const utcDate = new Date(utcISOString);
  // formatInTimeZone will give you a string like "2025-07-22T13:05:00"
  const isoLocal = formatInTimeZone(utcDate, safeZone, "yyyy-MM-dd'T'HH:mm:ss");
  return new Date(isoLocal);
}

/**
 * Converts a wall-time string in your site TZ back to a true UTC ISO.
 */
export function getUtcISOString(wallTimeStr, timezone) {
  const safeZone = normalizeTimezone(timezone);
  // fromZonedTime parses "YYYY-MM-DDTHH:mm" in that TZ and returns the correct UTC Date
  const utcDate = fromZonedTime(wallTimeStr, safeZone);
  return utcDate.toISOString();
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
export function normalizeTimezone(tz) {
  if (/^UTC([+-]\d{1,2})$/.test(tz)) {
    const offset = parseInt(tz.replace("UTC", ""), 10);
    const sign = offset <= 0 ? "+" : "-"; // Inverted sign
    return `Etc/GMT${sign}${Math.abs(offset)}`;
  }

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

  const safeZone = normalizeTimezone(timezone);
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
  timezone = "UTC",
  isAllDay = false
) {
  if (!isoString || typeof isoString !== "string") return "";

  const safeZone = normalizeTimezone(timezone);
  const date = new Date(isoString);

  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  if (isAllDay) {
    return dateStr;
  }

  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: safeZone,
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

  const safeZone = normalizeTimezone(timezone);

  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;

  const datePart = formatInTimeZone(startDate, safeZone, "MMM d, yyyy");
  const startTime = formatInTimeZone(startDate, safeZone, "h:mm a");
  const endTime = endDate
    ? formatInTimeZone(endDate, safeZone, "h:mm a")
    : null;

  return `${datePart}, ${startTime}${endTime ? ` – ${endTime}` : ""}`;
}
