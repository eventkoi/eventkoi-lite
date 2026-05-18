import { DateTime } from "luxon";
import {
  formatTimezoneLabel,
  normalizeTimeZone,
  wpToLuxonFormat,
} from "@/lib/date-utils";

const shouldAutoDetect =
  typeof window !== "undefined" &&
  !!window.eventkoi_params?.auto_detect_timezone &&
  window.eventkoi_params.auto_detect_timezone !== "0";

const is24h =
  typeof window !== "undefined" &&
  window.eventkoi_params?.time_format === "24";

const dateFmt =
  typeof window !== "undefined"
    ? wpToLuxonFormat(window.eventkoi_params?.date_format || "F j, Y")
    : "LLLL d, yyyy";

const wpTimeFormatRaw =
  typeof window !== "undefined"
    ? window.eventkoi_params?.time_format_string || "g:i a"
    : "g:i a";
const wpTimeFormat = wpToLuxonFormat(wpTimeFormatRaw);

const localeToUse =
  typeof window !== "undefined" && window.eventkoi_params?.locale
    ? window.eventkoi_params.locale.replace("_", "-")
    : "en";

function applyMeridiemCasing(value) {
  if (wpTimeFormatRaw.includes("A")) {
    return value.replace(/\b(am|pm)\b/g, (match) => match.toUpperCase());
  }

  if (wpTimeFormatRaw.includes("a")) {
    return value.replace(/\b(AM|PM)\b/g, (match) => match.toLowerCase());
  }

  return value;
}

function getSourceZone(tz) {
  return (
    tz ||
    window.eventkoi_params?.timezone_string ||
    window.eventkoi_params?.timezone_override ||
    window.eventkoi_params?.timezone ||
    "UTC"
  );
}

function getBrowserZone() {
  return (
    DateTime.local().zoneName ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC"
  );
}

function getRequestedDisplayZone() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("tz");
  const browserZone = getBrowserZone();

  if (!requested) {
    return null;
  }

  if (requested === "local") {
    return browserZone;
  }

  const normalized = normalizeTimeZone(requested);
  return DateTime.now().setZone(normalized).isValid ? normalized : null;
}

function getDisplayZone() {
  return getRequestedDisplayZone() || getBrowserZone();
}

