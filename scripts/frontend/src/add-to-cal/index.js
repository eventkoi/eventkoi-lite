import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect } from "react";
import { createRoot } from "react-dom/client";

// --- Utility: pick first instance based on date type ---
function getFirstInstance(event) {
  if (
    event.date_type === "standard" &&
    Array.isArray(event.event_days) &&
    event.event_days.length
  ) {
    return event.event_days[0];
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

// --- Utility: parse ?instance= param and apply duration ---
function getActiveInstance(event) {
  const urlParams = new URLSearchParams(window.location.search);
  let instanceTimestamp = urlParams.get("instance");

  // Fallback: check URL path ending with /{timestamp}/
  if (!instanceTimestamp) {
    const match = window.location.pathname.match(/\/(\d+)\/?$/);
    if (match) {
      instanceTimestamp = match[1];
    }
  }

  if (
    event.date_type === "recurring" &&
    instanceTimestamp &&
    !isNaN(Number(instanceTimestamp))
  ) {
    const rule = event.recurrence_rules?.[0];
    const start = new Date(Number(instanceTimestamp) * 1000);
    let end;

    if (rule?.start_date && rule?.end_date) {
      const duration =
        new Date(rule.end_date).getTime() - new Date(rule.start_date).getTime();
      end = new Date(start.getTime() + duration);
    }

    return {
      start_date: start.toISOString(),
      end_date: end?.toISOString(),
      all_day: rule?.all_day ?? false,
    };
  }

  return getFirstInstance(event);
}

// --- Utility: format Google Calendar date string ---
function formatGoogleCalDate(dt, allDay = false) {
  if (!dt) return "";
  const dateObj = new Date(dt);
  if (isNaN(dateObj)) return "";
  if (allDay) {
    return dateObj.toISOString().slice(0, 10).replace(/-/g, "");
  }
  return (
    dateObj
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(".000Z", "Z")
      .slice(0, 16) + "00Z"
  );
}

// --- Utility: fallback ISO date ---
const toIsoDate = (dt, allDay = false) => {
  if (!dt) return "";
  return allDay ? dt.slice(0, 10) : dt;
};

export function AddToCal({ base, html }) {
  const { event } = eventkoi_params;

  useEffect(() => {
    if (base) {
      base.style.padding = "0";
      base.style.border = "none";
    }
  }, [base]);

  const instance = getActiveInstance(event);
  const startDateToUse = instance?.start_date;
  const endDateToUse = instance?.end_date;

  const starts = formatGoogleCalDate(startDateToUse, instance?.all_day);
  const ends = formatGoogleCalDate(endDateToUse, instance?.all_day);

  const location =
    event.locations?.[0]?.type === "virtual"
      ? event.locations[0]?.virtual_url || event.location_line || ""
      : [
          event.locations?.[0]?.name,
          event.locations?.[0]?.address1,
          event.locations?.[0]?.address2,
          event.locations?.[0]?.city,
          event.locations?.[0]?.state,
          event.locations?.[0]?.zip,
          event.locations?.[0]?.country,
        ]
          .filter(Boolean)
          .join(", ") ||
        event.location_line ||
        "";

  const openWindow = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const generateGoogleCal = () => {
    const url = new URL("https://www.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", event.title || "");
    url.searchParams.set("dates", `${starts}/${ends}`);
    url.searchParams.set("details", event.summary || "");
    url.searchParams.set("location", location);
    url.searchParams.set("output", "xml");
    openWindow(url);
  };

  const generateOutlook = (baseUrl) => {
    const url = new URL(baseUrl);
    url.searchParams.set("path", "/calendar/action/compose");
    url.searchParams.set("rrv", "addevent");
    url.searchParams.set(
      "startdt",
      toIsoDate(startDateToUse, instance?.all_day)
    );
    url.searchParams.set("enddt", toIsoDate(endDateToUse, instance?.all_day));
    url.searchParams.set("location", location);
    url.searchParams.set("subject", event.title || "");
    url.searchParams.set("body", event.summary || "");
    openWindow(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="border-none p-0 bg-transparent">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[180px] px-3 py-2 shadow-2xl border border-border bg-popover rounded-md"
      >
        <DropdownMenuItem onClick={generateGoogleCal}>
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openWindow(eventkoi_params.ical)}>
          iCalendar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => generateOutlook("https://outlook.office.com/owa/")}
        >
          Outlook 365
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => generateOutlook("https://outlook.live.com/owa/")}
        >
          Outlook Live
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Mount component for each matching element.
document.querySelectorAll("a[href='#add-to-cal']").forEach((el) => {
  const root = createRoot(el);
  root.render(<AddToCal base={el} html={el.outerHTML} />);
});
