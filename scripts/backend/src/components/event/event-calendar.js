import apiRequest from "@wordpress/api-fetch";
import { useEffect, useState } from "react";

import { Panel } from "@/components/panel";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multiselect";
import { useEventEditContext } from "@/hooks/EventEditContext";

export function EventCalendar() {
  const { event, setEvent } = useEventEditContext();
  const [items, setItems] = useState([]);
  const [hasSetDefault, setHasSetDefault] = useState(false);

  const defaultId = parseInt(eventkoi_params?.default_cal ?? 0, 10);

  const setCalendars = (selection) => {
    const newCalendars = selection.map((s) => ({
      id: s.id,
      name: s.name,
    }));

    const current = JSON.stringify(event?.calendar || []);
    const next = JSON.stringify(newCalendars);

    if (current !== next) {
      setEvent((prev) => ({
        ...prev,
        calendar: newCalendars,
      }));
    }
  };

  const getCalendars = async () => {
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/calendars`,
        method: "get",
      });

      if (Array.isArray(response)) {
        const calendars = response.map((calendar) => ({
          id: parseInt(calendar.id, 10),
          name: calendar.name,
        }));
        setItems(calendars);

        // Set default calendar if needed
        const hasNoCalendar =
          !Array.isArray(event?.calendar) || event.calendar.length === 0;
        if (
          !hasSetDefault &&
          defaultId &&
          hasNoCalendar &&
          calendars.length > 0
        ) {
          const defaultItem = calendars.find((item) => item.id === defaultId);
          if (defaultItem) {
            setCalendars([defaultItem]);
            setHasSetDefault(true);
          }
        }
      }
    } catch (error) {
      // Handle error if needed
      console.error("Failed to fetch calendars:", error);
    }
  };

  useEffect(() => {
    getCalendars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = Array.isArray(event?.calendar)
    ? event.calendar.map((c) => ({
        id: c.id,
        name: c.name,
      }))
    : [];

  return (
    <Panel className="p-0">
      <Label htmlFor="calendar">Event calendar</Label>
      <div className="text-muted-foreground mb-2">
        Select which calendars your event will show up in.
      </div>
      {items.length > 0 && (
        <MultiSelect
          options={items}
          placeholder="Select calendar(s)"
          noItems="No calendars are found."
          searchPlaceholder="Search calendars"
          value={selected}
          onSelectionChange={setCalendars}
        />
      )}
    </Panel>
  );
}
