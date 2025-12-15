import { __ } from "@wordpress/i18n";
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
    <Panel className="p-0">
      <Label>{__("Default calendar display", "eventkoi-lite")}</Label>
      <Tabs
        defaultValue={calendar?.display}
        onValueChange={onTabChange}
        className="pt-1"
      >
        <TabsList className="border border-input rounded-lg">
          <TabsTrigger value="calendar" className="rounded-lg">
            {__("Calendar", "eventkoi-lite")}
          </TabsTrigger>
          <TabsTrigger value="list" className="rounded-lg">
            {__("List", "eventkoi-lite")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="text-muted-foreground">
        {__("Choose the default view visitors see.", "eventkoi-lite")}
      </div>
    </Panel>
  );
}
