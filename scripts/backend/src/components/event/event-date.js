import { ProLaunch } from "@/components/dashboard/pro-launch";
import { EventDateRecurring } from "@/components/event/event-date-recurring";
import { EventDateStandard } from "@/components/event/event-date-standard";
import { Panel } from "@/components/panel";
import { ProBadge } from "@/components/pro-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { cn } from "@/lib/utils";
import { Calendar, Repeat } from "lucide-react";
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
        <TabsList className="h-auto w-full flex flex-col lg:flex-row space-y-5 lg:space-y-0 [&>*]:w-full lg:space-x-5 p-0 bg-white">
          <TabsTrigger
            value="standard"
            className={cn(
              "flex justify-start py-6 px-4 space-x-5 bg-white border-border border rounded-2xl",
              "data-[state=active]:shadow-[inset_0_0_0_1px_black] data-[state=active]:border-primary"
            )}
          >
            <div
              className={cn(
                "w-9 h-9 rounded-md flex items-center justify-center",
                tabValue === "standard"
                  ? "bg-primary text-white"
                  : "bg-muted text-primary"
              )}
            >
              <Calendar size={20} />
            </div>
            <div className="space-y-1 text-left">
              <div className="text-black text-base">Standard event</div>
              <p className="text-sm text-muted-foreground font-normal">
                A single event with fixed dates
              </p>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="recurring"
            className={cn(
              "flex justify-start py-6 px-4 space-x-5 bg-white border-border border rounded-2xl",
              "data-[state=active]:shadow-[inset_0_0_0_1px_black] data-[state=active]:border-primary"
            )}
          >
            <div
              className={cn(
                "w-9 h-9 rounded-md flex items-center justify-center",
                tabValue === "recurring"
                  ? "bg-primary text-white"
                  : "bg-muted text-primary"
              )}
            >
              <Repeat size={20} />
            </div>
            <div className="space-y-1 text-left">
              <div className="text-black text-base">
                Recurring event <ProBadge />
              </div>
              <p className="text-sm text-muted-foreground font-normal">
                A series of events with repeating rules.
              </p>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="mt-6">
          <EventDateStandard
            event={event}
            setEvent={setEvent}
            showAttributes={showAttributes}
          />
        </TabsContent>

        <TabsContent value="recurring" className="mt-6">
          <ProLaunch
            headline="Upgrade to access Recurring Events"
            minimal
            className="mb-8 mt-6"
          />
          <EventDateRecurring showAttributes={showAttributes} />
        </TabsContent>
      </Tabs>
    </Panel>
  );
}
