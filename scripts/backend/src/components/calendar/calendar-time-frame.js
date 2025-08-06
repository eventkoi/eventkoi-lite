import { Panel } from "@/components/panel";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info } from "lucide-react";

export function CalendarTimeFrame({ calendar, setCalendar }) {
  const onTabChange = (value) => {
    setCalendar((prevState) => ({
      ...prevState,
      timeframe: value,
    }));
  };

  const isDisabled = calendar?.display === "list";

  return (
    <Panel>
      <Label>Default time frame to display</Label>
      <Tabs
        defaultValue={calendar?.timeframe}
        onValueChange={(value) => {
          if (!isDisabled) {
            onTabChange(value);
          }
        }}
        className="pt-1"
      >
        <TabsList className="border border-input rounded-lg opacity-100">
          <TabsTrigger
            value="month"
            className="rounded-lg"
            disabled={isDisabled}
          >
            Month
          </TabsTrigger>
          <TabsTrigger
            value="week"
            className="rounded-lg"
            disabled={isDisabled}
          >
            Week
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isDisabled && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <Info className="w-4 h-4" />
          This setting is only available in calendar view.
        </div>
      )}
    </Panel>
  );
}
