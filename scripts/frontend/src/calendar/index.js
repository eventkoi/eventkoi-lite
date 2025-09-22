"use client";

import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { TimezonePicker } from "@/components/timezone-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNormalizeTimeZone } from "@/lib/date-utils";

import { CalendarGridMode } from "@/components/calendar/CalendarGridMode";
import { CalendarListMode } from "@/components/calendar/CalendarListMode";
import { useCalendarData } from "@/components/calendar/useCalendarData";
import { useEventPopover } from "@/components/calendar/useEventPopover";

export function Calendar(props) {
  const {
    display,
    id,
    calendars,
    showImage,
    showDescription,
    showLocation,
    borderStyle,
    borderSize,
    startday,
  } = props;

  const calendarRef = useRef(null);

  const {
    calendar,
    events,
    allEvents,
    view,
    setView,
    currentDate,
    setCurrentDate,
    initialDate,
    loadEventsForView,
    lastRangeRef,
  } = useCalendarData({ ...props, calendarRef });

  const {
    selectedEvent,
    setSelectedEvent,
    anchorPos,
    setAnchorPos,
    ignoreNextOutsideClick,
  } = useEventPopover();

  const [search, setSearch] = useState("");

  const [timezone, setTimezone] = useState(
    safeNormalizeTimeZone(
      eventkoi_params?.timezone_override || eventkoi_params?.timezone || "UTC"
    )
  );
  const [timeFormat, setTimeFormat] = useState(
    eventkoi_params?.time_format === "24" ? "24" : "12"
  );

  const isEmpty =
    !calendar ||
    (Array.isArray(calendar) && calendar.length === 0) ||
    (!Array.isArray(calendar) && Object.keys(calendar).length === 0);

  if (display === "list") {
    return (
      <CalendarListMode
        {...{
          events: allEvents,
          timezone,
          setTimezone,
          timeFormat,
          setTimeFormat,
          showImage,
          showDescription,
          showLocation,
          borderStyle,
          borderSize,
        }}
      />
    );
  }

  return (
    <div className="relative">
      <CalendarToolbar
        calendar={calendar}
        calendarApi={calendarRef.current?.getApi()}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        view={view}
        setView={setView}
        events={allEvents}
        timezone={timezone}
        timeFormat={timeFormat}
        search={search}
        setSearch={setSearch}
      />

      <div className="flex justify-start md:justify-end py-4 text-sm text-foreground">
        {isEmpty ? (
          <Skeleton className="h-5 w-40 rounded-md" />
        ) : (
          <TimezonePicker
            timezone={timezone}
            setTimezone={setTimezone}
            timeFormat={timeFormat}
            setTimeFormat={setTimeFormat}
          />
        )}
      </div>

      <CalendarGridMode
        {...{
          calendarRef,
          events,
          view,
          timezone,
          setCurrentDate,
          lastRangeRef,
          loadEventsForView,
          selectedEvent,
          setSelectedEvent,
          anchorPos,
          setAnchorPos,
          ignoreNextOutsideClick,
          calendar,
          isEmpty,
          eventColor: props.color || calendar?.color,
          timeFormat,
          startday,
          initialDate,
        }}
      />
    </div>
  );
}

// Auto-mount
document.querySelectorAll('[id^="eventkoi-calendar-"]').forEach((el) => {
  const root = createRoot(el);
  root.render(
    <Calendar
      id={el.getAttribute("data-calendar-id")}
      calendars={el.getAttribute("data-calendars")}
      display={el.getAttribute("data-display")}
      startday={el.getAttribute("data-startday")}
      timeframe={el.getAttribute("data-timeframe")}
      color={el.getAttribute("data-color")}
      showImage={el.getAttribute("data-show-image")}
      showLocation={el.getAttribute("data-show-location")}
      showDescription={el.getAttribute("data-show-description")}
      borderStyle={el.getAttribute("data-border-style")}
      borderSize={el.getAttribute("data-border-size")}
      context={el.getAttribute("data-context")}
      defaultMonth={el.getAttribute("data-default-month")}
      defaultYear={el.getAttribute("data-default-year")}
    />
  );
});
