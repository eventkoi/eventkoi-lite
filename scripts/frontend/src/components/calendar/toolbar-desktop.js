import { CalendarHeaderPopover } from "@/components/calendar/CalendarHeaderPopover";
import { NavControls } from "@/components/calendar/nav-controls";
import { SearchBox } from "@/components/calendar/search-box";
import { TodayButton } from "@/components/calendar/today-button";
import { ViewToggle } from "@/components/calendar/view-toggle";
import { Skeleton } from "@/components/ui/skeleton";

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

  const isEmpty =
    !calendar ||
    (Array.isArray(calendar) && calendar.length === 0) ||
    (!Array.isArray(calendar) && Object.keys(calendar).length === 0);

  if (isEmpty) {
    return (
      <div className="hidden lg:flex flex-wrap items-center justify-between gap-3 w-full">
        {/* Left skeletons: nav + popover + today + search */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24 rounded-md" /> {/* NavControls */}
          <Skeleton className="h-10 w-32 rounded-md" /> {/* Popover */}
          <Skeleton className="h-10 w-20 rounded-md" /> {/* Today */}
          <Skeleton className="h-10 w-64 rounded-md" /> {/* SearchBox */}
        </div>

        {/* Right skeleton: view toggle */}
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>
    );
  }

  return (
    <div className="hidden lg:flex flex-wrap items-center justify-between text-sm gap-3 w-full">
      {/* Left: nav + today + popover + search */}
      <div className="flex items-center gap-2">
        <NavControls
          calendarApi={calendarApi}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
        />
        <CalendarHeaderPopover
          calendarApi={calendarApi}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
        />
        <TodayButton
          calendarApi={calendarApi}
          setCurrentDate={setCurrentDate}
          isTodayInRange={isTodayInRange}
        />
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

      {/* Right: view toggle */}
      <ViewToggle calendarApi={calendarApi} view={view} setView={setView} />
    </div>
  );
}
