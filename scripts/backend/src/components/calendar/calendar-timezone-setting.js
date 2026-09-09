import { __ } from "@wordpress/i18n";
import { Panel } from "@/components/panel";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function CalendarTimezoneSetting({ calendar, setCalendar }) {
  return (
    <Panel className="p-0">
      <div className="flex items-start gap-4 max-w-[500px]">
        <Switch
          id="show_timezone"
          checked={calendar?.show_timezone !== false}
          className="mt-[1px]"
          onCheckedChange={(bool) =>
            setCalendar((prevState) => ({
              ...prevState,
              show_timezone: bool,
            }))
          }
        />
        <div className="space-y-1">
          <Label className="font-medium" htmlFor="show_timezone">
            {__("Show timezone", "eventkoi-lite")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {__(
              "Show the timezone label above the calendar. Turn it off to hide it.",
              "eventkoi-lite",
            )}
          </p>
        </div>
      </div>
    </Panel>
  );
}
