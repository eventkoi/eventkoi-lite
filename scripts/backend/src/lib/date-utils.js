import { getSettings } from "@/hooks/SettingsContext";
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

  // Handle offset aliases like UTC+3 or UTC-05:30.
  const utcOffsetMatch = tz.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (utcOffsetMatch) {
    const sign = utcOffsetMatch[1];
    const hours = parseInt(utcOffsetMatch[2], 10);
    const mins = utcOffsetMatch[3] || "00";
    const label =
      mins === "00"
        ? `UTC${sign}${hours}`
        : `UTC${sign}${hours}:${mins.padStart(2, "0")}`;
    return appendSuffix(label);
  }

  // Handle normalized Etc/GMT±N
  if (tz.startsWith("Etc/GMT")) {
    const offset = tz.replace("Etc/GMT", "");
    const num = parseInt(offset, 10);
    if (!Number.isFinite(num)) {
      return appendSuffix("UTC");
    }
    let label =
      num === 0 ? "UTC" : `UTC${num > 0 ? "-" : "+"}${Math.abs(num)}`;
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
 * Build a human-readable event timeline in WP timezone for raw API data.
 *
 * Respects:
 * - EventKoi plugin time_format setting (12/24)
 * - WP date_format and time_format_string options
 * - WP/site timezone
 * - Locale normalization (de_DE → de-DE)
 *
 * @param {Object} event Event object from EventKoi API (UTC dates).
 * @param {string} wpTz  WP/site timezone string.
 * @returns {string|null}
 */
export function buildTimelineFromApi(event, wpTz) {
  if (event.tbc) {
    return event.tbc_note || "Date and time to be confirmed";
  }

  const params = typeof eventkoi_params !== "undefined" ? eventkoi_params : {};
  const settings = getSettings?.() || params.settings || {};
  const formatParams = { ...params, ...settings };
  const normalizeZone = (zone, fallback = "UTC") => {
    const normalized = normalizeTimeZone(zone || fallback);
    return DateTime.now().setZone(normalized).isValid ? normalized : fallback;
  };

  const tz = normalizeZone(wpTz || "UTC");
  const eventTz = normalizeZone(
    event?.all_day_timezone ||
      event?.allDayTimezone ||
      event?.timezone ||
      params?.timezone_string ||
      params?.timezone_override ||
      params?.timezone ||
      "UTC"
  );

  // Plugin 12/24-hour preference.
  const pluginTimePref = formatParams?.time_format || "12"; // "12" | "24"

  // WordPress date/time format settings.
  const wpDateFormat = formatParams?.date_format || "F j, Y";
  const wpTimeFormat =
    formatParams?.time_format_string ||
    (pluginTimePref === "24" ? "H:i" : "g:i a");

  // Convert to Luxon-compatible format strings.
  const luxonDateFormat = wpToLuxonFormat(wpDateFormat);
  const luxonTimeFormat = wpToLuxonFormat(wpTimeFormat);

  // Normalize WP locale (de_DE → de-DE).
  const normalizeLocale = (loc) => {
    if (!loc) {
      return "en";
    }
    return loc.replace("_", "-");
  };

  // Detect global locale from eventkoi_params.
  const lang =
    formatParams.locale
      ? normalizeLocale(formatParams.locale)
      : "en";

  const parseDateInZone = (iso, zone) => {
    if (!iso) {
      return null;
    }
    const value = String(iso);
    const dt = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? DateTime.fromISO(value, { zone })
      : DateTime.fromISO(value, { zone: "utc" }).setZone(zone);
    return dt.isValid ? dt : null;
  };
  const parseDate = (iso) => parseDateInZone(iso, tz);
  const parseEventDate = (iso) => parseDateInZone(iso, eventTz);

  const formatTime = (dt) => {
    if (!dt?.isValid) {
      return "";
    }

    let formatted = dt.toFormat(luxonTimeFormat);

    // Adjust AM/PM casing to match WP setting.
    if (wpTimeFormat.includes("A")) {
      formatted = formatted.replace(/\b(am|pm)\b/g, (m) => m.toUpperCase());
    } else if (wpTimeFormat.includes("a")) {
      formatted = formatted.replace(/\b(AM|PM)\b/g, (m) => m.toLowerCase());
    }

    return formatted;
  };

  // Format date using WP format.
  const formatDate = (dt) => (dt?.isValid ? dt.toFormat(luxonDateFormat) : "");

  // Combined formatter.
  const fmt = (dt, type = "datetime") => {
    if (!dt?.isValid) {
      return "";
    }
    if (type === "date") {
      return formatDate(dt);
    }
    if (type === "time") {
      return formatTime(dt);
    }
    return `${formatDate(dt)}, ${formatTime(dt)}`;
  };

  //
  // --- Recurring events ---
  //
  if (event.date_type === "recurring") {
    const allDay = !!event.all_day || isEventAllDay(event);
    const start = allDay
      ? parseEventDate(event.all_day_start_date || event.start_date_iso || event.start_date)
      : parseDate(event.start_date_iso || event.start_date);
    const end = allDay
      ? parseEventDate(event.all_day_end_date || event.end_real) ||
        parseEventDate(event.all_day_end_date || event.end_date_iso || event.end_date)
      : parseDate(event.end_real) ||
        parseDate(event.end_date_iso || event.end_date);

    if (!start) {
      return null;
    }

    const isSameDay = end && start.hasSame(end, "day");

    if (isSameDay && !allDay) {
      return `${fmt(start, "date")}, ${fmt(start, "time")} – ${fmt(
        end,
        "time"
      )}`;
    }

    if (!end || isSameDay) {
      return fmt(start, "date");
    }

    return `${fmt(start, "date")} – ${fmt(end, "date")}`;
  }

  //
  // --- Standard / multi-day events ---
  //
  if (event.date_type === "standard" || event.date_type === "multi") {
    if (
      event.standard_type === "selected" &&
      Array.isArray(event.event_days) &&
      event.event_days.length > 1
    ) {
      const selectedLines = event.event_days
        .map((day) => {
          const dayAllDay = isTruthy(day?.all_day);
          const start = dayAllDay
            ? parseEventDate(day?.all_day_start_date || day?.start_date)
            : parseDate(day?.start_date);
          const realEnd = dayAllDay
            ? parseEventDate(day?.all_day_end_date || day?.end_real)
            : parseDate(day?.end_real);
          const rawEnd = dayAllDay
            ? parseEventDate(day?.all_day_end_date || day?.end_date || day?.end)
            : parseDate(day?.end_date || day?.end);
          const end = realEnd || rawEnd;

          if (!start) {
            return "";
          }

          if (dayAllDay) {
            const displayEnd = getAllDayDisplayEnd(start, rawEnd, realEnd);
            if (!displayEnd || displayEnd.hasSame(start, "day")) {
              return fmt(start, "date");
            }

            return `${fmt(start, "date")} – ${fmt(displayEnd, "date")}`;
          }

          const isSameDay = end && start.hasSame(end, "day");

          if (isSameDay) {
            return `${fmt(start, "date")}, ${fmt(start, "time")} – ${fmt(
              end,
              "time"
            )}`;
          }

          if (!end) {
            return `${fmt(start, "date")}, ${fmt(start, "time")}`;
          }

          return `${fmt(start, "date")}, ${fmt(start, "time")} – ${fmt(
            end,
            "date"
          )}, ${fmt(end, "time")}`;
        })
        .filter(Boolean);

      if (selectedLines.length > 0) {
        return selectedLines.join("\n");
      }
    }

    const hasEndDate = !!(event.end_date || event.end_real);
    const allDay = !!event.all_day || isEventAllDay(event);
    const start = allDay
      ? parseEventDate(event.all_day_start_date || event.start_date_iso || event.start_date)
      : parseDate(event.start_date_iso || event.start_date);
    const end = hasEndDate
      ? allDay
        ? parseEventDate(event.all_day_end_date || event.end_real) ||
          parseEventDate(event.all_day_end_date || event.end_date_iso || event.end_date)
        : parseDate(event.end_real) ||
          parseDate(event.end_date_iso || event.end_date)
      : null;

    if (!start) {
      return null;
    }

    const isSameDay = end && start.hasSame(end, "day");

    if (isSameDay && !allDay) {
      return `${fmt(start, "date")}, ${fmt(start, "time")} – ${fmt(
        end,
        "time"
      )}`;
    }

    if (!end) {
      return allDay
        ? fmt(start, "date")
        : `${fmt(start, "date")}, ${fmt(start, "time")}`;
    }

    return `${fmt(start, "date")}, ${fmt(start, "time")} – ${fmt(
      end,
      "date"
    )}, ${fmt(end, "time")}`;
  }

  return null;
}

/**
 * Build a human-readable event timeline in WP timezone.
 *
 * Respects:
 * - WP date_format and time_format_string
 * - EventKoi plugin 12/24 preference
 * - WP/site timezone
 * - WP locale (de_DE → de-DE)
 *
 * @param {Object} event Event object from API (UTC dates).
 * @param {string} wpTz  WP/site timezone string.
 * @param {"12"|"24"} timeFormat Preferred time format from plugin settings.
 * @returns {string|null}
 */
export function buildTimeline(event, wpTz, timeFormat = "12") {
  if (event.tbc) {
    return event.tbc_note || "Date and time to be confirmed";
  }

  const params = typeof eventkoi_params !== "undefined" ? eventkoi_params : {};
  const settings = getSettings?.() || params.settings || {};
  const formatParams = { ...params, ...settings };
  const normalizeZone = (zone, fallback = "UTC") => {
    const normalized = normalizeTimeZone(zone || fallback);
    return DateTime.now().setZone(normalized).isValid ? normalized : fallback;
  };

  const tz = normalizeZone(wpTz || "UTC");
  const eventTz = normalizeZone(
    event?.timezone ||
      params?.timezone_string ||
      params?.timezone_override ||
      params?.timezone ||
      "UTC"
  );

  // Normalize WP locale (e.g. de_DE → de-DE).
  const normalizeLocale = (loc) => {
    if (!loc) {
      return "en";
    }
    return loc.replace("_", "-");
  };

  // Detect and normalize global locale from eventkoi_params.
  const lang =
    formatParams.locale
      ? normalizeLocale(formatParams.locale)
      : "en";

  // --- Format setup ---
  const wpDateFormat = formatParams?.date_format || "F j, Y";
  const wpTimeFormat =
    formatParams?.time_format_string ||
    ((formatParams?.time_format || timeFormat) === "24" ? "H:i" : "g:i a");
  const luxonDateFormat = wpToLuxonFormat(wpDateFormat);
  const luxonTimeFormat = wpToLuxonFormat(wpTimeFormat);

  // --- Helpers ---
  const parseDateInZone = (iso, zone) => {
    if (!iso) {
      return null;
    }
    const value = String(iso);
    const dt = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? DateTime.fromISO(value, { zone })
      : DateTime.fromISO(value, { zone: "utc" }).setZone(zone);
    return dt.isValid ? dt : null;
  };
  const parseDate = (iso) => parseDateInZone(iso, tz);
  const parseEventDate = (iso) => parseDateInZone(iso, eventTz);

  const formatTime = (dt) => {
    if (!dt?.isValid) {
      return "";
    }

    let formatted = dt.toFormat(luxonTimeFormat);

    // Adjust AM/PM casing to match WP format style.
    if (wpTimeFormat.includes("A")) {
      formatted = formatted.replace(/\b(am|pm)\b/g, (m) => m.toUpperCase());
    } else if (wpTimeFormat.includes("a")) {
      formatted = formatted.replace(/\b(AM|PM)\b/g, (m) => m.toLowerCase());
    }

    return formatted;
  };

  const formatDate = (dt) => (dt?.isValid ? dt.toFormat(luxonDateFormat) : "");

  const fmt = (dt, type = "datetime") => {
    if (!dt?.isValid) {
      return "";
    }
    if (type === "date") {
      return formatDate(dt);
    }
    if (type === "time") {
      return formatTime(dt);
    }
    return `${formatDate(dt)}, ${formatTime(dt)}`;
  };

  //
  // --- Recurring events ---
  //
  if (event.date_type === "recurring" && event.timeline) {
    const allDay = isEventAllDay(event);
    const start = allDay
      ? parseEventDate(event.all_day_start_date || event.start)
      : parseDate(event.start);
    const end = allDay
      ? parseEventDate(event.all_day_end_date || event.end_real) ||
        parseEventDate(event.all_day_end_date || event.end)
      : parseDate(event.end_real) || parseDate(event.end);
    if (!start) {
      return null;
    }

    const isSameDay = end && start.hasSame(end, "day");

    if (isSameDay && !allDay) {
      return `${fmt(start, "date")}, ${fmt(start, "time")} – ${fmt(
        end,
        "time"
      )}`;
    }

    if (!end || isSameDay) {
      return fmt(start, "date");
    }

    return `${fmt(start, "date")} – ${fmt(end, "date")}`;
  }

  //
  // --- Standard / multi-day events ---
  //
  if (event.date_type === "standard" || event.date_type === "multi") {
    if (
      event.standard_type === "selected" &&
      Array.isArray(event.event_days) &&
      event.event_days.length > 1
    ) {
      const selectedLines = event.event_days
        .map((day) => {
          const dayAllDay = isTruthy(day?.all_day);
          const start = dayAllDay
            ? parseEventDate(day?.all_day_start_date || day?.start_date)
            : parseDate(day?.start_date);
          const realEnd = dayAllDay
            ? parseEventDate(day?.all_day_end_date || day?.end_real)
            : parseDate(day?.end_real);
          const rawEnd = dayAllDay
            ? parseEventDate(day?.all_day_end_date || day?.end_date || day?.end)
            : parseDate(day?.end_date || day?.end);
          const end = realEnd || rawEnd;

          if (!start) {
            return "";
          }

          if (dayAllDay) {
            const displayEnd = getAllDayDisplayEnd(start, rawEnd, realEnd);
            if (!displayEnd || displayEnd.hasSame(start, "day")) {
              return fmt(start, "date");
            }

            return `${fmt(start, "date")} – ${fmt(displayEnd, "date")}`;
          }

          const isSameDay = end && start.hasSame(end, "day");

          if (isSameDay) {
            return `${fmt(start, "date")}, ${fmt(start, "time")} – ${fmt(
              end,
              "time"
            )}`;
          }

          if (!end) {
            return `${fmt(start, "date")}, ${fmt(start, "time")}`;
          }

          return `${fmt(start, "date")}, ${fmt(start, "time")} – ${fmt(
            end,
            "date"
          )}, ${fmt(end, "time")}`;
        })
        .filter(Boolean);

      if (selectedLines.length > 0) {
        return selectedLines.join("\n");
      }
    }

    const allDay = isEventAllDay(event);
    const start = allDay
      ? parseEventDate(event.all_day_start_date || event.start)
      : parseDate(event.start);
    const end = allDay
      ? parseEventDate(event.all_day_end_date || event.end_real) ||
        parseEventDate(event.all_day_end_date || event.end)
      : parseDate(event.end_real) || parseDate(event.end);
    if (!start) {
      return null;
    }

    const isSameDay = end && start.hasSame(end, "day");

    if (allDay) {
      if (!end || isSameDay) {
        return fmt(start, "date");
      }

      return `${fmt(start, "date")} – ${fmt(end, "date")}`;
    }

    if (isSameDay) {
      return `${fmt(start, "date")}, ${fmt(start, "time")} – ${fmt(
        end,
        "time"
      )}`;
    }

    if (!end) {
      return allDay
        ? fmt(start, "date")
        : `${fmt(start, "date")}, ${fmt(start, "time")}`;
    }

    if (event.end_all_day || event.endAllDay) {
      const allDayEnd = parseEventDate(event.end_real || event.end) || end;

      if (isSameDay) {
        return `${fmt(start, "date")}, ${fmt(start, "time")}`;
      }

      return `${fmt(start, "date")}, ${fmt(start, "time")} – ${fmt(
        allDayEnd,
        "date"
      )}`;
    }

    return `${fmt(start, "date")}, ${fmt(start, "time")} – ${fmt(
      end,
      "date"
    )}, ${fmt(end, "time")}`;
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
export function wpToLuxonFormat(phpFormat = "F j, Y") {
  const map = {
    Y: "yyyy",
    y: "yy",
    F: "LLLL",
    M: "LLL",
    m: "LL",
    n: "L",
    d: "dd",
    j: "d",
    D: "ccc",
    l: "cccc",
    g: "h",
    G: "H",
    h: "hh",
    H: "HH",
    i: "mm",
    s: "ss",
    a: "a",
    A: "a",
  };
  return phpFormat.replace(/(\\)?([A-Za-z])/g, (match, esc, char) => {
    if (esc) return char;
    return map[char] || char;
  });
}

function getAllDayDisplayEnd(start, end, realEnd = null) {
  if (realEnd?.isValid) {
    const durationMs = realEnd.toMillis() - start.toMillis();
    if (durationMs > 0 && durationMs <= 24 * 60 * 60 * 1000) {
      return start;
    }

    return realEnd;
  }

  if (!end?.isValid) {
    return null;
  }

  const durationMs = end.toMillis() - start.toMillis();
  if (durationMs > 0 && durationMs <= 24 * 60 * 60 * 1000) {
    return start;
  }

  if (end.hasSame(start, "day")) {
    return end;
  }

  const displayEnd = end.minus({ days: 1 });
  return displayEnd < start ? start : displayEnd;
}

function isTruthy(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function isEventAllDay(event) {
  const firstRule = Array.isArray(event?.recurrence_rules)
    ? event.recurrence_rules[0]
    : null;
  const firstDay = Array.isArray(event?.event_days) ? event.event_days[0] : null;

  return (
    isTruthy(event?.all_day) ||
    isTruthy(event?.allDay) ||
    isTruthy(firstRule?.all_day) ||
    isTruthy(firstDay?.all_day)
  );
}

export function formatWPtime(isoString, options = {}) {
  if (!isoString) return "";

  const params = typeof eventkoi_params !== "undefined" ? eventkoi_params : {};
  const settings = options.settings || getSettings?.() || params.settings || {};
  const wpLocale = (settings.locale || params.locale || "en").replace("_", "-");
  const tz = options.timezone || params.timezone_string || "UTC";
  const fmtType = options.format || "date-time";

  const wpDateFmt = settings.date_format || params.date_format || "F j, Y";
  const wpTimeFmt =
    settings.time_format_string || params.time_format_string || "g:i a";

  const dateFmt = wpToLuxonFormat(wpDateFmt);
  const timeFmt = wpToLuxonFormat(wpTimeFmt);

  let dt = DateTime.fromISO(isoString, { zone: "utc" });

  // Support SQL datetime values like "YYYY-MM-DD HH:mm:ss" from API payloads.
  if (!dt.isValid) {
    dt = DateTime.fromSQL(isoString, { zone: "utc" });
  }

  dt = dt.setZone(tz).setLocale(wpLocale);

  const isLowercaseAMPM = /(^|[^A-Za-z])a([^A-Za-z]|$)/.test(wpTimeFmt);
  const renderedDate = dt.toFormat(dateFmt);
  let renderedTime = dt.toFormat(timeFmt);

  if (isLowercaseAMPM) {
    renderedTime = renderedTime.replace(/\b(AM|PM)\b/g, (m) => m.toLowerCase());
  }

  switch (fmtType) {
    case "date":
      return renderedDate;
    case "time":
      return renderedTime;
    default:
      return `${renderedDate}\n${renderedTime}`;
  }
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

  const is24h = eventkoi_params?.time_format === "24";
  const timeStr = dt.toFormat(is24h ? "HH:mm" : "h:mm a");

  return `${dateStr}\n${timeStr}`;
}

export function formatShortDate(isoString, options = {}) {
  if (!isoString) return "";

  const params =
    typeof eventkoi_params !== "undefined" ? eventkoi_params : {};
  const settings = options.settings || getSettings?.() || params.settings || {};
  const wpLocale = (settings.locale || params.locale || "en").replace("_", "-");
  const tz = options.timezone || params.timezone_string || "UTC";
  const dateFormat = wpToLuxonFormat(
    settings.date_format || params.date_format || "F j, Y"
  );

  let dt = DateTime.fromISO(isoString, { zone: "utc" });

  if (!dt.isValid) {
    dt = DateTime.fromSQL(isoString, { zone: "utc" });
  }

  dt = dt.setZone(tz).setLocale(wpLocale);

  return dt.isValid ? dt.toFormat(dateFormat) : "";
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
 * Anchor a recurrence "ends_on" value to end-of-day in the event timezone so
 * the user-picked calendar date is inclusive. Mirrors PHP eventkoi_recurrence_until().
 * UI values are saved as UTC ISO instants for the selected local midnight, so
 * explicit non-midnight instants are converted back to the event timezone
 * calendar day. Exact midnight ISO values keep their stored date for backward
 * compatibility.
 *
 * @param {string} endsOn Raw rule.ends_on value.
 * @param {string} zone   Event timezone (IANA name).
 * @returns {DateTime|null} Luxon DateTime at 23:59:59.999 in the event timezone, or null on bad input.
 */
export function recurrenceUntilWall(endsOn, zone) {
  const raw = String(endsOn || "").trim();
  const safeZone = normalizeTimeZone(zone);

  if (!raw) return null;

  const dateOnlyMatch = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
  const legacyMidnightIsoMatch = raw.match(
    /^(\d{4}-\d{2}-\d{2})T00:00(?::00(?:\.0+)?)?(?:Z|[+-]\d\d:\d\d)$/i
  );

  let datePart =
    dateOnlyMatch?.[1] || legacyMidnightIsoMatch?.[1] || null;

  if (!datePart && /(?:Z|[+-]\d\d:\d\d)$/i.test(raw)) {
    const instant = DateTime.fromISO(raw, { setZone: true }).setZone(safeZone);
    datePart = instant.isValid ? instant.toISODate() : null;
  }

  if (!datePart) {
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    datePart = m?.[1] || null;
  }

  if (!datePart) return null;

  const dt = DateTime.fromISO(datePart, { zone: safeZone }).endOf("day");
  return dt.isValid ? dt : null;
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
  const restoreDecodedTimezoneOffset = (value) => {
    const raw = String(value ?? "");

    if (/^\s+\d{1,2}(?::?\d{2})?$/.test(raw)) {
      return `+${raw.trim()}`;
    }

    if (/^UTC\s+\d{1,2}(?::?\d{2})?$/i.test(raw)) {
      return raw.replace(/^UTC\s+/i, "UTC+");
    }

    return raw.trim();
  };

  const normalizedInput = restoreDecodedTimezoneOffset(tz);

  if (!normalizedInput) return "UTC";

  if (normalizedInput === "local") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  if (normalizedInput.toLowerCase() === "utc") {
    return "UTC";
  }

  const normalizeOffset = (offset) => {
    const value = Number(offset);
    if (!Number.isFinite(value) || value === 0) {
      return "UTC";
    }

    const abs = Math.abs(value);
    let hours = Math.floor(abs);
    let minutes = Math.round((abs - hours) * 60);

    if (minutes === 60) {
      hours += 1;
      minutes = 0;
    }

    if (minutes === 0) {
      const sign = value >= 0 ? "-" : "+";
      return `Etc/GMT${sign}${hours}`;
    }

    const sign = value >= 0 ? "+" : "-";
    return `${sign}${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}`;
  };

  const normalizeSignedParts = (sign, hours, minutes = "0") => {
    const offset = Number(hours) + Number(minutes || 0) / 60;
    return normalizeOffset(sign === "-" ? -offset : offset);
  };

  const isoOffsetMatch = normalizedInput.match(
    /^([+-])(\d{1,2})(?::?(\d{2}))?$/
  );
  if (isoOffsetMatch) {
    return normalizeSignedParts(
      isoOffsetMatch[1],
      isoOffsetMatch[2],
      isoOffsetMatch[3]
    );
  }

  const utcIsoOffsetMatch = normalizedInput.match(
    /^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/i
  );
  if (utcIsoOffsetMatch) {
    return normalizeSignedParts(
      utcIsoOffsetMatch[1],
      utcIsoOffsetMatch[2],
      utcIsoOffsetMatch[3]
    );
  }

  // Handle UTC±offset formats from WP settings (e.g. "UTC+2", "UTC-3.5")
  const utcOffsetMatch = normalizedInput.match(/^UTC([+-]?\d+(\.\d+)?)$/i);
  if (utcOffsetMatch) {
    return normalizeOffset(utcOffsetMatch[1]);
  }

  // Handle pure numeric offsets (e.g. "3", "-2")
  if (!isNaN(parseFloat(normalizedInput)) && isFinite(normalizedInput)) {
    return normalizeOffset(normalizedInput);
  }

  // Assume it's already a valid IANA timezone
  return normalizedInput;
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

  const is24h = eventkoi_params?.time_format === "24";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: is24h ? "2-digit" : "numeric",
    minute: "2-digit",
    hour12: !is24h,
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

  const timePart = is24h
    ? `${parts.hour}:${parts.minute}`
    : `${parts.hour}:${parts.minute} ${parts.dayPeriod.toLowerCase()}`;

  return `${parts.year}-${parts.month}-${parts.day}\n${timePart}`;
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
  const is24h = eventkoi_params?.time_format === "24";
  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: is24h ? "2-digit" : "numeric",
    minute: "2-digit",
    hour12: !is24h,
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

  const params = typeof eventkoi_params !== "undefined" ? eventkoi_params : {};
  const settings = getSettings?.() || params.settings || {};
  const formatParams = { ...params, ...settings };
  const safeZone = normalizeTimeZone(timezone);
  const locale = (formatParams.locale || params.locale || "en").replace("_", "-");
  const timePreference = formatParams.time_format || "12";
  const wpDateFormat = formatParams.date_format || "F j, Y";
  const wpTimeFormat =
    formatParams.time_format_string ||
    (timePreference === "24" ? "H:i" : "g:i a");
  const dateFormat = wpToLuxonFormat(wpDateFormat);
  const timeFormat = wpToLuxonFormat(wpTimeFormat);

  const parseDate = (value) => {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      const dt = DateTime.fromJSDate(value, { zone: "utc" }).setZone(safeZone);
      return dt.isValid ? dt.setLocale(locale) : null;
    }

    const raw = String(value);
    let dt = DateTime.fromISO(raw, { zone: "utc" });

    if (!dt.isValid) {
      dt = DateTime.fromSQL(raw, { zone: "utc" });
    }

    dt = dt.setZone(safeZone);
    return dt.isValid ? dt.setLocale(locale) : null;
  };

  const formatTime = (dt) => {
    let formatted = dt.toFormat(timeFormat);

    if (wpTimeFormat.includes("A")) {
      formatted = formatted.replace(/\b(am|pm)\b/g, (m) => m.toUpperCase());
    } else if (wpTimeFormat.includes("a")) {
      formatted = formatted.replace(/\b(AM|PM)\b/g, (m) => m.toLowerCase());
    }

    return formatted;
  };

  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (!startDate) {
    return "";
  }

  const datePart = startDate.toFormat(dateFormat);
  const startTime = formatTime(startDate);
  const endTime = endDate ? formatTime(endDate) : null;

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

  // Week view always lands on the week containing today, regardless of
  // default month/year — matches the frontend so editor preview mirrors
  // what visitors actually see.
  if (attributes?.timeframe === "week") {
    return now.toISODate();
  }

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
