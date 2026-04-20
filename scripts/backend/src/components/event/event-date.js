import { ProLaunch } from "@/components/dashboard/pro-launch";
import { EventDateRecurring } from "@/components/event/event-date-recurring";
import { EventDateStandard } from "@/components/event/event-date-standard";
import { Panel } from "@/components/panel";
import { ProBadge } from "@/components/pro-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { useEffect, useState } from "react";

export function EventDate({ showAttributes }) {
  const { event, setEvent } = useEventEditContext();

  // Visible tab is decoupled from event.date_type so users can preview the
  // Recurring tab without it being saved as the event's type.
  const [tabValue, setTabValue] = useState("standard");

  // Lite: recurring is Pro-only. Force date_type to standard if it ever loads as recurring.
  useEffect(() => {
    if (event?.date_type === "recurring") {
      setEvent((prev) => ({ ...prev, date_type: "standard" }));
    }
  }, []);

  const onTabChange = (value) => {
    setTabValue(value);
    // Only persist standard as the saved date_type. Recurring browsing is view-only.
    if (value === "standard") {
      setEvent((prevState) => ({
        ...prevState,
        date_type: "standard",
      }));
    }
  };

  useEffect(() => {
    if (
      tabValue === "standard" &&
      (!event.event_days || event.event_days.length === 0)
    ) {
      setEvent((prev) => ({
        ...prev,
        // Default new events to all-day; user can toggle off to enter specific times.
        event_days: [
          {
            start_date: null,
            end_date: null,
            all_day: true,
          },
        ],
      }));
    }
  }, [tabValue]);

  return (
    <Panel className="gap-3 p-0">
      <Tabs value={tabValue} onValueChange={onTabChange} className="w-full">
        <TabsList className="border border-input rounded-lg mb-4">
          <TabsTrigger value="standard" className="rounded-lg">
            Standard
          </TabsTrigger>
          <TabsTrigger value="recurring" className="rounded-lg">
            Recurring
            <ProBadge />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard">
          <EventDateStandard
            event={event}
            setEvent={setEvent}
            showAttributes={showAttributes}
          />
        </TabsContent>

        <TabsContent value="recurring">
          <ProLaunch
            headline="Upgrade to access Recurring Events"
            minimal
            className="mb-8 mt-6"
          />
          <div
            className="pointer-events-none opacity-60 select-none"
            aria-disabled="true"
          >
            <EventDateRecurring showAttributes={showAttributes} />
          </div>
        </TabsContent>
      </Tabs>
    </Panel>
  );
}
