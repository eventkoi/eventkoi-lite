"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { TimezonePicker } from "@/components/timezone-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNormalizeTimeZone } from "@/lib/date-utils";

import { CalendarGridMode } from "@/components/calendar/CalendarGridMode";
import { CalendarListMode } from "@/components/calendar/CalendarListMode";
import { useCalendarData } from "@/components/calendar/useCalendarData";
import { useEventPopover } from "@/components/calendar/useEventPopover";

/**
 * Main EventKoi Calendar component.
 *
 * Handles timezone persistence, time format switching,
 * and dynamic rendering of either Grid or List mode.
 */
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
    loading,
    listTotal,
    listHasMore,
    listLoadingMore,
    loadMoreListEvents,
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

  /**
   * Determine initial timezone from URL (?tz=), override, or site default.
   *
   * Falls back to UTC if no valid timezone is found.
   */
  const getInitialTimezone = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tzParam = params.get("tz");
      if (tzParam) {
        return safeNormalizeTimeZone(tzParam);
      }
    }

    if (eventkoi_params?.auto_detect_timezone) {
      return "local";
    }

    return safeNormalizeTimeZone(
      eventkoi_params?.timezone_override || eventkoi_params?.timezone || "UTC"
    );
  };

  const [timezone, setTimezone] = useState(() => getInitialTimezone());
  const [timeFormat, setTimeFormat] = useState(
    eventkoi_params?.time_format === "24" ? "24" : "12"
  );

  /**
   * Keep timezone in sync when navigating via browser back/forward buttons.
   */
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tzParam = params.get("tz");
      if (tzParam) {
        setTimezone(safeNormalizeTimeZone(tzParam));
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const isEmpty =
    !calendar ||
    (Array.isArray(calendar) && calendar.length === 0) ||
    (!Array.isArray(calendar) && Object.keys(calendar).length === 0);

  const eventColor = props.color || calendar?.color;

  if (display === "list") {
    return (
      <CalendarListMode
        events={allEvents}
        timezone={timezone}
        setTimezone={setTimezone}
        timeFormat={timeFormat}
        setTimeFormat={setTimeFormat}
        showImage={showImage}
        showDescription={showDescription}
        showLocation={showLocation}
        borderStyle={borderStyle}
        borderSize={borderSize}
        loading={loading}
        total={listTotal}
        hasMore={listHasMore}
        loadingMore={listLoadingMore}
        onLoadMore={loadMoreListEvents}
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
        calendarRef={calendarRef}
        events={events}
        view={view}
        timezone={timezone}
        setCurrentDate={setCurrentDate}
        lastRangeRef={lastRangeRef}
        loadEventsForView={loadEventsForView}
        selectedEvent={selectedEvent}
        setSelectedEvent={setSelectedEvent}
        anchorPos={anchorPos}
        setAnchorPos={setAnchorPos}
        ignoreNextOutsideClick={ignoreNextOutsideClick}
        calendar={calendar}
        isEmpty={isEmpty}
        eventColor={eventColor}
        timeFormat={timeFormat}
        startday={startday}
        initialDate={initialDate}
      />
    </div>
  );
}

/**
 * Auto-mount EventKoi Calendar instances.
 *
 * Detects all matching DOM elements and mounts the React Calendar.
 *
 * @param {HTMLElement|Document} rootElement The root element to search within.
 */
export function mountEventKoiCalendars(rootElement = document) {
  const elements = rootElement.querySelectorAll('[id^="eventkoi-calendar-"]');

  elements.forEach((el) => {
    // Prevent double mounting.
    if (el.dataset.eventkoiMounted) {
      return;
    }

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
        orderby={el.getAttribute("data-orderby")}
        order={el.getAttribute("data-order")}
        perPage={el.getAttribute("data-per-page")}
        maxResults={el.getAttribute("data-max-results")}
        dateStart={el.getAttribute("data-date-start")}
        dateEnd={el.getAttribute("data-date-end")}
      />
    );

    // Mark as mounted.
    el.dataset.eventkoiMounted = "true";
  });
}

// Mount on load and expose globally.
if (typeof window !== "undefined") {
  mountEventKoiCalendars();
  window.eventkoiInitCalendars = mountEventKoiCalendars;
}
