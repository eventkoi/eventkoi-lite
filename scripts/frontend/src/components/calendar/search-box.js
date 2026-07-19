/**
 * SearchBox (i18n-ready)
 *
 * @package EventKoi
 */

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
import { __, _n, sprintf } from "@wordpress/i18n";
import { Loader2, Search } from "lucide-react";
import { DateTime } from "luxon";
import { useEffect, useRef } from "react";

function isTruthy(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function hasExplicitValue(value) {
  return value !== undefined && value !== null && value !== "";
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

function getAllDayDisplayEnd(start, rawEnd, realEnd, options = {}) {
  if (options?.preserveDateOnlyRange) {
    const explicitEnd = realEnd?.isValid
      ? realEnd
      : rawEnd?.isValid
      ? rawEnd
      : null;
    return explicitEnd && explicitEnd >= start ? explicitEnd : start;
  }

  if (realEnd?.isValid) {
    const durationMs = realEnd.toMillis() - start.toMillis();
    return durationMs > 0 && durationMs <= 24 * 60 * 60 * 1000
      ? start
      : realEnd;
  }

  if (!rawEnd?.isValid) {
    return null;
  }

  const durationMs = rawEnd.toMillis() - start.toMillis();
  if (durationMs > 0 && durationMs <= 24 * 60 * 60 * 1000) {
    return start;
  }

  return rawEnd.hasSame(start, "day") ? rawEnd : rawEnd.minus({ days: 1 });
}

function formatSearchDate(event, timezone, timeFormat) {
  const params = typeof eventkoi_params !== "undefined" ? window.eventkoi_params : {};
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
    const allDayZone = normalizeZone(
      event?.all_day_timezone || event?.allDayTimezone || timezone
    );
    const start = parseSearchDate(
      event?.all_day_start_date || event?.start_date || event?.start,
      allDayZone
    )?.setLocale(locale);
    const realEnd = parseSearchDate(
      event?.all_day_end_date || event?.end_real,
      allDayZone
    )?.setLocale(locale);
    const rawEnd = parseSearchDate(
      event?.all_day_end_date || event?.end,
      allDayZone
    )?.setLocale(locale);

    if (!start?.isValid) {
      return {
        visible: "",
        screenReader: "",
      };
    }

    const displayEnd = getAllDayDisplayEnd(start, rawEnd, realEnd, {
      preserveDateOnlyRange: hasExplicitValue(event?.all_day_end_date),
    });
    const formattedStart = start.toFormat(dateFormat);
    const formattedEnd =
      displayEnd?.isValid && !displayEnd.hasSame(start, "day")
        ? displayEnd.toFormat(dateFormat)
        : "";
    const formatted = formattedEnd
      ? `${formattedStart} – ${formattedEnd}`
      : formattedStart;

    return {
      visible: formatted,
      screenReader: formatted,
    };
  }

  const formatDateTime = (dt) => `${dt.toFormat(dateFormat)}, ${formatTime(dt)}`;

  const value = event?.start_real || event?.start_date || event?.start;
  const endValue = event?.end_real || event?.end_date || event?.end;
  const displayZone = normalizeZone(timezone);
  const dt = parseSearchDate(value, displayZone);
  const localized = dt?.isValid ? dt.setLocale(locale) : null;

  if (!localized) {
    return {
      visible: "",
      screenReader: "",
    };
  }

  const end = parseSearchDate(endValue, displayZone);
  const localizedEnd = end?.isValid ? end.setLocale(locale) : null;
  const startDisplay = formatDateTime(localized);
  const endDisplay =
    localizedEnd && localizedEnd > localized
      ? localizedEnd.hasSame(localized, "day")
        ? formatTime(localizedEnd)
        : formatDateTime(localizedEnd)
      : "";
  const display = endDisplay ? `${startDisplay} – ${endDisplay}` : startDisplay;

  return {
    visible: display,
    screenReader: display,
  };
}

export function SearchBox({
  inputRef,
  search,
  setSearch,
  open,
  setOpen,
  events,
  filteredResults,
  paginatedResults,
  totalPages,
  page,
  setPage,
  timezone,
  timeFormat,
  setSearchOpen,
  searchScope,
  onSearchScopePrev,
  onSearchScopeNext,
}) {
  const isLoading = events === undefined || events === null;
  const isEmpty = !isLoading && events.length === 0;
  const containerRef = useRef(null);

  // Close the results popover on Escape or any click outside it. These are
  // document-level so they fire even when focus has moved onto a result item
  // (where the input's own onKeyDown/onBlur no longer run).
  useEffect(() => {
    if (!open) {
      return;
    }

    const close = () => {
      setOpen(false);
      setSearchOpen?.(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        close();
      }
    };
    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        close();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, setOpen, setSearchOpen]);

  return (
    <div
      ref={containerRef}
      className="relative w-full min-w-0 lg:w-[350px] lg:max-w-full"
      aria-busy={isLoading}
      aria-live="polite"
    >
      {/* Hidden accessible label */}
      <label htmlFor="event-search" className="sr-only">
        {__("Search events", "eventkoi-lite")}
      </label>

      <Input
        id="event-search"
        ref={inputRef}
        type="search"
        placeholder={__("Search events…", "eventkoi-lite")}
        aria-label={__("Search events", "eventkoi-lite")}
        role="combobox"
        aria-expanded={open}
        aria-controls="event-search-listbox"
        aria-autocomplete="list"
        value={search}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          const related = e.relatedTarget;
          const isStillInsidePopover =
            related && e.currentTarget.parentNode?.contains(related);

          if (isStillInsidePopover) return;

          setTimeout(() => {
            setOpen(false);
            setSearchOpen?.(false);
          }, 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setSearchOpen?.(false);
            e.currentTarget.blur();
          }
        }}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-9 h-10 w-full min-w-0 shadow-none border border-solid box-border rounded disabled:bg-background"
        autoComplete="off"
        // Only disable before any search begins (calendar still loading, or a
        // genuinely empty calendar). Never disable while a search term is
        // present: in global-search mode the results arrive a tick later, so an
        // empty result set is normal mid-type. Disabling then blurs the focused
        // input and drops every keystroke after the first.
        disabled={isLoading || (isEmpty && !search)}
      />

      {/* Icon */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-3 flex items-center text-muted-foreground pointer-events-none"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </span>

      {/* Live region for loading/empty states */}
      <div className="sr-only" role="status">
        {isLoading
          ? __("Loading events...", "eventkoi-lite")
          : isEmpty
          ? __("No events found.", "eventkoi-lite")
          : sprintf(
              /* translators: %d: number of events found */
              _n("%d event found.", "%d events found.", filteredResults.length, "eventkoi-lite"),
              filteredResults.length
            )}
      </div>

      {open && search && (
        <Command
          className={cn(
            "absolute z-50 left-0 top-12 w-full rounded-md border bg-popover text-popover-foreground shadow-md border-border border-solid",
            "max-h-[400px] h-auto"
          )}
        >
          <CommandList
            id="event-search-listbox"
            role="listbox"
            className="p-2 max-h-[400px] overflow-y-auto overscroll-contain"
          >
            {searchScope ? (
              <div className="px-2 pb-2 text-xs text-muted-foreground">
                {searchScope}
              </div>
            ) : null}

            {filteredResults.length === 0 ? (
              <CommandEmpty className="p-4 text-muted-foreground text-sm">
                {__("No events found.", "eventkoi-lite")}
              </CommandEmpty>
            ) : (
              paginatedResults.map((event) => {
                const formatted = formatSearchDate(event, timezone, timeFormat);

                return (
                  <CommandItem
                    key={event.id}
                    role="option"
                    aria-selected="false"
                    value={event.title}
                    onClick={() => {
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
                      {formatted.visible}
                    </span>
                    <span className="font-medium">{event.title}</span>
                    {/* Hidden full date for screen readers */}
                    <span className="sr-only">{formatted.screenReader}</span>
                  </CommandItem>
                );
              })
            )}

            {/* Pagination footer: page navigation plus month navigation. Kept
                outside the empty/results branch so visitors can jump to another
                month even when the current month has no matching events. */}
            {totalPages > 1 || onSearchScopePrev || onSearchScopeNext ? (
              <div className="mt-2 grid gap-2 border-t border-solid border-border px-2 pt-2 text-xs text-muted-foreground">
                {totalPages > 1 ? (
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      aria-label={__("Previous page", "eventkoi-lite")}
                      aria-disabled={page === 0}
                      className="cursor-pointer box-border border-none text-foreground bg-transparent shadow-none"
                    >
                      {__("Prev", "eventkoi-lite")}
                    </Button>

                    <span aria-live="polite">
                      {sprintf(
                        __("Page %1$d of %2$d", "eventkoi-lite"),
                        page + 1,
                        totalPages
                      )}
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={page >= totalPages - 1}
                      aria-label={__("Next page", "eventkoi-lite")}
                      aria-disabled={page >= totalPages - 1}
                      className="cursor-pointer box-border border-none text-foreground bg-transparent shadow-none"
                    >
                      {__("Next", "eventkoi-lite")}
                    </Button>
                  </div>
                ) : null}

                {onSearchScopePrev || onSearchScopeNext ? (
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onSearchScopePrev}
                      disabled={!onSearchScopePrev}
                      aria-label={__("Search previous month", "eventkoi-lite")}
                      className="cursor-pointer box-border border-none bg-transparent px-0 text-foreground shadow-none"
                    >
                      {__("Previous month", "eventkoi-lite")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onSearchScopeNext}
                      disabled={!onSearchScopeNext}
                      aria-label={__("Search next month", "eventkoi-lite")}
                      className="cursor-pointer box-border border-none bg-transparent px-0 text-foreground shadow-none"
                    >
                      {__("Next month", "eventkoi-lite")}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CommandList>
        </Command>
      )}
    </div>
  );
}
