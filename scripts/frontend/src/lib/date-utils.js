import { DateTime } from "luxon";

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

export function normalizeTimeZone(tz) {
  if (tz === "local") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  if (tz === "utc") {
    return "UTC";
  }
  if (!isNaN(parseFloat(tz)) && isFinite(tz)) {
    const offset = parseFloat(tz);
    // Flip the sign to match IANA's backwards convention
    const sign = offset >= 0 ? "-" : "+";
    return `Etc/GMT${sign}${Math.abs(offset)}`;
  }
  return tz;
}

export function formatTimeCompact(
  date,
  timeZone = "local",
  locale = undefined
) {
  const tz = normalizeTimeZone(timeZone);

  let str = date
    .toLocaleTimeString(locale || undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    })
    .toLowerCase();

  str = str.replace(/\s*(am|pm)/, "$1"); // remove space before am/pm
  str = str.replace(/:00(am|pm)/, "$1"); // remove :00 if minutes are zero

  return str;
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

export function safeNormalizeTimeZone(tz) {
  if (!tz) return "UTC";
  const normalized = normalizeTimeZone(tz);
  return DateTime.now().setZone(normalized).isValid ? normalized : "UTC";
}

/**
 * Build the initial calendar date for FullCalendar.
 *
 * @param {Object} options
 * @param {"block"|"calendar"} options.context Source type
 * @param {string} [options.defaultMonth] Block-level default month (name)
 * @param {string|number} [options.defaultYear] Block-level default year
 * @param {Object} [options.calendar] Calendar object (default_month, default_year)
 * @returns {string} ISO date string (YYYY-MM-DD) in UTC, safe for FullCalendar
 */
export function getInitialCalendarDate({
  context,
  defaultMonth,
  defaultYear,
  calendar,
}) {
  const now = DateTime.utc(); // use UTC baseline, not local tz

  const safeParseYear = (value, fallback) => {
    const num = parseInt(value, 10);
    return Number.isFinite(num) ? num : fallback;
  };

  const monthNameToNumber = (month) => {
    const months = {
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
    return months[month?.toLowerCase()] || null;
  };

  // -- Block context
  if (context === "block") {
    const monthNum = monthNameToNumber(defaultMonth);
    const yearNum =
      defaultYear && defaultYear !== ""
        ? safeParseYear(defaultYear, now.year)
        : now.year;

    if (monthNum) {
      return DateTime.utc(yearNum, monthNum, 1).toISODate();
    }
    if (yearNum !== now.year) {
      return DateTime.utc(yearNum, now.month, 1).toISODate();
    }
    // default → first day of current month in UTC
    return DateTime.utc(now.year, now.month, 1).toISODate();
  }

  // -- Calendar context (API object)
  const monthNum = monthNameToNumber(calendar?.default_month);
  const yearNum =
    calendar?.default_year && calendar.default_year !== ""
      ? safeParseYear(calendar.default_year, now.year)
      : now.year;

  if (monthNum) {
    return DateTime.utc(yearNum, monthNum, 1).toISODate();
  }
  if (calendar?.default_year && yearNum !== now.year) {
    return DateTime.utc(yearNum, now.month, 1).toISODate();
  }

  // default → first day of current month in UTC
  return DateTime.utc(now.year, now.month, 1).toISODate();
}
