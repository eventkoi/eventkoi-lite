import { useEffect, useRef, useState } from "react";

import apiRequest from "@wordpress/api-fetch";

import { InspectorControls, useBlockProps } from "@wordpress/block-editor";

import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
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
  var attrs = {};

  const blockProps = useBlockProps(attrs);

  const [calendar, setCalendar] = useState({});
  const [events, setEvents] = useState([]);
  const [view, setView] = useState();

  let id = attributes.calendar_id;

  if (!id) {
    id = eventkoi_params.default_cal;
  }

  if (attributes.calendars && attributes.calendars.length > 0) {
    id = attributes.calendars.map(String).join(",");
  }

  const getCalendar = async () => {
    await apiRequest({
      path: `${eventkoi_params.api}/calendar_events?id=${id}`,
      method: "get",
    })
      .then((response) => {
        setEvents(response.events);
        setCalendar(response.calendar);
        let timeframe =
          response.calendar.timeframe === "week"
            ? "timeGridWeek"
            : "dayGridMonth";

        if (attributes.timeframe) {
          timeframe =
            attributes.timeframe === "week" ? "timeGridWeek" : "dayGridMonth";
        }
        setView(timeframe);
      })
      .catch(() => {});
  };

  const calendarRef = useRef(null);

  useEffect(() => {
    getCalendar();
  }, [attributes.calendars]);

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      if (["timeGridDay", "timeGridWeek", "dayGridMonth"].includes(view)) {
        calendarApi.changeView(view);
      }
    }
  }, [view]);

  const startday = attributes?.startday
    ? attributes.startday
    : calendar?.startday;

  const eventColor = attributes?.color
    ? attributes.color
    : eventkoi_params.default_color;

  return (
    <>
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
        {...blockProps}
        id={
          view === "dayGridMonth"
            ? "month"
            : view === "timeGridWeek"
            ? "week"
            : "day"
        }
      >
        {view && (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
            events={events}
            initialView={view}
            weekends={true}
            timeZone={false}
            firstDay={days[startday]}
            eventColor={eventColor}
            headerToolbar={{
              left: "prev,next title today",
              center: "",
              right: "dayGridMonth,timeGridWeek",
            }}
            eventTimeFormat={{
              hour: "numeric",
              minute: "2-digit",
              omitZeroMinute: true,
              meridiem: "short",
            }}
            eventClick={(info) => {
              info.jsEvent.preventDefault();

              if (info.event.url) {
                window.open(info.event.url);
              }
            }}
          />
        )}
      </div>
    </>
  );
}
