import { DateTime } from "luxon";
import { wpToLuxonFormat } from "@/lib/date-utils";

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

const localeToUse =
  typeof window !== "undefined" && window.eventkoi_params?.locale
    ? window.eventkoi_params.locale.replace("_", "-")
    : "en";

function formatRange(startISO, endISO, tz, isAllDay) {
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const start = DateTime.fromISO(startISO, { zone: tz });
  if (!start.isValid) return null;

  const startLocal = start.setZone(localZone).setLocale(localeToUse);
  if (isAllDay) {
    return startLocal.toFormat(dateFmt);
  }

  const timeFmt = is24h ? "HH:mm" : "h:mm a";
  let output = startLocal.toFormat(dateFmt + ", " + timeFmt);
  if (endISO) {
    const end = DateTime.fromISO(endISO, { zone: tz });
    if (end.isValid) {
      const endLocal = end.setZone(localZone).setLocale(localeToUse);
      const sameDay = startLocal.toISODate() === endLocal.toISODate();
      output +=
        " — " + endLocal.toFormat(sameDay ? timeFmt : dateFmt + ", " + timeFmt);
    }
  }
  return output;
}

function rewriteEventDates() {
  if (!shouldAutoDetect) return;
  const nodes = document.querySelectorAll(".ek-datetime");

  nodes.forEach((node) => {
    let startISO = node.getAttribute("data-start");
    const endISO = node.getAttribute("data-end");
    const tz = node.getAttribute("data-tz") || "UTC";
    const isAllDay = node.getAttribute("data-all-day") === "1";

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
    const text = formatRange(startISO, endISO, tz, isAllDay);
    if (text) {
      node.firstChild
        ? (node.firstChild.textContent = text)
        : (node.textContent = text);
    }
  });

  // Update timezone labels when present.
  const tzNodes = document.querySelectorAll(".ek-timezone");
  const localZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
  tzNodes.forEach((node) => {
    node.textContent = localZone;
  });
}

document.addEventListener("DOMContentLoaded", rewriteEventDates);
