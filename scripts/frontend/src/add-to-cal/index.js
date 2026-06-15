import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { normalizeTimeZone } from "@/lib/date-utils";
import { DateTime } from "luxon";
import { useEffect } from "react";
import { createRoot } from "react-dom/client";

function isTruthy(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function getDateStartSeconds(value) {
  const ms = Date.parse(value);

  if (!Number.isFinite(ms)) {
    return 0;
  }

  return Math.floor(ms / 1000);
}

function isDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

// --- Utility: pick first instance based on date type ---
function getSelectedEventDayIndex(event) {
  if (
    event?.date_type !== "standard" ||
    event?.standard_type !== "selected" ||
    typeof window === "undefined"
  ) {
    return null;
  }

  const parseIndex = (value) => {
    const raw = String(value ?? "");
    return /^\d+$/.test(raw) ? Number(raw) : null;
  };

  const fromQuery = parseIndex(
    new URLSearchParams(window.location.search).get("event_day")
  );
  if (fromQuery !== null) {
    return fromQuery;
  }

  try {
    const fromEventUrl = parseIndex(
      new URL(event?.url || "", window.location.href).searchParams.get(
        "event_day"
      )
    );
    return fromEventUrl;
  } catch {
    return null;
  }
}

function getSelectedStandardInstance(event) {
  if (
    event?.date_type !== "standard" ||
    event?.standard_type !== "selected" ||
    !Array.isArray(event?.event_days) ||
    !event.event_days.length
  ) {
    return null;
  }

  const selectedIndex = getSelectedEventDayIndex(event);
  if (
    selectedIndex !== null &&
    event.event_days[selectedIndex]?.start_date
  ) {
    return event.event_days[selectedIndex];
  }

  const activeStart = getDateStartSeconds(event.start_date || event.start || "");
  if (activeStart) {
    const activeDay = event.event_days.find(
      (day) => getDateStartSeconds(day?.start_date) === activeStart
    );

    if (activeDay?.start_date) {
      return activeDay;
    }
  }

  return null;
}

function getFirstInstance(event) {
  if (
    event.date_type === "standard" &&
    Array.isArray(event.event_days) &&
    event.event_days.length
  ) {
    return getSelectedStandardInstance(event) || event.event_days[0];
  }
  if (
    event.date_type === "recurring" &&
    Array.isArray(event.recurrence_rules) &&
    event.recurrence_rules.length
  ) {
    return event.recurrence_rules[0];
  }
  return {
    start_date: event.start_date,
    end_date: event.end_date,
    all_day: event.all_day,
  };
}

function getRenderedInstanceFromNode(node) {
  return {
    start_date: node.getAttribute("data-start") || "",
    end_date: node.getAttribute("data-end") || "",
    all_day: isTruthy(node.getAttribute("data-all-day")),
    all_day_start_date: node.getAttribute("data-all-day-start-date") || "",
    all_day_end_date: node.getAttribute("data-all-day-end-date") || "",
    all_day_timezone: node.getAttribute("data-all-day-tz") || "",
    label: (node.textContent || "").replace(/\s+/g, " ").trim(),
  };
}

function getRenderedDateScopes(mountEl) {
  if (typeof document === "undefined") {
    return [];
  }

  const scopes = [];
  const closestScope = mountEl?.closest?.(
    "article, main, .entry-content, .wp-block-post-content, .eventkoi, .eventkoi-event"
  );

  if (closestScope) {
    scopes.push(closestScope);
  }

  scopes.push(document);

  return scopes;
}

function getRenderedInstances(mountEl, instanceTimestamp = 0) {
  const scopes = getRenderedDateScopes(mountEl);
  const seen = new Set();

  for (const scope of scopes) {
    if (!scope || seen.has(scope)) {
      continue;
    }

    seen.add(scope);

    const nodes = scope.querySelectorAll(".ek-datetime[data-start]");
    const instances = [];

    for (const node of nodes) {
      const startDate = node.getAttribute("data-start") || "";

      if (
        instanceTimestamp &&
        getDateStartSeconds(startDate) !== instanceTimestamp
      ) {
        continue;
      }

      instances.push(getRenderedInstanceFromNode(node));
    }

    if (instances.length) {
      return instances;
    }
  }

  return [];
}

function getRenderedActiveInstance(mountEl, instanceTimestamp = 0) {
  return getRenderedInstances(mountEl, instanceTimestamp)[0] || null;
}

function getActiveInstanceTimestamp() {
  const urlParams = new URLSearchParams(window.location.search);
  let instanceTimestamp = urlParams.get("instance");

  if (!instanceTimestamp) {
    const match = window.location.pathname.match(/\/(\d+)\/?$/);
    if (match) {
      instanceTimestamp = match[1];
    }
  }

  return instanceTimestamp && !isNaN(Number(instanceTimestamp))
    ? Number(instanceTimestamp)
    : 0;
}

function getCalendarInstances(event, mountEl = null) {
  const timestamp = getActiveInstanceTimestamp();
  const renderedInstances = getRenderedInstances(mountEl, timestamp);

  if (renderedInstances.length) {
    return renderedInstances;
  }

  return [getActiveInstance(event, mountEl)].filter(Boolean);
}

// --- Utility: parse ?instance= param and apply duration ---
function getActiveInstance(event, mountEl = null) {
  const timestamp = getActiveInstanceTimestamp();
  const renderedInstance = getRenderedActiveInstance(mountEl, timestamp);

  if (renderedInstance) {
    return renderedInstance;
  }

  if (event.date_type === "recurring" && timestamp) {
    const rule = event.recurrence_rules?.[0];
    const start = new Date(timestamp * 1000);
    let end;

    if (rule?.start_date && rule?.end_date) {
      const duration =
        new Date(rule.end_date).getTime() - new Date(rule.start_date).getTime();
      end = new Date(start.getTime() + duration);
    }

    return {
      start_date: start.toISOString(),
      end_date: end?.toISOString() || "",
      all_day: rule?.all_day ?? false,
    };
  }

  return getFirstInstance(event);
}

function getEventTimezone(event) {
  return normalizeTimeZone(event?.timezone || eventkoi_params?.timezone || "UTC");
}

function isAutoDetectTimezoneEnabled() {
  const value = eventkoi_params?.auto_detect_timezone;
  return value === true || value === 1 || value === "1" || value === "true";
}

function getDisplayTimezone(event) {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("tz");

    if (requested) {
      return normalizeTimeZone(
        requested === "local"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
          : requested
      );
    }

    if (isAutoDetectTimezoneEnabled()) {
      return normalizeTimeZone(
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      );
    }
  }

  return getEventTimezone(event);
}

