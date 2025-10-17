"use client";

import { EventPopover } from "@/components/calendar/EventPopover";
import { Skeleton } from "@/components/ui/skeleton";
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
const shortLocale = wpLocale.split("_")[0];

// Optional: verify if the locale exists in the bundle
const supported = allLocales.some((l) => l.code === shortLocale);
const localeToUse = supported ? shortLocale : "en";

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

  return (
    <>
      <FullCalendar
        ref={calendarRef}
        locales={allLocales}
        locale={localeToUse}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, luxonPlugin]}
        events={events}
        initialView={view}
        initialDate={initialDate}
        weekends={true}
        timeZone={timezone}
        firstDay={days[startday || calendar?.startday || "sunday"]}
        eventColor={eventColor}
        headerToolbar={false}
        contentHeight="auto"
        expandRows={true}
        height="auto"
        eventTimeFormat={eventTimeFormat}
        dayHeaderContent={(args) => {
          const date = args.date;
          const dayName = date.toLocaleDateString("en-US", {
            weekday: "short",
          });
          const dayNum = date.getDate();
          return (
            <span className="space-x-px sm:space-x-2">
              <span>{dayName}</span>
              <span>{dayNum}</span>
            </span>
          );
        }}
        datesSet={({ start, end, view }) => {
          const key = `${start.toISOString()}_${end.toISOString()}`;
          if (lastRangeRef.current === key) return;
          lastRangeRef.current = key;
          loadEventsForView(start, end);
          setCurrentDate(view.currentStart);
        }}
        eventDidMount={(info) => {
          // Make event focusable
          info.el.setAttribute("tabindex", "0");
          info.el.setAttribute("role", "button");

          // Screen reader description
          info.el.setAttribute(
            "aria-label",
            `${info.event.title}, starts ${info.event.start.toLocaleString()}`
          );

          // Keyboard activation
          info.el.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              info.el.click();
            }
          });
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
          timezone={timezone}
        />
      )}
    </>
  );
}
