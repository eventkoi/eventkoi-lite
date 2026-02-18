import { CalendarHeaderPopover } from "@/components/calendar/CalendarHeaderPopover";
import { NavControls } from "@/components/calendar/nav-controls";
import { SearchBox } from "@/components/calendar/search-box";
import { TodayButton } from "@/components/calendar/today-button";
import { ViewToggle } from "@/components/calendar/view-toggle";
import { useEffect, useRef, useState } from "react";
import { WeekPopover } from "./WeekPopover";

export function ToolbarDesktop(props) {
  const {
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
