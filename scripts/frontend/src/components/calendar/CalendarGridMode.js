"use client";

import { EventPopover } from "@/components/calendar/EventPopover";
import { Skeleton } from "@/components/ui/skeleton";
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
  const eventTimeFormat = {
    hour: timeFormat === "24" ? "2-digit" : "numeric",
    minute: "2-digit",
    hour12: timeFormat !== "24",
    ...(timeFormat !== "24" && { omitZeroMinute: true, meridiem: "short" }),
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
        datesSet={({ start, end, view }) => {
          const key = `${start.toISOString()}_${end.toISOString()}`;
          if (lastRangeRef.current === key) return;
          lastRangeRef.current = key;
          loadEventsForView(start, end);
          setCurrentDate(view.currentStart);
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
