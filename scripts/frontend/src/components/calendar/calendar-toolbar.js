import { ToolbarDesktop } from "@/components/calendar/toolbar-desktop";
import { ToolbarMobile } from "@/components/calendar/toolbar-mobile";
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
  timezone,
  timeFormat,
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const inputRef = useRef(null);

  const filteredResults = search
    ? events.filter((event) => {
        const q = search.toLowerCase();
        return (
          event.title?.toLowerCase().includes(q) ||
          event.description?.toLowerCase().includes(q) ||
          event.location?.toLowerCase().includes(q)
        );
      })
    : [];

  const totalPages = Math.ceil(filteredResults.length / MAX_RESULTS);
  const paginatedResults = filteredResults.slice(
    page * MAX_RESULTS,
    (page + 1) * MAX_RESULTS
  );

  useEffect(() => setPage(0), [search]);

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
    inputRef,
  };

  return (
    <>
      <ToolbarMobile {...props} />
      <ToolbarDesktop {...props} />
    </>
  );
}
