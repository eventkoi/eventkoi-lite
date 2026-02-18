"use client";

import { EventPopover } from "@/components/calendar/EventPopover";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@fullcalendar/core";
import allLocales from "@fullcalendar/core/locales-all";
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

export function CalendarGridMode({
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
  eventColor,
  timeFormat,
  startday,
  initialDate,
}) {
  // Determine whether locale uses AM/PM
  const usesMeridiem = /^en/i.test(localeToUse);
  const resolvedLocalTz =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : null;
  const calendarTimeZone =
    timezone === "local"
      ? resolvedLocalTz || "UTC"
      : timezone && timezone !== "local"
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

  const eventTimeFormat =
    timeFormat === "24"
      ? {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      : {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          ...(usesMeridiem && {
            omitZeroMinute: true,
            meridiem: "short", // only for English-style locales
          }),
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

  const globalDayStart = eventkoi_params?.day_start_time || "00:00";
  const dayStartTime = calendar?.day_start_time || globalDayStart;
  const slotMinTime = "00:00:00";
  const slotMaxTime = "24:00:00";
  const scrollTime = normalizeTimeValue(dayStartTime) || "07:00:00";
  const isTimeGridView =
    typeof view === "string" && view.startsWith("timeGrid");
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
  const slotsToShow = visibleHours * (60 / slotMinutes); // 28 for 9am
  const useDefaultTimeGrid =
    !Number.isFinite(startHour) || startHour === 0;
  const timeGridHeight = useDefaultTimeGrid
    ? "auto"
    : slotsToShow * slotHeightPx;

  if (isEmpty) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  // Apply per-event calendar color
  const coloredEvents = Array.isArray(events)
    ? events.map((ev) => ({
        ...ev,
        color: ev.calendar_color,
        borderColor: ev.calendar_color,
      }))
    : [];

  let start_day = days[startday || calendar?.startday || "sunday"];

  return (
    <>
      <FullCalendar
        key={timezone}
        ref={calendarRef}
        locales={allLocales}
        locale={localeToUse}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, luxonPlugin]}
        events={coloredEvents}
        timeZone={calendarTimeZone || "UTC"}
        initialView={view}
        initialDate={initialDate}
        weekends={true}
        firstDay={start_day}
        headerToolbar={false}
        contentHeight={isTimeGridView ? timeGridHeight : "auto"}
        expandRows={!isTimeGridView}
        height={isTimeGridView ? timeGridHeight : "auto"}
        slotMinTime={slotMinTime}
        slotMaxTime={slotMaxTime}
        scrollTime={scrollTime}
        eventTimeFormat={eventTimeFormat}
        slotLabelContent={(args) => {
          const label = formatSlotLabel(args.date);
          return label ? <span>{label}</span> : null;
        }}
        dayHeaderContent={(args) => {
          const { date, view } = args;
          const headerTz = view?.calendar?.getOption("timeZone") || "UTC";
          const formatHeaderDate = (value, options) => {
            if (view?.type?.startsWith("timeGrid") && view?.calendar?.formatDate) {
              return view.calendar.formatDate(value, {
                ...options,
                locale: localeToUse,
              });
            }

            return formatDate(value, {
              ...options,
              locale: localeToUse,
              timeZone: headerTz,
            });
          };

          const dayName = formatHeaderDate(date, {
            weekday: "short",
          });

          // For week/day views → two lines: weekday + bold number
          if (view.type.startsWith("timeGrid")) {
            const dayNum = formatHeaderDate(date, {
              day: "numeric",
            });
            const dayKey = formatHeaderDate(date, {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });
            const todayKey = formatHeaderDate(new Date(), {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
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
          const key = `${start.toISOString()}_${end.toISOString()}`;
          if (lastRangeRef.current === key) return;
          lastRangeRef.current = key;
          loadEventsForView(start, end);
          setCurrentDate(view.currentStart);
          if (view.type.startsWith("timeGrid")) {
            setTimeout(() => {
              const api = calendarRef?.current?.getApi?.();
              api?.scrollToTime?.(scrollTime);
            }, 0);
          }
        }}
        eventDidMount={(info) => {
          const parent = info.el.parentNode;

          // If it's an <a>, remove it completely and reinsert our own <div>.
          if (info.el.tagName === "A") {
            const div = document.createElement("div");

            // Copy classes and content
            div.className = info.el.className;
            div.innerHTML = info.el.innerHTML;

            // Copy all attributes except href
            for (const attr of info.el.attributes) {
              if (attr.name !== "href") {
                div.setAttribute(attr.name, attr.value);
              }
            }

            // Replace <a> with <div>
            parent.replaceChild(div, info.el);
            info.el = div; // update reference
          }

          // Add pointer cursor and accessibility attributes
          info.el.setAttribute("role", "button");
          info.el.setAttribute("tabindex", "0");
          info.el.setAttribute(
            "aria-label",
            `${info.event.title}, starts ${info.event.start.toLocaleString()}`,
          );

          // Attach click handler to open your popover
          info.el.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            const rect = info.el.getBoundingClientRect();
            const containerRect = document
              .querySelector(".fc")
              .getBoundingClientRect();
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

            setSelectedEvent({
              ...info.event.extendedProps,
              title: info.event.title,
              start: info.event.startStr,
              end: info.event.endStr,
              allDay: info.event.allDay,
              url: info.event.url,
            });
          });

          // Keyboard accessibility (Enter / Space)
          info.el.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              info.el.click();
            }
          });

          // Wait for FullCalendar to finish injecting its own <a>
          setTimeout(() => {
            const harness = info.el.closest(".fc-daygrid-event-harness");
            if (!harness) return;

            // Find all anchors in this harness except our main div (info.el)
            harness.querySelectorAll("a.fc-daygrid-event").forEach((anchor) => {
              // Hide only if it's not the same node
              if (anchor !== info.el) {
                anchor.setAttribute("aria-hidden", "true");
                anchor.setAttribute("tabindex", "-1");
                anchor.style.display = "none";
                anchor.style.pointerEvents = "none";
              }
            });
          }, 0);
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
          timezone={timezone}
        />
      )}
    </>
  );
}
