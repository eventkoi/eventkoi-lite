import { DateTime } from "luxon";

/**
 * Safely convert a WordPress/PHP date/time format to Luxon.
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

/**
 * Build a human-readable event timeline.
 *
 * Respects:
 * - WP date_format and time_format_string
 * - EventKoi plugin 12/24 preference
 * - Display timezone for timed events
 * - Event/site timezone for all-day date boundaries
 * - WP locale (de_DE → de-DE)
 */
export function buildTimeline(event, wpTz, timeFormat = "12") {
  if (event.tbc) {
    return event.tbc_note || "Date and time to be confirmed";
  }

  const params = typeof eventkoi_params !== "undefined" ? eventkoi_params : {};
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

  const normalizeLocale = (loc) => (loc ? loc.replace("_", "-") : "en");

  const lang =
    typeof eventkoi_params !== "undefined" && params.locale
      ? normalizeLocale(params.locale)
      : "en";

  const dateFormat = wpToLuxonFormat(params?.date_format || "F j, Y");
  const wpRawTimeFormat =
    params?.time_format_string || (timeFormat === "24" ? "H:i" : "g:i a");
  const wpTimeFormat = wpToLuxonFormat(wpRawTimeFormat);

  const parseDateInZone = (iso, zone) => {
    if (!iso) return null;

    const value = String(iso);
    const dt = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? DateTime.fromISO(value, { zone })
      : DateTime.fromISO(value, { zone: "utc" }).setZone(zone);

    return dt.isValid ? dt.setLocale(lang) : null;
  };

  const parseDate = (iso) => parseDateInZone(iso, tz);
  const parseEventDate = (iso) => parseDateInZone(iso, eventTz);
  const parseTimelineDate = (iso, allDay) => {
    const dt = allDay ? parseEventDate(iso) : parseDate(iso);
    return dt?.isValid ? dt : null;
  };

  const formatTime = (dt) => {
    if (!dt?.isValid) return "";

    let formatted = dt.toFormat(wpTimeFormat);

    if (wpRawTimeFormat.includes("A")) {
      formatted = formatted.replace(/\b(am|pm)\b/g, (m) => m.toUpperCase());
    } else if (wpRawTimeFormat.includes("a")) {
      formatted = formatted.replace(/\b(AM|PM)\b/g, (m) => m.toLowerCase());
    }

    return formatted;
  };

  const formatDate = (dt) => (dt?.isValid ? dt.toFormat(dateFormat) : "");

  const fmt = (dt, type = "datetime") => {
    if (!dt?.isValid) return "";
    if (type === "date") return formatDate(dt);
    if (type === "time") return formatTime(dt);
    return `${formatDate(dt)}, ${formatTime(dt)}`;
  };

  if (event.date_type === "recurring" && event.timeline) {
    const allDay = isEventAllDay(event);
    const start = parseTimelineDate(
      allDay ? event.all_day_start_date || event.start : event.start,
      allDay
    );
    const realEnd = parseTimelineDate(
      allDay ? event.all_day_end_date || event.end_real : event.end_real,
      allDay
    );
    const rawEnd = parseTimelineDate(
      allDay ? event.all_day_end_date || event.end : event.end,
      allDay
    );
    const end = realEnd || rawEnd;
    if (!start) return null;

    if (allDay) {
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

  if (event.date_type === "standard" || event.date_type === "multi") {
    if (
      event.standard_type === "selected" &&
      Array.isArray(event.event_days) &&
      event.event_days.length > 1
    ) {
      const selectedLines = event.event_days
        .map((day) => {
          const dayAllDay = isTruthy(day?.all_day);
          const start = parseTimelineDate(
            dayAllDay ? day?.all_day_start_date || day?.start_date : day?.start_date,
            dayAllDay
          );
          const realEnd = parseTimelineDate(
            dayAllDay ? day?.all_day_end_date || day?.end_real : day?.end_real,
            dayAllDay
          );
          const rawEnd = parseTimelineDate(
            dayAllDay
              ? day?.all_day_end_date || day?.end_date || day?.end
              : day?.end_date || day?.end,
            dayAllDay
          );
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
    const start = parseTimelineDate(
      allDay ? event.all_day_start_date || event.start : event.start,
      allDay
    );
    const realEnd = parseTimelineDate(
      allDay ? event.all_day_end_date || event.end_real : event.end_real,
      allDay
    );
    const rawEnd = parseTimelineDate(
      allDay ? event.all_day_end_date || event.end : event.end,
      allDay
    );
    const end = realEnd || rawEnd;
    if (!start) return null;

    if (allDay) {
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

  if (!normalizedInput) {
    return "UTC";
  }

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

  const utcOffsetMatch = normalizedInput.match(/^UTC([+-]?\d+(?:\.\d+)?)$/i);
  if (utcOffsetMatch) {
    return normalizeOffset(utcOffsetMatch[1]);
  }

  if (!isNaN(parseFloat(normalizedInput)) && isFinite(normalizedInput)) {
    return normalizeOffset(normalizedInput);
  }

  return normalizedInput;
}

export function formatTimeCompact(
  date,
  timeZone = "local",
  locale = undefined
) {
  const tz = normalizeTimeZone(timeZone);
  const use24h =
    typeof eventkoi_params !== "undefined" &&
    eventkoi_params?.time_format === "24";

  if (use24h) {
    return date.toLocaleTimeString(locale || undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    });
  }

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
  if (tz === "local") return "local";
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
 * @param {"month"|"week"} [options.timeframe] Active calendar timeframe
 * @returns {string} ISO date string (YYYY-MM-DD) in UTC, safe for FullCalendar
 */
export function getInitialCalendarDate({
  context,
  defaultMonth,
  defaultYear,
  calendar,
  timeframe,
}) {
  const now = DateTime.utc(); // use UTC baseline, not local tz

  // Week view always lands on the week containing today, regardless of
  // default month/year. Month view uses the default-month logic below.
  if (timeframe === "week") {
    return now.toISODate();
  }

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
