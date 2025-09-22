import { CalendarHeaderPopover } from "@/components/calendar/CalendarHeaderPopover";
import { NavControls } from "@/components/calendar/nav-controls";
import { SearchBox } from "@/components/calendar/search-box";
import { TodayButton } from "@/components/calendar/today-button";
import { ViewToggle } from "@/components/calendar/view-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { useRef, useState } from "react";

export function ToolbarMobile(props) {
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
  } = props;

  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef(null);

  const isEmpty =
    !calendar ||
    (Array.isArray(calendar) && calendar.length === 0) ||
    (!Array.isArray(calendar) && Object.keys(calendar).length === 0);

  if (isEmpty) {
    return (
      <div className="flex flex-col w-full gap-4 lg:hidden">
        {/* Row 1 skeletons */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-20 rounded-md" /> {/* Today */}
          <Skeleton className="h-10 w-28 rounded-md" /> {/* ViewToggle */}
        </div>

        {/* Row 2 skeletons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-20 rounded-md" /> {/* NavControls */}
            <Skeleton className="h-10 w-32 rounded-md" />{" "}
            {/* CalendarHeaderPopover */}
          </div>
          <Skeleton className="h-10 w-10 rounded-md" /> {/* Search button */}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-4 lg:hidden">
      {/* Row 1: Today + toggle */}
      <div className="flex justify-between items-center">
        <TodayButton
          calendarApi={calendarApi}
          setCurrentDate={setCurrentDate}
          isTodayInRange={isTodayInRange}
        />
        <ViewToggle calendarApi={calendarApi} view={view} setView={setView} />
      </div>

      {/* Row 2 */}
      {searchOpen ? (
        <div className="w-full">
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
            setSearchOpen={setSearchOpen}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
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
          </div>

          <Button
            variant="outline"
            size="icon"
            className="rounded shadow-sm border border-solid border-[1px] border-border cursor-pointer"
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
