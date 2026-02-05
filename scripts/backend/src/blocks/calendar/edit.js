import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { EventPopover } from "@/components/calendar/EventPopover";
import { TimezonePicker } from "@/components/timezone-picker";
import { getInitialDate, safeNormalizeTimeZone } from "@/lib/date-utils";
import apiRequest from "@wordpress/api-fetch";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import { useEffect, useRef, useState } from "react";

import { formatDate } from "@fullcalendar/core";
import allLocales from "@fullcalendar/core/locales-all";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import luxonPlugin from "@fullcalendar/luxon3";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";

import { Controls } from "./controls.js";

const days = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const wpLocale =
  typeof window !== "undefined" && window.eventkoi_params
    ? window.eventkoi_params.locale
    : "en";

// Convert "de_DE" → "de"
const shortLocale = (wpLocale || "").split("_")[0] || "en";

// Verify if locale exists in FullCalendar bundle
const supported = allLocales.some((l) => l.code === shortLocale);
let localeToUse = supported ? shortLocale : "en";

// Final safety check: ensure browser Intl accepts it
try {
  new Intl.DateTimeFormat(localeToUse);
} catch {
  localeToUse = "en";
}

export default function Edit({
  attributes,
  setAttributes,
  className,
  isSelected,
  clientId,
}) {
  useEffect(() => {
    if (isSelected) {
      document.body.classList.add("eventkoi-active");
    } else {
      document.body.classList.remove("eventkoi-active");
    }
  }, [isSelected]);

  const display = "calendar";
  const timeframe = attributes?.timeframe || "month";

  const [calendarApi, setCalendarApi] = useState(null);
  const [currentDate, setCurrentDate] = useState(getInitialDate(attributes));
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [anchorPos, setAnchorPos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialDate, setInitialDate] = useState(getInitialDate(attributes));

  const lastRangeRef = useRef(null);

  // Get tz from URL query string (highest priority)
  const urlParams = new URLSearchParams(window.location.search);
  const tzFromQuery = urlParams.get("tz"); // e.g. "3", "UTC", "Asia/Singapore"

  // Initialize from WP setting but allow user to change
  const [timeFormat, setTimeFormat] = useState(
    eventkoi_params?.time_format === "24" ? "24" : "12"
  );

  // Determine initial raw timezone with priority: URL > override > WP > UTC
  const initialRawTimezone =
    tzFromQuery ||
    eventkoi_params?.timezone_override ||
    eventkoi_params?.timezone ||
    "UTC";

  // Make it a state so user/components can change it
  const [timezone, setTimezone] = useState(
    safeNormalizeTimeZone(initialRawTimezone)
  );

  const calendarRef = useRef(null);
  const ignoreNextOutsideClick = useRef(false);

  const popoverRootRef = useRef(null);
  const popoverMountRef = useRef(null);

  const { layout } = attributes;

  const fallbackWidth = "1100px";

  const blockProps = useBlockProps({
    className: "eventkoi-admin",
    style: {
      // maxWidth: layout?.contentSize || fallbackWidth,
      marginLeft: "auto",
      marginRight: "auto",
    },
  });

  const [calendar, setCalendar] = useState({});
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [view, setView] = useState();

  // Define calendars once at the top
  const calendars =
    attributes.calendars && attributes.calendars.length > 0
      ? attributes.calendars.map(String).join(",")
      : null;

  let id = attributes.calendar_id;

  if (!id) {
    id = eventkoi_params.default_cal;
  }

  if (calendars) {
    id = calendars;
  }

  const getAdminBarOffset = () => {
    const bar = document.getElementById("wpadminbar");
    return bar ? (window.innerWidth <= 782 ? 46 : 32) : 0;
  };

  const getInitialCalendar = async () => {
    if (calendars) id = calendars;

    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/calendar_events?id=${id}&display=${display}&initial=true`,
        method: "get",
      });

      setCalendar(response.calendar);

      const defaultView =
        timeframe === "week" || response.calendar.timeframe === "week"
          ? "timeGridWeek"
          : "dayGridMonth";

      setView(defaultView);
    } catch (err) {
      console.error("Failed to load calendar info", err);
    }
  };

  const loadEventsForView = async (start, end, currentId = id) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ id: currentId, display });
      if (start) params.set("start", start.toISOString());
      if (end) params.set("end", end.toISOString());

      const calendarEndpoint = `${
        eventkoi_params.api
      }/calendar_events?${params.toString()}`;
      const response = await apiRequest({
        path: calendarEndpoint,
        method: "get",
      });

      setEvents(response.events);
      setCalendar(response.calendar);
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllEvents = async () => {
    try {
      const params = new URLSearchParams({ id, display });
      const response = await apiRequest({
        path: `${eventkoi_params.api}/calendar_events?${params.toString()}`,
        method: "get",
      });
      setAllEvents(response.events);
    } catch (err) {
      console.error("Failed to load all events", err);
    }
  };

  useEffect(() => {
    const newDate = getInitialDate(attributes);

    // if FullCalendar is ready, jump immediately
    if (calendarApi) {
      calendarApi.gotoDate(newDate);
      setCurrentDate(new Date(newDate));
    } else {
      // fallback for first render
      setInitialDate(newDate);
    }
  }, [attributes.default_year, attributes.default_month]);

  useEffect(() => {
    getInitialCalendar();
    loadAllEvents();
  }, [id]);

  useEffect(() => {
    if (!calendarApi) return;

    const { activeStart, activeEnd } = calendarApi.view;
    lastRangeRef.current = null; // reset so next load isn't skipped
    loadEventsForView(activeStart, activeEnd, id);
  }, [id, calendarApi]);

  useEffect(() => {
    if (calendarRef.current && view) {
      const api = calendarRef.current.getApi();
      api.changeView(view);
      setCalendarApi(api);

      const { activeStart, activeEnd } = api.view;
      const key = `${activeStart.toISOString()}_${activeEnd.toISOString()}`;

      if (!lastRangeRef.current) {
        lastRangeRef.current = key; // mark as handled
        loadEventsForView(activeStart, activeEnd);
      }
    }
  }, [view]);

  useEffect(() => {
    document.body.style.position = "relative";
  }, []);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (ignoreNextOutsideClick.current) {
        ignoreNextOutsideClick.current = false;
        return;
      }

      const clickedInsidePopover = e.target.closest("[data-event-popover]");
      const clickedInsideDropdown = e.target.closest(
        "[data-radix-popper-content-wrapper]"
      );

      const dropdownIsOpen =
        document.body.getAttribute("data-calendar-menu-open") === "true";

      const shareModalIsOpen =
        document.body.getAttribute("data-share-modal-open") === "true";

      if (
        !clickedInsidePopover &&
        !clickedInsideDropdown &&
        !shareModalIsOpen &&
        !dropdownIsOpen
      ) {
        setSelectedEvent(null);
        setAnchorPos(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!calendarApi || !currentDate) return;

    const interval = setInterval(() => {
      const todayBtn = document.querySelector(".fc-today-button");

      if (todayBtn && !document.getElementById("eventkoi-month-portal")) {
        const mount = document.createElement("div");
        mount.id = "eventkoi-month-portal";
        mount.className = "flex m-0";

        todayBtn.parentNode.insertBefore(mount, todayBtn);

        popoverMountRef.current = mount;
        popoverRootRef.current = createRoot(mount);

        popoverRootRef.current.render(
          <CalendarHeaderPopover
            calendarApi={calendarApi}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        );

        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [calendarApi]);

  const startday = attributes?.startday
    ? attributes.startday
    : calendar?.startday;

  const eventColor = attributes?.color
    ? attributes.color
    : eventkoi_params.default_color;

  const eventTimeFormat = {
    hour: timeFormat === "24" ? "2-digit" : "numeric",
    minute: "2-digit",
    hour12: timeFormat !== "24",
    ...(timeFormat !== "24" && {
      omitZeroMinute: true,
      meridiem: "short",
    }),
  };
  const usesMeridiem = /^en/i.test(localeToUse);
  const resolvedLocalTz =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : null;
  const calendarTimeZone =
    timezone === "local"
      ? resolvedLocalTz || "UTC"
      : timezone
      ? timezone
      : null;
  const formatInCalendarTz = (date, options) => {
    const opts = calendarTimeZone
      ? { ...options, timeZone: calendarTimeZone }
      : options;

    try {
      return new Intl.DateTimeFormat(localeToUse, opts).format(date);
    } catch {
      return new Intl.DateTimeFormat(localeToUse, options).format(date);
    }
  };

  const normalizeTimeValue = (value) => {
    if (!value) return null;
    if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
      return value;
    }
    if (/^\d{2}:\d{2}$/.test(value)) {
      return `${value}:00`;
    }
    return null;
  };

  const formatSlotLabel = (date) => {
    if (timeFormat === "24") {
      return null;
    }

    const formatted = formatInCalendarTz(date, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const withoutZeroMinutes = formatted.replace(/:00\b/, "");

    if (!usesMeridiem) {
      return withoutZeroMinutes;
    }

    return withoutZeroMinutes.replace(/\s?([ap])\.?m?$/i, (match, part) => {
      return ` ${part.toUpperCase()}M`;
    });
  };

  const globalDayStart = eventkoi_params?.day_start_time || "00:00";
  const dayStartTime = calendar?.day_start_time || globalDayStart;
  const slotMinTime = "00:00:00";
  const slotMaxTime = "24:00:00";
  const scrollTime = normalizeTimeValue(dayStartTime) || "07:00:00";
  const isTimeGridView = typeof view === "string" && view.startsWith("timeGrid");
  const startHour = parseInt(scrollTime.slice(0, 2), 10);
  const endHour = 23; // 11pm
  const visibleHours = Number.isFinite(startHour)
    ? Math.max(1, endHour - startHour + 1)
    : 17; // fallback 7 AM → 11 PM
  const slotMinutes = 30;
  const slotHeightMap = {
    1: 23.9,
    2: 24.1,
    3: 24.2,
    4: 24.4,
    5: 24.6,
    6: 24.8,
    7: 25.0,
    8: 25.2,
    9: 25.5,
    10: 25.8,
    11: 26.2,
    12: 26.6,
    13: 27.2,
    14: 27.8,
    15: 28.6,
    16: 29.4,
    17: 30.7,
    18: 32.4,
    19: 34.6,
    20: 38,
    21: 43,
    22: 54,
    23: 89,
  };
  const slotHeightPx =
    Number.isFinite(startHour) && slotHeightMap[startHour]
      ? slotHeightMap[startHour]
      : 25;
  const slotsToShow = visibleHours * (60 / slotMinutes);
  const useDefaultTimeGrid =
    !Number.isFinite(startHour) || startHour === 0;
  const timeGridHeight = useDefaultTimeGrid
    ? "auto"
    : slotsToShow * slotHeightPx;

  return (
    <div {...blockProps}>
      <InspectorControls>
        <Controls
          calendar={calendar}
          attributes={attributes}
          setAttributes={setAttributes}
          className={className}
          isSelected={isSelected}
          clientId={clientId}
          setView={setView}
        />
      </InspectorControls>

      <div
        id={
          view === "dayGridMonth"
            ? "month"
            : view === "timeGridWeek"
            ? "week"
            : "day"
        }
      >
        <div className="relative">
          <CalendarToolbar
            calendarApi={calendarApi}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            view={view}
            setView={setView}
            search={search}
            setSearch={setSearch}
            events={allEvents}
            timezone={timezone ? timezone : undefined}
            timeFormat={timeFormat}
          />

          {/* Timezone switcher */}
          <div className="flex justify-start md:justify-end py-4 text-sm text-foreground">
            <TimezonePicker
              timezone={timezone}
              setTimezone={setTimezone}
              timeFormat={timeFormat}
              setTimeFormat={setTimeFormat}
            />
          </div>

          <FullCalendar
            key={timezone}
            ref={calendarRef}
            locales={allLocales}
            locale={localeToUse}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, luxonPlugin]}
            events={events}
            initialView={view}
            initialDate={initialDate}
            weekends={true}
            timeZone={calendarTimeZone || "UTC"}
            firstDay={days[startday]}
            eventColor={eventColor}
            headerToolbar={false}
            contentHeight={isTimeGridView ? timeGridHeight : "auto"}
            expandRows={!isTimeGridView}
            height={isTimeGridView ? timeGridHeight : "auto"}
            slotMinTime={slotMinTime}
            slotMaxTime={slotMaxTime}
            scrollTime={scrollTime}
            scrollTimeReset={false}
            eventTimeFormat={eventTimeFormat}
            slotLabelContent={(args) => {
              const label = formatSlotLabel(args.date);
              return label ? <span>{label}</span> : null;
            }}
            dayHeaderContent={(args) => {
              const { date, view } = args;
              const headerTz = view?.calendar?.getOption("timeZone") || "UTC";
              const dayName = formatDate(date, {
                weekday: "short",
                locale: localeToUse,
                timeZone: headerTz,
              });

              // For week/day views → two lines: weekday + bold number
              if (view.type.startsWith("timeGrid")) {
                const dayNum = formatDate(date, {
                  day: "numeric",
                  locale: localeToUse,
                  timeZone: headerTz,
                });
                const dayKey = formatDate(date, {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  timeZone: headerTz,
                });
                const todayKey = formatDate(new Date(), {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  timeZone: headerTz,
                });
                const isToday = dayKey === todayKey;
                return (
                  <div className="flex flex-col items-center leading-tight">
                    <span className={isToday ? "font-semibold" : undefined}>
                      {dayName}
                    </span>
                    <span
                      className={
                        isToday
                          ? "mt-0.5 inline-flex min-h-[2rem] min-w-[2rem] items-center justify-center rounded-full bg-muted px-2 text-base font-semibold"
                          : "mt-0.5 inline-flex min-h-[2rem] min-w-[2rem] items-center justify-center rounded-full bg-transparent px-2 text-base font-semibold"
                      }
                    >
                      {dayNum}
                    </span>
                  </div>
                );
              }

              // For month or list views → just the weekday name
              return <span>{dayName}</span>;
            }}
            datesSet={({ start, end, view }) => {
              // Create a unique key for this range
              const key = `${start.toISOString()}_${end.toISOString()}`;

              // If we already processed this exact range, do nothing
              if (lastRangeRef.current === key) {
                return;
              }

              // Otherwise, store it and continue
              lastRangeRef.current = key;

              loadEventsForView(start, end, id);
              setCurrentDate(view.currentStart);
              if (view.type.startsWith("timeGrid")) {
                setTimeout(() => {
                  const api = calendarRef?.current?.getApi?.();
                  api?.scrollToTime?.(scrollTime);
                }, 0);
              }

              // Trigger popover re-render
              if (popoverRootRef.current && popoverMountRef.current) {
                popoverRootRef.current.render(
                  <CalendarHeaderPopover
                    calendarApi={calendarApi}
                    currentDate={view.currentStart}
                    setCurrentDate={setCurrentDate}
                  />
                );
              }
            }}
            eventClick={(info) => {
              info.jsEvent.preventDefault();
              info.jsEvent.stopPropagation();

              const enriched = {
                ...info.event.extendedProps,
                title: info.event.title,
                start: info.event.startStr,
                end: info.event.endStr,
                allDay: info.event.allDay,
                url: info.event.url,
              };

              const anchorEl = info.el;
              if (!anchorEl) return;

              requestAnimationFrame(() => {
                setTimeout(() => {
                  const calendarContainer = document.querySelector(".fc");
                  const containerRect =
                    calendarContainer.getBoundingClientRect();

                  const rect = anchorEl.getBoundingClientRect();

                  const relY = rect.bottom - containerRect.top + 6;
                  const popoverWidth = 370;

                  let relX;
                  if (
                    rect.right - containerRect.left + popoverWidth >
                    containerRect.width
                  ) {
                    relX = rect.right - containerRect.left - popoverWidth;
                  } else {
                    relX = rect.left - containerRect.left;
                  }

                  if (window.innerWidth < 768) {
                    setAnchorPos({ x: 0, y: relY });
                  } else {
                    setAnchorPos({ x: Math.max(0, relX), y: relY });
                  }
                }, 0);
              });

              setSelectedEvent(enriched);
            }}
          />

          {selectedEvent && anchorPos && (
            <EventPopover
              event={selectedEvent}
              anchor={anchorPos}
              onClose={() => {
                setSelectedEvent(null);
                setAnchorPos(null);
              }}
              ignoreNextOutsideClick={ignoreNextOutsideClick}
              timezone={timezone ? timezone : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