function formatDisplayZoneLabel(zone) {
  const raw = String(zone || "").trim();
  const utcOffsetMatch = raw.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/i);

  if (utcOffsetMatch) {
    const sign = utcOffsetMatch[1];
    const hours = parseInt(utcOffsetMatch[2], 10);
    const minutes = utcOffsetMatch[3] || "00";
    return minutes === "00" ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${minutes}`;
  }

  if (/^(Etc\/GMT|[+-]\d{1,2}(?::?\d{2})?$)/i.test(raw)) {
    return formatTimezoneLabel(raw, is24h ? "24" : "12", false);
  }

  return raw;
}

function hasDisplayZoneOverride() {
  if (typeof window === "undefined") {
    return false;
  }

  return getRequestedDisplayZone() !== null;
}

function parseWithZone(iso, tz) {
  if (!iso) return null;

  const hasOffset = /[+-]\d\d:\d\d|Z$/i.test(iso);
  if (hasOffset) {
    const dt = DateTime.fromISO(iso, { setZone: true });
    return dt.isValid ? dt : DateTime.fromISO(iso);
  }

  const dt = DateTime.fromISO(iso, { zone: tz || "UTC" });
  return dt.isValid ? dt : DateTime.fromISO(iso);
}

function parseAllDayDate(date, tz) {
  if (!date) return null;
  const dt = DateTime.fromISO(date, { zone: tz || "UTC" }).setLocale(localeToUse);
  return dt.isValid ? dt : null;
}

function formatRange(
  startISO,
  endISO,
  tz,
  isAllDay,
  allDayStartDate = "",
  allDayEndDate = "",
  allDayTz = ""
) {
  const localZone = getDisplayZone();
  const sourceZone = getSourceZone(tz);
  const start = parseWithZone(startISO, sourceZone);
  if (!start?.isValid) return null;

  if (isAllDay) {
    const allDayZone = getSourceZone(allDayTz || sourceZone);
    const startLocal =
      parseAllDayDate(allDayStartDate, allDayZone) ||
      start.setZone(allDayZone).setLocale(localeToUse);

    if (!endISO) {
      return startLocal.toFormat(dateFmt);
    }

    const end = parseWithZone(endISO, sourceZone);
    if (!end?.isValid) {
      return startLocal.toFormat(dateFmt);
    }

    const hasExplicitAllDayEndDate = !!allDayEndDate;
    let endLocal =
      parseAllDayDate(allDayEndDate, allDayZone) ||
      end.setZone(allDayZone).setLocale(localeToUse);
    const durationMs = end.toMillis() - start.toMillis();
    if (durationMs > 0 && durationMs <= 24 * 60 * 60 * 1000) {
      return startLocal.toFormat(dateFmt);
    }

    if (
      !hasExplicitAllDayEndDate &&
      !endLocal.hasSame(startLocal, "day") &&
      endLocal.hour === 0 &&
      endLocal.minute === 0 &&
      endLocal.second === 0 &&
      endLocal.millisecond === 0
    ) {
      endLocal = endLocal.minus({ days: 1 });
    }

    if (endLocal <= startLocal || endLocal.hasSame(startLocal, "day")) {
      return startLocal.toFormat(dateFmt);
    }

    return `${startLocal.toFormat(dateFmt)} — ${endLocal.toFormat(dateFmt)}`;
  }

  const startLocal = start.setZone(localZone).setLocale(localeToUse);
  const timeFmt = wpTimeFormat || (is24h ? "HH:mm" : "h:mm a");
  let output = applyMeridiemCasing(startLocal.toFormat(dateFmt + ", " + timeFmt));
  if (endISO) {
    const end = parseWithZone(endISO, sourceZone);
    if (end?.isValid) {
      const endLocal = end.setZone(localZone).setLocale(localeToUse);
      const sameDay = startLocal.toISODate() === endLocal.toISODate();
      output +=
        " — " +
        applyMeridiemCasing(
          endLocal.toFormat(sameDay ? timeFmt : dateFmt + ", " + timeFmt)
        );
    }
  }
  return output;
}

function rewriteEventDates() {
  if (!shouldAutoDetect && !hasDisplayZoneOverride()) return;
  const nodes = document.querySelectorAll(".ek-datetime");

  nodes.forEach((node) => {
    let startISO = node.getAttribute("data-start");
    const endISO = node.getAttribute("data-end");
    const tz = getSourceZone(node.getAttribute("data-tz"));
    let isAllDay = node.getAttribute("data-all-day") === "1";
    const allDayStartDate = node.getAttribute("data-all-day-start-date") || "";
    const allDayEndDate = node.getAttribute("data-all-day-end-date") || "";
    const allDayTz = node.getAttribute("data-all-day-tz") || "";

    // Fallback: infer all-day from a full-day range (00:00:00 → 23:59:*)
    // when the HTML wrapper doesn't carry the flag (older templates).
    if (!isAllDay && startISO && endISO) {
      const s = parseWithZone(startISO, tz)?.setZone(tz);
      const e = parseWithZone(endISO, tz)?.setZone(tz);
      if (
        s?.isValid &&
        e?.isValid &&
        s.hour === 0 &&
        s.minute === 0 &&
        s.second === 0 &&
        e.hour === 23 &&
        e.minute >= 58
      ) {
        isAllDay = true;
      }
    }

    // Fallback: try to parse the text if data-start is missing.
    if (!startISO) {
      const text = node.textContent.trim();
      const datePart = text.split(/[–-]/)[0].trim();
      const formats = [
        "d LLLL yyyy, HH:mm",
        "d LLL yyyy, HH:mm",
        "dd LLL yyyy, HH:mm",
        "d LLLL yyyy, h:mm a",
        "d LLL yyyy, h:mm a",
        "dd LLL yyyy, h:mm a",
        "d LLLL yyyy",
        "d LLL yyyy",
        "dd LLL yyyy",
      ];

      for (const fmt of formats) {
        const dt = DateTime.fromFormat(datePart, fmt, {
          zone: tz,
          locale: localeToUse,
        });
        if (dt.isValid) {
          startISO = dt.toUTC().toISO();
          break;
        }
      }
    }

    if (!startISO) return;
    const text = formatRange(
      startISO,
      endISO,
      tz,
      isAllDay,
      allDayStartDate,
      allDayEndDate,
      allDayTz
    );
    if (text) {
      node.firstChild
        ? (node.firstChild.textContent = text)
        : (node.textContent = text);
    }
  });

  // Update timezone labels when present.
  const tzNodes = document.querySelectorAll(".ek-timezone");
  const localZone = getDisplayZone();
  tzNodes.forEach((node) => {
    node.textContent = formatDisplayZoneLabel(localZone);
  });
}

document.addEventListener("DOMContentLoaded", rewriteEventDates);
