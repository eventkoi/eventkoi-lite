import { CalendarHeaderPopover } from "@/components/calendar/CalendarHeaderPopover";
import { NavControls } from "@/components/calendar/nav-controls";
import { SearchBox } from "@/components/calendar/search-box";
import { TodayButton } from "@/components/calendar/today-button";
import { ViewToggle } from "@/components/calendar/view-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";
import { WeekPopover } from "./WeekPopover";

export function ToolbarDesktop(props) {
  const {
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
  } = props;
  const desktopRef = useRef(null);
  const [isTight, setIsTight] = useState(false);

  useEffect(() => {
    const node = desktopRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry?.contentRect?.width || 0;
      setIsTight(width > 0 && width < 980);
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const isEmpty =
    !calendar ||
    (Array.isArray(calendar) && calendar.length === 0) ||
    (!Array.isArray(calendar) && Object.keys(calendar).length === 0);

  if (isEmpty) {
    if (isTight) {
      return (
        <div
          ref={desktopRef}
          className="hidden lg:flex flex-col gap-3 w-full min-w-0"
        >
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <Skeleton className="h-10 w-24 max-w-full rounded-md" />
              <Skeleton className="h-10 w-32 max-w-full rounded-md" />
              <Skeleton className="h-10 w-20 max-w-full rounded-md" />
            </div>
            <Skeleton className="h-10 w-28 max-w-full rounded-md shrink-0" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      );
    }

    return (
      <div
        ref={desktopRef}
        className="hidden lg:flex flex-nowrap items-center justify-between gap-3 w-full min-w-0"
      >
        {/* Left skeletons: nav + popover + today + search */}
        <div className="flex items-center gap-2 flex-nowrap min-w-0 flex-1 overflow-hidden">
          <Skeleton className="h-10 w-24 max-w-full rounded-md" /> {/* NavControls */}
          <Skeleton className="h-10 w-32 max-w-full rounded-md" /> {/* Popover */}
          <Skeleton className="h-10 w-20 max-w-full rounded-md" /> {/* Today */}
          <Skeleton className="h-10 w-full max-w-[350px] rounded-md" /> {/* SearchBox */}
        </div>

        {/* Right skeleton: view toggle */}
        <Skeleton className="h-10 w-28 max-w-full rounded-md shrink-0" />
      </div>
    );
  }

  if (isTight) {
    return (
      <div ref={desktopRef} className="hidden lg:flex flex-col gap-3 w-full min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <NavControls
              calendarApi={calendarApi}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
            />
            {view === "timeGridWeek" || view === "week" ? (
              <WeekPopover
                calendarApi={calendarApi}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
              />
            ) : (
              <CalendarHeaderPopover
                calendarApi={calendarApi}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
              />
            )}
            <TodayButton
              calendarApi={calendarApi}
              setCurrentDate={setCurrentDate}
              isTodayInRange={isTodayInRange}
            />
          </div>
          <div className="shrink-0">
            <ViewToggle calendarApi={calendarApi} view={view} setView={setView} />
          </div>
        </div>
        <div className="w-full min-w-0">
          <SearchBox
            inputRef={inputRef}
            search={search}
            setSearch={setSearch}
            open={open}
            setOpen={setOpen}
            events={events}
            filteredResults={filteredResults}
            paginatedResults={paginatedResults}
            totalPages={totalPages}
            page={page}
            setPage={setPage}
            timezone={timezone}
            timeFormat={timeFormat}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={desktopRef}
      className="hidden lg:flex flex-nowrap items-center justify-between text-sm gap-3 w-full min-w-0"
    >
      {/* Left: nav + today + popover + search */}
      <div className="flex items-center gap-2 flex-nowrap min-w-0 flex-1 overflow-hidden">
        <NavControls
          calendarApi={calendarApi}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
        />
        {view === "timeGridWeek" || view === "week" ? (
          <WeekPopover
            calendarApi={calendarApi}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        ) : (
          <CalendarHeaderPopover
            calendarApi={calendarApi}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        )}
        <TodayButton
          calendarApi={calendarApi}
          setCurrentDate={setCurrentDate}
          isTodayInRange={isTodayInRange}
        />
        <div className="min-w-0 flex-[1_1_220px] max-w-[350px]">
          <SearchBox
            inputRef={inputRef}
            search={search}
            setSearch={setSearch}
            open={open}
            setOpen={setOpen}
            events={events}
            filteredResults={filteredResults}
            paginatedResults={paginatedResults}
            totalPages={totalPages}
            page={page}
            setPage={setPage}
            timezone={timezone}
            timeFormat={timeFormat}
          />
        </div>
      </div>

      {/* Right: view toggle */}
      <div className="shrink-0">
        <ViewToggle calendarApi={calendarApi} view={view} setView={setView} />
      </div>
    </div>
  );
}
