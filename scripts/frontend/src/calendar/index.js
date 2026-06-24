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
import publicApi from "@/lib/public-api";

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

  // Active display is stateful so the view toggle can switch between the
  // calendar grid and the list in place. Initialised from the block's
  // `display` attribute (which also acts as the default view).
  const [activeDisplay, setActiveDisplay] = useState(
    display === "list" ? "list" : "calendar"
  );
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const effectiveId = calendars || id;
  const trimmedSearch = (search || "").trim();
  const isGlobalSearch = trimmedSearch.length > 0;

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
  } = useCalendarData({
    ...props,
    display: activeDisplay,
    searchTerm: trimmedSearch,
    calendarRef,
  });

  const {
    selectedEvent,
    setSelectedEvent,
    anchorPos,
    setAnchorPos,
    ignoreNextOutsideClick,
  } = useEventPopover();

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

  /**
   * Global calendar search: fetch matching events across all dates (not just the
   * visible month) so a search in one month surfaces events in any other month.
   * Debounced; clears when the box is emptied.
   */
  useEffect(() => {
    if (!isGlobalSearch || activeDisplay === "list") {
      setSearchResults([]);
      return undefined;
    }

    let active = true;
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          id: String(effectiveId),
          display: "calendar",
          search: trimmedSearch,
          tz: timezone === "local" ? "local" : timezone,
        });
        const res = await publicApi({
          path: `/calendar_events?${params.toString()}`,
          method: "get",
        });
        if (active) {
          setSearchResults(Array.isArray(res?.events) ? res.events : []);
        }
      } catch {
        if (active) {
          setSearchResults([]);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [isGlobalSearch, trimmedSearch, effectiveId, activeDisplay, timezone]);

  const isEmpty =
    !calendar ||
    (Array.isArray(calendar) && calendar.length === 0) ||
    (!Array.isArray(calendar) && Object.keys(calendar).length === 0);

  const eventColor = props.color || calendar?.color;

  return (
    <div className="relative">
      <CalendarToolbar
        calendar={calendar}
        calendarApi={calendarRef.current?.getApi()}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        view={view}
        setView={setView}
        display={activeDisplay}
        setDisplay={setActiveDisplay}
        events={isGlobalSearch ? searchResults : allEvents}
        globalSearch={isGlobalSearch}
        timezone={timezone}
        timeFormat={timeFormat}
        search={search}
        setSearch={setSearch}
      />

      {activeDisplay === "calendar" && (
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
      )}

      {activeDisplay === "list" ? (
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
      ) : (
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
          initialDate={currentDate || initialDate}
        />
      )}
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
