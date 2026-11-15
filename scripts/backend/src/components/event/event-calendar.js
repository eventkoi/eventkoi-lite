import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";
import { useEffect, useState } from "react";

import { Panel } from "@/components/panel";
import { ProBadge } from "@/components/pro-badge";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multiselect";
import { useEventEditContext } from "@/hooks/EventEditContext";

export function EventCalendar({ disabled = false }) {
  const { event, setEvent } = useEventEditContext();
  const [items, setItems] = useState([]);
  const [hasSetDefault, setHasSetDefault] = useState(false);
  const isDisabled = Boolean(disabled);

  const defaultId = parseInt(eventkoi_params?.default_cal ?? 0, 10);

  const setCalendars = (selection, { force = false } = {}) => {
    if (isDisabled && !force) return;
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
            setCalendars([defaultItem], { force: true });
            setHasSetDefault(true);
          }
        }
      }
    } catch (error) {
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
      <Label htmlFor="calendar" className="inline-flex items-center">
        {__("Event calendar", "eventkoi-lite")}
        <ProBadge />
      </Label>
      <div className="text-muted-foreground mb-2">
        {__("Select which calendars your event will show up in.", "eventkoi-lite")}
      </div>
      {items.length > 0 && (
        <MultiSelect
          options={items}
          placeholder={__("Select calendar(s)", "eventkoi-lite")}
          noItems={__("No calendars are found.", "eventkoi-lite")}
          searchPlaceholder={__("Search calendars", "eventkoi-lite")}
          value={selected}
          onSelectionChange={setCalendars}
          disabled={isDisabled}
          inputClassName="disabled:bg-white"
        />
      )}
    </Panel>
  );
}
