import { Panel } from "@/components/panel";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/hooks/SettingsContext";
import { __ } from "@wordpress/i18n";
import { Info } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const days = {
  monday: __("Monday", "eventkoi-lite"),
  tuesday: __("Tuesday", "eventkoi-lite"),
  wednesday: __("Wednesday", "eventkoi-lite"),
  thursday: __("Thursday", "eventkoi-lite"),
  friday: __("Friday", "eventkoi-lite"),
  saturday: __("Saturday", "eventkoi-lite"),
  sunday: __("Sunday", "eventkoi-lite"),
};

// Plugin-specific weekday order: Monday = 0
const orderedKeys = [
  "monday", // 0
  "tuesday", // 1
  "wednesday", // 2
  "thursday", // 3
  "friday", // 4
  "saturday", // 5
  "sunday", // 6
];

export function CalendarStartDay({ calendar, setCalendar }) {
  const isDisabled = calendar?.display === "list";
  const { settings } = useSettings();

  // Compute default from settings (as string day name)
  const globalDefault =
    orderedKeys[parseInt(settings?.week_starts_on ?? "0", 10)] ?? "monday";

  // Auto-assign global default if new calendar has no startday set
  useEffect(() => {
    if (!calendar?.startday) {
      setCalendar((prev) => ({
        ...prev,
        startday: globalDefault,
      }));
    }
  }, [calendar?.startday, globalDefault, setCalendar]);

  const currentValue = calendar?.startday || globalDefault;

  return (
    <Panel className="p-0">
      <Label htmlFor="startday">{__("Week starts on", "eventkoi-lite")}</Label>
      <Select
        value={currentValue}
        onValueChange={(value) => {
          if (!isDisabled) {
            setCalendar((prev) => ({
              ...prev,
              startday: value,
            }));
          }
        }}
        disabled={isDisabled}
      >
        <SelectTrigger id="startday" className="w-[250px]">
          <SelectValue placeholder={__("Select a day", "eventkoi-lite")} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(days).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!isDisabled && (
        <div className="text-muted-foreground">
          {__("Select the day calendar use as the start of the week.", "eventkoi-lite")}{" "}
          <Link
            to="/settings"
            className="underline hover:text-primary transition-colors"
          >
            {__("Edit global settings", "eventkoi-lite")}
          </Link>
          .
        </div>
      )}

      {isDisabled && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <Info className="w-4 h-4" />
          {__("This setting is only available in calendar view.", "eventkoi-lite")}
        </div>
      )}
    </Panel>
  );
}
