import { useEffect, useMemo } from "react";
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const formatHourLabel = (hour, format) => {
  if (format === "24") {
    return `${String(hour).padStart(2, "0")}:00`;
  }
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${suffix}`;
};

export function CalendarDayStartTime({ calendar, setCalendar }) {
  const { settings } = useSettings();
  const isDisabled = calendar?.display === "list";
  const isWeekView = calendar?.timeframe === "week";

  const timeFormat = settings?.time_format || "12";
  const globalDefault = settings?.day_start_time || "07:00";

  useEffect(() => {
    if (!calendar?.day_start_time) {
      setCalendar((prev) => ({
        ...prev,
        day_start_time: globalDefault,
      }));
    }
  }, [calendar?.day_start_time, globalDefault, setCalendar]);

  const currentValue = calendar?.day_start_time || globalDefault;

  const options = useMemo(
    () =>
      HOURS.map((hour) => ({
        value: `${String(hour).padStart(2, "0")}:00`,
        label: formatHourLabel(hour, timeFormat),
      })),
    [timeFormat]
  );

  if (!isWeekView) {
    return null;
  }

  return (
    <Panel className="p-0">
      <Label htmlFor="day-start-time">
        {__("Day starts at", "eventkoi-lite")}
      </Label>
      <Select
        value={currentValue}
        onValueChange={(value) => {
          if (!isDisabled) {
            setCalendar((prev) => ({
              ...prev,
              day_start_time: value,
            }));
          }
        }}
        disabled={isDisabled}
      >
        <SelectTrigger id="day-start-time" className="w-[250px]">
          <SelectValue placeholder={__("Select time", "eventkoi-lite")} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!isDisabled && (
        <div className="text-muted-foreground">
          {__(
            "Set the first visible hour in weekly view.",
            "eventkoi-lite"
          )}
        </div>
      )}

      {isDisabled && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <Info className="w-4 h-4" />
          {__(
            "This setting is only available in calendar view.",
            "eventkoi-lite"
          )}
        </div>
      )}
    </Panel>
  );
}
