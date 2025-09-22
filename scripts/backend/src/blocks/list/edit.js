import apiRequest from "@wordpress/api-fetch";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import { useEffect, useState } from "react";

import { Controls } from "./controls.js";
import { ListView } from "./list-view";

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
    <div {...blockProps}>
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

      <ListView attributes={attributes} events={events} />
    </div>
  );
}
