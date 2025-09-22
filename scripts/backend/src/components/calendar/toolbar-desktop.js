import { CalendarHeaderPopover } from "@/components/calendar/CalendarHeaderPopover";
import { NavControls } from "@/components/calendar/nav-controls";
import { SearchBox } from "@/components/calendar/search-box";
import { TodayButton } from "@/components/calendar/today-button";
import { ViewToggle } from "@/components/calendar/view-toggle";

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
