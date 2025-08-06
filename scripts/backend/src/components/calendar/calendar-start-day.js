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
import { Info } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const days = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
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
    <Panel>
      <Label htmlFor="startday">Week starts on</Label>
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
          <SelectValue placeholder="Select a day" />
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
        <div className="text-sm text-muted-foreground mt-1">
          <Link
            to="/settings"
            className="underline hover:text-primary transition-colors"
          >
            Edit in global settings
          </Link>
          .
        </div>
      )}

      {isDisabled && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <Info className="w-4 h-4" />
          This setting is only available in calendar view.
        </div>
      )}
    </Panel>
  );
}