function getIcalUrl(event) {
  const source = eventkoi_params?.ical || "";

  if (!source) {
    return "";
  }

  try {
    const url = new URL(source, window.location.href);
    url.searchParams.set("tz", getDisplayTimezone(event));
    return url.toString();
  } catch {
    return source;
  }
}

function parseAllDayDate(value, timezone) {
  if (!value) {
    return null;
  }

  const dt = DateTime.fromISO(String(value), {
    zone: timezone === "utc" ? "UTC" : timezone,
  });

  return dt.isValid ? dt : null;
}

function getExclusiveAllDayEndDate(start, end, isEndDateOnly = false) {
  const startDate = start.startOf("day");

  if (!end || end.toMillis() <= start.toMillis()) {
    return startDate.plus({ days: 1 });
  }

  const endDate = end.startOf("day");

  if (isEndDateOnly) {
    return endDate <= startDate
      ? startDate.plus({ days: 1 })
      : endDate.plus({ days: 1 });
  }

  if (end.toMillis() - start.toMillis() <= 24 * 60 * 60 * 1000) {
    return startDate.plus({ days: 1 });
  }

  if (endDate <= startDate) {
    return startDate.plus({ days: 1 });
  }

  const isExclusiveMidnight = end.equals(endDate);

  return isExclusiveMidnight ? endDate : endDate.plus({ days: 1 });
}

function formatGoogleTimedDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function getCalendarDates(instance, timezone) {
  if (!instance?.start_date) {
    return null;
  }

  if (instance.all_day) {
    const allDayTimezone = normalizeTimeZone(
      instance.all_day_timezone || instance.timezone || timezone
    );
    const startValue = instance.all_day_start_date || instance.start_date;
    const endValue = instance.all_day_end_date || instance.end_date;
    const start = parseAllDayDate(startValue, allDayTimezone);

    if (!start) {
      return null;
    }

    const end = getExclusiveAllDayEndDate(
      start,
      parseAllDayDate(endValue, allDayTimezone),
      isDateOnly(endValue)
    );

    return {
      googleStart: start.toFormat("yyyyMMdd"),
      googleEnd: end.toFormat("yyyyMMdd"),
      outlookStart: start.toISODate(),
      outlookEnd: end.toISODate(),
      allDay: true,
    };
  }

  const start = new Date(instance.start_date);
  let end = new Date(instance.end_date || instance.start_date);

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  if (Number.isNaN(end.getTime()) || end.getTime() < start.getTime()) {
    end = start;
  }

  return {
    googleStart: formatGoogleTimedDate(start),
    googleEnd: formatGoogleTimedDate(end),
    outlookStart: start.toISOString(),
    outlookEnd: end.toISOString(),
    allDay: false,
  };
}

