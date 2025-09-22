import { EventDateRecurring } from "@/components/event/event-date-recurring";
import { EventDateStandard } from "@/components/event/event-date-standard";
import { Panel } from "@/components/panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { useEffect } from "react";

export function EventDate({ showAttributes }) {
  const { event, setEvent } = useEventEditContext();
  const tabValue = event?.date_type || "standard";

  const onTabChange = (value) => {
    setEvent((prevState) => ({
      ...prevState,
      date_type: value,
    }));
  };

  useEffect(() => {
    if (
      tabValue === "standard" &&
      (!event.event_days || event.event_days.length === 0)
    ) {
      setEvent((prev) => ({
        ...prev,
        event_days: [
          {
            start_date: null,
            end_date: null,
            all_day: false,
          },
        ],
      }));
    }

    if (
      tabValue === "recurring" &&
      (!event.recurrence_rules || event.recurrence_rules.length === 0)
    ) {
      const now = new Date();
      now.setHours(9, 0, 0, 0);

      const end = new Date(now);
      end.setHours(17, 0, 0, 0);

      const defaultEnd = new Date();
      defaultEnd.setFullYear(defaultEnd.getFullYear() + 2);

      const defaultRule = {
        start_date: null,
        end_date: null,
        all_day: false,
        every: 1,
        frequency: "day",
        working_days_only: false,
        ends: "after",
        ends_after: 30,
        ends_on: defaultEnd.toISOString(),
        weekdays: [],
        months: [],
        month_day_rule: "day-of-month",
        month_day_value: now.getDate(),
      };

      setEvent((prev) => ({
        ...prev,
        recurrence_rules: [defaultRule],
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
          <EventDateRecurring showAttributes={showAttributes} />
        </TabsContent>
      </Tabs>
    </Panel>
  );
}
