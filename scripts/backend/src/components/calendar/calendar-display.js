import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Panel } from "@/components/panel";

export function CalendarDisplay({ calendar, setCalendar }) {
  const onTabChange = (value) => {
    setCalendar((prevState) => ({
      ...prevState,
      display: value,
    }));
  };

  return (
    <Panel>
      <Label>Default display type</Label>
      <Tabs
        defaultValue={calendar?.display}
        onValueChange={onTabChange}
        className="pt-1"
      >
        <TabsList className="border border-input rounded-lg">
          <TabsTrigger value="calendar" className="rounded-lg">
            Calendar
          </TabsTrigger>
          <TabsTrigger value="list" className="rounded-lg">
            List
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </Panel>
  );
}
