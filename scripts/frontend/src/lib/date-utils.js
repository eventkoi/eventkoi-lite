import { DateTime } from "luxon";

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

  // --- Recurring ---
  if (event.date_type === "recurring" && event.timeline) {
    const start = DateTime.fromISO(event.start, { zone: "utc" }).setZone(tz);
    const end = event.end_real
      ? DateTime.fromISO(event.end_real, { zone: "utc" }).setZone(tz)
      : event.end
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

  // --- Standard / multi-day ---
  if (event.date_type === "standard" || event.date_type === "multi") {
    const start = DateTime.fromISO(event.start, { zone: "utc" }).setZone(tz);
    const end = event.end_real
      ? DateTime.fromISO(event.end_real, { zone: "utc" }).setZone(tz)
      : event.end
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

    if (!end) {
      // Single-day open-ended
      return allDay
        ? start.toFormat("d MMM yyyy")
        : `${start.toFormat("d MMM yyyy, ")}${start
            .toFormat(start.minute === 0 ? "ha" : "h:mma")
            .toLowerCase()}`;
    }

    // Multi-day: always show both date & time
    return `${start.toFormat("d MMM yyyy, ")}${start
      .toFormat(start.minute === 0 ? "ha" : "h:mma")
      .toLowerCase()} – ${end.toFormat("d MMM yyyy, ")}${end
      .toFormat(end.minute === 0 ? "ha" : "h:mma")
      .toLowerCase()}`;
  }

  return null;
}

export function formatTimezoneLabel(tz) {
  if (!tz) return "UTC";

  // Handle ISO-style offset like +02:00 or -0530
  const isoOffsetMatch = tz.match(/^([+-])(\d{2}):?(\d{2})$/);
  if (isoOffsetMatch) {
    const sign = isoOffsetMatch[1];
    const hours = parseInt(isoOffsetMatch[2], 10);
    const mins = parseInt(isoOffsetMatch[3], 10);
    if (mins === 0) {
      return `UTC${sign}${hours}`;
    }
    return `UTC${sign}${hours}:${mins.toString().padStart(2, "0")}`;
  }

  // Handle normalized Etc/GMT±N
  if (tz.startsWith("Etc/GMT")) {
    const offset = tz.replace("Etc/GMT", "");
    const num = parseInt(offset, 10);
    if (num === 0) return "UTC";
    // Reverse sign for display
    return `UTC${num >= 0 ? "+" : "-"}${Math.abs(num)}`;
  }

  // Raw numeric like +3 or -2
  if (!isNaN(parseFloat(tz)) && isFinite(tz)) {
    const offset = parseFloat(tz);
    if (offset === 0) return "UTC";
    return `UTC${offset >= 0 ? "+" : ""}${offset}`;
  }

  // Browser local
  if (tz.toLowerCase() === "local") {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let offsetStr = DateTime.now().setZone(zone).toFormat("ZZ");
    offsetStr = offsetStr.replace(":00", "").replace(/^(\+|-)0/, "$1");
    return `${zone} (UTC${offsetStr})`;
  }

  // Explicit UTC
  if (tz.toUpperCase() === "UTC") {
    return "UTC";
  }

  // Assume IANA → append offset
  const dt = DateTime.now().setZone(tz);
  if (dt.isValid) {
    let offsetStr = dt.toFormat("ZZ");
    offsetStr = offsetStr.replace(":00", "").replace(/^(\+|-)0/, "$1");
    return `${tz} (UTC${offsetStr})`;
  }

  return tz;
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
