import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { normalizeTimeZone, wpToLuxonFormat } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { DateTime } from "luxon";

function isTruthy(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function isAllDayEvent(event) {
  const firstRule = Array.isArray(event?.recurrence_rules)
    ? event.recurrence_rules[0]
    : null;
  const firstDay = Array.isArray(event?.event_days) ? event.event_days[0] : null;

  return (
    isTruthy(event?.allDay) ||
    isTruthy(event?.all_day) ||
    isTruthy(firstRule?.all_day) ||
    isTruthy(firstDay?.all_day)
  );
}

function normalizeZone(zone) {
  const normalized = normalizeTimeZone(zone || "UTC");
  return DateTime.now().setZone(normalized).isValid ? normalized : "UTC";
}

function getEventPageUrl(event, timezone) {
  const source = event?.url || "";

  if (!source) {
    return "";
  }

  try {
    const url = new URL(source, window.location.href);

    url.searchParams.set("tz", normalizeZone(timezone));
    return url.toString();
  } catch {
    return source;
  }
}

function parseSearchDate(value, zone) {
  if (!value) {
    return null;
  }

  const raw = String(value);
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? DateTime.fromISO(raw, { zone })
    : DateTime.fromISO(raw, { zone: "utc" }).setZone(zone);

  return dt.isValid ? dt : null;
}

function formatSearchDate(event, timezone, timeFormat) {
  const params = typeof eventkoi_params !== "undefined" ? eventkoi_params : {};
  const locale = (params.locale || "en").replace("_", "-");
  const dateFormat = wpToLuxonFormat(params.date_format || "F j, Y");
  const timePreference = timeFormat || params.time_format || "12";
  const wpTimeFormat =
    params.time_format_string || (timePreference === "24" ? "H:i" : "g:i a");
  const luxonTimeFormat = wpToLuxonFormat(wpTimeFormat);

  const formatTime = (dt) => {
    let formatted = dt.toFormat(luxonTimeFormat);

    if (wpTimeFormat.includes("A")) {
      formatted = formatted.replace(/\b(am|pm)\b/g, (m) => m.toUpperCase());
    } else if (wpTimeFormat.includes("a")) {
      formatted = formatted.replace(/\b(AM|PM)\b/g, (m) => m.toLowerCase());
    }

    return formatted;
  };

  if (isAllDayEvent(event)) {
    const allDayValue =
      event?.all_day_start_date || event?.start_date || event?.start;
    const allDayZone = normalizeZone(
      event?.all_day_timezone || event?.allDayTimezone || timezone
    );
    const dt = parseSearchDate(allDayValue, allDayZone);

    return dt?.isValid ? dt.setLocale(locale).toFormat(dateFormat) : "";
  }

  const value = event?.start_date || event?.start;
  const displayZone = normalizeZone(timezone);
  const dt = parseSearchDate(value, displayZone);
  const localized = dt?.isValid ? dt.setLocale(locale) : null;

  return localized ? `${localized.toFormat(dateFormat)}, ${formatTime(localized)}` : "";
}

export function SearchBox({
  inputRef,
  search,
  setSearch,
  open,
  setOpen,
  filteredResults,
  paginatedResults,
  totalPages,
  page,
  setPage,
  timezone,
  timeFormat,
  setSearchOpen,
}) {
  return (
    <div className="relative w-full min-w-0 lg:w-[350px] lg:max-w-full">
      <Input
        ref={inputRef}
        placeholder="Search events…"
        value={search}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => {
            setOpen(false);
            setSearchOpen?.(false);
          }, 150);
        }}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-9 h-10 w-full min-w-0 shadow-none border border-solid box-border rounded"
        autoComplete="off"
      />
      <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground pointer-events-none">
        <Search className="w-4 h-4" />
      </span>

      {open && search && (
        <Command
          className={cn(
            "absolute z-50 left-0 top-12 w-full rounded-md border bg-popover text-popover-foreground shadow-md border-border border-solid",
            "max-h-[400px] h-auto"
          )}
        >
          <CommandList className="p-2 max-h-[400px] overflow-y-auto">
            {filteredResults.length === 0 ? (
              <CommandEmpty className="p-4 text-muted-foreground text-sm">
                No events found.
              </CommandEmpty>
            ) : (
              <>
                {paginatedResults.map((event) => (
                  <CommandItem
                    key={event.id}
                    value={event.title}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      window.open(
                        getEventPageUrl(event, timezone),
                        "_blank",
                        "noopener,noreferrer"
                      );
                      setOpen(false);
                      setSearchOpen?.(false);
                    }}
                    className="grid gap-1 p-2 cursor-pointer text-sm text-foreground rounded-md hover:!bg-accent"
                  >
                    <span className="font-normal block">
                      {formatSearchDate(event, timezone, timeFormat)}
                    </span>
                    <span className="font-medium">{event.title}</span>
                  </CommandItem>
                ))}

                {totalPages > 1 && (
                  <div className="flex justify-between items-center px-2 pt-2 text-xs text-muted-foreground">
                    {/* Prev */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.max(0, p - 1));
                      }}
                      disabled={page === 0}
                      className="cursor-pointer box-border border-none text-foreground bg-transparent shadow-none"
                    >
                      Prev
                    </Button>
                    <span>
                      Page {page + 1} of {totalPages}
                    </span>
                    {/* Next */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.min(totalPages - 1, p + 1));
                      }}
                      disabled={page >= totalPages - 1}
                      className="cursor-pointer box-border border-none text-foreground bg-transparent shadow-none"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      )}
    </div>
  );
}
