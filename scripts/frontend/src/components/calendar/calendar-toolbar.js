import { ToolbarDesktop } from "@/components/calendar/toolbar-desktop";
import { ToolbarMobile } from "@/components/calendar/toolbar-mobile";
import { __, sprintf } from "@wordpress/i18n";
import { useEffect, useRef, useState } from "react";

const MAX_RESULTS = 10;

export function CalendarToolbar({
  calendar,
  calendarApi,
  currentDate,
  setCurrentDate,
  view,
  setView,
  search,
  setSearch,
  events,
  globalSearch = false,
  timezone,
  timeFormat,
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const inputRef = useRef(null);

  // In global-search mode `events` is already the backend's matched set (across
  // all dates), so use it as-is. Otherwise filter the visible month's events.
  const filteredResults = !search
    ? []
    : globalSearch
      ? events
      : events.filter((event) => {
          const q = search.toLowerCase();
          return (
            event.title?.toLowerCase().includes(q) ||
            event.description?.toLowerCase().includes(q) ||
            event.location?.toLowerCase().includes(q)
          );
        });

  const totalPages = Math.ceil(filteredResults.length / MAX_RESULTS);
  const paginatedResults = filteredResults.slice(
    page * MAX_RESULTS,
    (page + 1) * MAX_RESULTS
  );
  // Global search spans all months, so it is never month-scoped.
  const isMonthScopedSearch =
    !globalSearch &&
    (String(view || "").startsWith("timeGrid") ||
      String(view || "").startsWith("dayGrid"));
  const searchScopeDate =
    currentDate instanceof Date && !Number.isNaN(currentDate.getTime())
      ? currentDate
      : calendarApi?.getDate?.() || new Date();
  const searchScopeMonth = new Intl.DateTimeFormat(
    (eventkoi_params?.locale || "en").replace("_", "-"),
    {
      month: "long",
      year: "numeric",
    }
  ).format(searchScopeDate);
  const searchScope = isMonthScopedSearch
    ? sprintf(
        /* translators: %s: month and year, for example May 2026. */
        __("Search results for %s.", "eventkoi-lite"),
        searchScopeMonth
      )
    : "";
  const moveSearchScopeMonth = (direction) => {
    if (!calendarApi || !isMonthScopedSearch) {
      return;
    }

    const base = calendarApi.getDate?.() || searchScopeDate;
    const target = new Date(base);

    target.setDate(1);
    target.setMonth(target.getMonth() + direction);
    calendarApi.gotoDate(target);
    setCurrentDate(target);
    setPage(0);
  };

  useEffect(() => setPage(0), [search, searchScope]);

  const isTodayInRange = (() => {
    if (!calendarApi) return false;
    const start = calendarApi.view?.currentStart;
    const end = calendarApi.view?.currentEnd;
    const today = new Date();
    return start <= today && today <= end;
  })();

  const props = {
    calendar,
    calendarApi,
    currentDate,
    setCurrentDate,
    view,
    setView,
    isTodayInRange,
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
    searchScope,
    onSearchScopePrev: isMonthScopedSearch
      ? () => moveSearchScopeMonth(-1)
      : undefined,
    onSearchScopeNext: isMonthScopedSearch
      ? () => moveSearchScopeMonth(1)
      : undefined,
    inputRef,
  };

  return (
    <>
      <ToolbarMobile {...props} />
      <ToolbarDesktop {...props} />
    </>
  );
}
