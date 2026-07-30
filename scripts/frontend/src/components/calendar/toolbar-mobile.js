import { __ } from "@wordpress/i18n";
import { CalendarHeaderPopover } from "@/components/calendar/CalendarHeaderPopover";
import { NavControls } from "@/components/calendar/nav-controls";
import { SearchBox } from "@/components/calendar/search-box";
import { SubscribeButton } from "@/components/calendar/subscribe-button";
import { TodayButton } from "@/components/calendar/today-button";
import { ViewToggle } from "@/components/calendar/view-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { useRef, useState } from "react";
import { WeekPopover } from "./WeekPopover";

export function ToolbarMobile(props) {
  const {
    calendar,
    calendarApi,
    currentDate,
    setCurrentDate,
    view,
    setView,
    display,
    setDisplay,
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
    onSearchScopePrev,
    onSearchScopeNext,
    feedUrl,
    feedWebcal,
  } = props;

  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef(null);

  const isEmpty =
    !calendar ||
    (Array.isArray(calendar) && calendar.length === 0) ||
    (!Array.isArray(calendar) && Object.keys(calendar).length === 0);

  if (isEmpty) {
    return (
      <div className="ek-mobile-only flex-col w-full gap-4">
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
    <div className="ek-mobile-only flex-col w-full gap-4">
      {/* Row 1: Today + toggle. Wraps so Subscribe + the three-option view
          toggle never overflow narrow phones. */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <TodayButton
          calendarApi={calendarApi}
          setCurrentDate={setCurrentDate}
          isTodayInRange={isTodayInRange}
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <SubscribeButton feedUrl={feedUrl} feedWebcal={feedWebcal} />
          <ViewToggle calendarApi={calendarApi} view={view} setView={setView} display={display} setDisplay={setDisplay} />
        </div>
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
            searchScope={searchScope}
            onSearchScopePrev={onSearchScopePrev}
            onSearchScopeNext={onSearchScopeNext}
            setSearchOpen={setSearchOpen}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <NavControls
              calendarApi={calendarApi}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              timezone={timezone}
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
                timezone={timezone}
              />
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="rounded shadow-sm border border-solid border-border cursor-pointer"
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">{__("Search events", "eventkoi-lite")}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
