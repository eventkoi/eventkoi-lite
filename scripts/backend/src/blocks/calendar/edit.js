import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { EventPopover } from "@/components/calendar/EventPopover";
import { TimezonePicker } from "@/components/timezone-picker";
import { getInitialDate, safeNormalizeTimeZone } from "@/lib/date-utils";
import apiRequest from "@wordpress/api-fetch";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import { useEffect, useRef, useState } from "react";

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
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, luxonPlugin]}
            events={events}
            initialView={view}
            initialDate={initialDate}
            weekends={true}
            timeZone={timezone}
            firstDay={days[startday]}
            eventColor={eventColor}
            headerToolbar={false}
            contentHeight="auto"
            expandRows={true}
            height="auto"
            eventTimeFormat={eventTimeFormat}
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
