import { useEffect, useState } from "react";

import apiRequest from "@wordpress/api-fetch";

import { InspectorControls, useBlockProps } from "@wordpress/block-editor";

import { Controls } from "./controls.js";
import { ListView } from "./list-view";

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

  useEffect(() => {
    getCalendar();
  }, [attributes.calendars]);

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
        />
      </InspectorControls>

      <div {...blockProps}>
        <ListView attributes={attributes} events={events} />
      </div>
    </>
  );
}