function getOccurrenceLabel(option, index) {
  return option?.instance?.label || `Date ${index + 1}`;
}

function CalendarProviderMenuItem({ label, options, onSelect }) {
  if (options.length <= 1) {
    return (
      <DropdownMenuItem
        disabled={!options[0]?.dates}
        onClick={() => {
          if (options[0]?.dates) {
            onSelect(options[0].dates);
          }
        }}
      >
        {label}
      </DropdownMenuItem>
    );
  }

  return options.map((option, index) => {
    const occurrenceLabel = getOccurrenceLabel(option, index);

    return (
      <DropdownMenuItem
        key={`${label}-${option.instance?.start_date || index}-${index}`}
        disabled={!option.dates}
        title={`${label}: ${occurrenceLabel}`}
        onClick={() => {
          if (option.dates) {
            onSelect(option.dates);
          }
        }}
      >
        <span className="min-w-0 truncate">
          {label}: {occurrenceLabel}
        </span>
      </DropdownMenuItem>
    );
  });
}

function getMenuWidthClass(options) {
  return options.length > 1
    ? "w-[300px] max-w-[calc(100vw-2rem)]"
    : "w-[180px]";
}

function getEventLocationLine(event = {}) {
  const locations = Array.isArray(event.locations) ? event.locations : [];

  for (const location of locations) {
    const virtualUrl = location?.virtual_url || location?.url || "";
    if (location?.type === "virtual" || location?.type === "online") {
      if (virtualUrl) {
        return virtualUrl;
      }
      continue;
    }

    const address = location?.address || {};
    const cityLine = [
      location?.city || address?.addressLocality,
      location?.state || address?.addressRegion,
      location?.zip || address?.postalCode,
    ]
      .filter(Boolean)
      .join(", ");

    const physicalLine = [
      location?.name,
      location?.address1 || address?.streetAddress,
      location?.address2,
      location?.address3,
      cityLine,
      location?.country || address?.addressCountry,
    ]
      .filter(Boolean)
      .join(", ");

    if (physicalLine) {
      return physicalLine;
    }
  }

  return event.location_line || "";
}

export function AddToCal({ base, html }) {
  const { event } = eventkoi_params;

  useEffect(() => {
    if (base) {
      base.style.padding = "0";
      base.style.border = "none";
    }
  }, [base]);

  const timezone = getDisplayTimezone(event);
  const calendarOptions = getCalendarInstances(event, base).map((instance) => ({
    instance,
    dates: getCalendarDates(instance, timezone),
  }));

  const location = getEventLocationLine(event);

  const openWindow = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const generateGoogleCal = (calendarDates) => {
    if (!calendarDates) {
      return;
    }

    const url = new URL("https://www.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", event.title || "");
    url.searchParams.set(
      "dates",
      `${calendarDates.googleStart}/${calendarDates.googleEnd}`
    );
    url.searchParams.set("details", event.summary || "");
    url.searchParams.set("location", location);
    url.searchParams.set("output", "xml");
    openWindow(url.toString());
  };

  const generateOutlook = (baseUrl, calendarDates) => {
    if (!calendarDates) {
      return;
    }

    const url = new URL(baseUrl);
    url.searchParams.set("path", "/calendar/action/compose");
    url.searchParams.set("rru", "addevent");
    url.searchParams.set("allday", calendarDates.allDay ? "true" : "false");
    url.searchParams.set("startdt", calendarDates.outlookStart);
    url.searchParams.set("enddt", calendarDates.outlookEnd);
    url.searchParams.set("location", location);
    url.searchParams.set("subject", event.title || "");
    url.searchParams.set("body", event.summary || "");
    openWindow(url.toString());
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="border-none p-0 bg-transparent">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={`${getMenuWidthClass(calendarOptions)} px-3 py-2 shadow-2xl border border-border bg-popover rounded-md`}
      >
        <CalendarProviderMenuItem
          label="Google Calendar"
          options={calendarOptions}
          onSelect={generateGoogleCal}
        />
        <DropdownMenuItem onClick={() => openWindow(getIcalUrl(event))}>
          iCalendar
        </DropdownMenuItem>
        <CalendarProviderMenuItem
          label="Outlook 365"
          options={calendarOptions}
          onSelect={(calendarDates) =>
            generateOutlook("https://outlook.office.com/owa/", calendarDates)
          }
        />
        <CalendarProviderMenuItem
          label="Outlook Live"
          options={calendarOptions}
          onSelect={(calendarDates) =>
            generateOutlook("https://outlook.live.com/owa/", calendarDates)
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Mount component for each matching element.
document.querySelectorAll("a[href='#add-to-cal']").forEach((el) => {
  const root = createRoot(el);
  root.render(<AddToCal base={el} html={el.outerHTML} />);
});
