"use client";

import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CalendarHeaderPopover } from "@/components/calendar/CalendarHeaderPopover";
import { EventPopover } from "@/components/calendar/EventPopover";
import { ListView } from "@/components/calendar/list-view";
import { TimezonePicker } from "@/components/timezone-picker";
import { safeNormalizeTimeZone } from "@/lib/date-utils";
import { groupTimezones } from "@/lib/utils";
import apiRequest from "@wordpress/api-fetch";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import luxonPlugin from "@fullcalendar/luxon3";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";

const days = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function Calendar({
  id,
  display = "calendar",
  calendars = "",
  startday = "",
  timeframe = "",
  color = "",
  showImage = "yes",
  showDescription = "yes",
  showLocation = "yes",
  borderStyle = "dotted",
  borderSize = "2px",
}) {
  const [calendar, setCalendar] = useState({});
  const [events, setEvents] = useState([]);
  const [view, setView] = useState();
  const [calendarApi, setCalendarApi] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [anchorPos, setAnchorPos] = useState(null);
  const [search, setSearch] = useState("");

  const tzGroups = groupTimezones();

  // Get tz from URL query string (highest priority)
  const urlParams = new URLSearchParams(window.location.search);
  const tzFromQuery = urlParams.get("tz"); // e.g. "3", "UTC", "Asia/Singapore"

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

  const getAdminBarOffset = () => {
    const bar = document.getElementById("wpadminbar");
    return bar ? (window.innerWidth <= 782 ? 46 : 32) : 0;
  };

  const getInitialCalendar = async () => {
    if (calendars) id = calendars;

    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/calendar_events?id=${id}&display=${display}`,
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

  const loadEventsForView = async () => {
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/calendar_events?id=${id}&display=${display}`,
        method: "get",
      });

      setEvents(response.events);
      setCalendar(response.calendar);
      console.log(response.events);
    } catch (err) {
      console.error("Failed to load events", err);
    }
  };

  useEffect(() => {
    getInitialCalendar();
  }, []);

  useEffect(() => {
    if (display === "list") {
      loadEventsForView();
    }
  }, [display, id]);

  useEffect(() => {
    if (calendarRef.current && view) {
      const api = calendarRef.current.getApi();
      api.changeView(view);
      setCalendarApi(api);
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

  if (!view) return null;

  if (display === "list") {
    return (
      <>
        <ListView
          events={events}
          showImage={showImage}
          showDescription={showDescription}
          showLocation={showLocation}
          borderStyle={borderStyle}
          borderSize={borderSize}
        />
        {/* Timezone info footer */}
        <div className="pt-[30px] text-sm text-muted-foreground">
          All event times above are shown in:{" "}
          <TimezonePicker timezone={timezone} setTimezone={setTimezone} />
        </div>
      </>
    );
  }

  startday = startday || calendar?.startday;
  const eventColor = color || calendar?.color;

  return (
    <div className="relative">
      <CalendarToolbar
        calendarApi={calendarApi}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        view={view}
        setView={setView}
        search={search}
        setSearch={setSearch}
        events={events}
        timezone={timezone ? timezone : undefined}
      />

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, luxonPlugin]}
        events={events}
        initialView={view}
        weekends={true}
        timeZone={timezone}
        firstDay={days[startday]}
        eventColor={eventColor}
        headerToolbar={false}
        eventTimeFormat={{
          hour: "numeric",
          minute: "2-digit",
          omitZeroMinute: true,
          meridiem: "short",
        }}
        datesSet={({ start, end, view }) => {
          loadEventsForView(start, end);
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

          const anchorEl = info.el.closest(".fc-daygrid-event") || info.el;
          if (!anchorEl) return;

          requestAnimationFrame(() => {
            setTimeout(() => {
              const rect = anchorEl.getBoundingClientRect();
              const adminBarOffset = getAdminBarOffset();

              setAnchorPos({
                x: rect.left + window.scrollX,
                y: rect.bottom + window.scrollY + 8 - adminBarOffset,
              });
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

      {/* Timezone info footer */}
      <div className="pt-[30px] text-center text-sm text-muted-foreground">
        All event times above are shown in:{" "}
        <TimezonePicker timezone={timezone} setTimezone={setTimezone} />
      </div>
    </div>
  );
}

// Mount all calendar blocks
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
    />
  );
});
