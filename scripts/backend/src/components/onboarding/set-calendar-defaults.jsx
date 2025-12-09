import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/SettingsContext";
import { showToast, showToastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const dayLabels = {
  0: __("Monday", "eventkoi-lite"),
  1: __("Tuesday", "eventkoi-lite"),
  2: __("Wednesday", "eventkoi-lite"),
  3: __("Thursday", "eventkoi-lite"),
  4: __("Friday", "eventkoi-lite"),
  5: __("Saturday", "eventkoi-lite"),
  6: __("Sunday", "eventkoi-lite"),
};

export function SetCalendarDefaultsStep() {
  const { settings, refreshSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [timeFormat, setTimeFormat] = useState(settings?.time_format || "12");

  useEffect(() => {
    if (settings?.time_format && settings.time_format !== timeFormat) {
      setTimeFormat(settings.time_format);
    }
  }, [settings?.time_format]);

  const workingDays = useMemo(() => {
    return Array.isArray(settings?.working_days)
      ? settings.working_days.map((v) => parseInt(v, 10))
      : [0, 1, 2, 3, 4];
  }, [settings?.working_days]);

  const startDayIndex = useMemo(() => {
    return typeof settings?.week_starts_on !== "undefined"
      ? parseInt(settings.week_starts_on, 10)
      : 0;
  }, [settings?.week_starts_on]);

  const orderedWeekdays = useMemo(() => {
    return [
      ...WEEKDAYS.slice(startDayIndex),
      ...WEEKDAYS.slice(0, startDayIndex),
    ];
  }, [startDayIndex]);

  const saveSettings = async (updatedFields) => {
    try {
      setIsSaving(true);
      const response = await apiRequest({
        path: `${eventkoi_params.api}/settings`,
        method: "post",
        data: updatedFields,
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });

      await refreshSettings();
      showToast({ ...response, message: "Settings updated." });
    } catch (error) {
      showToastError(error?.message ?? "Failed to update setting.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleWorkingDay = (dayIndex) => {
    const updated = workingDays.includes(dayIndex)
      ? workingDays.filter((d) => d !== dayIndex)
      : [...workingDays, dayIndex].sort();
    saveSettings({ working_days: updated });
  };

  const handleStartDayChange = (value) => {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      saveSettings({ week_starts_on: parsed });
    }
  };

  const handleTimeFormatChange = (val) => {
    setTimeFormat(val);
    if (val !== settings?.time_format) {
      saveSettings({ time_format: val });
    }
  };

  return (
    <div className="grid gap-8">
      <div className="grid gap-1">
        <h3 className="font-medium text-[24px] leading-7 text-black m-0">
          {__("Set your calendar defaults", "eventkoi-lite")}
        </h3>
      </div>

      <div className="grid gap-8 bg-white rounded-xl border border-[#e5e5e5]">
        <div className="grid gap-2">
          <Label
            htmlFor="week-start"
            className="text-sm text-[#161616] font-medium"
          >
            {__("Week starts on", "eventkoi-lite")}
          </Label>
          <Select
            value={String(startDayIndex)}
            onValueChange={handleStartDayChange}
            disabled={isSaving}
          >
            <SelectTrigger id="week-start" className="w-[250px] border-solid">
              <SelectValue placeholder={__("Select a day", "eventkoi-lite")} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(dayLabels).map(([key, label]) => (
                <SelectItem key={`option-${key}`} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-muted-foreground text-sm">
            {__(
              "Select the day calendars use as the start of the week.",
              "eventkoi-lite"
            )}
          </div>
        </div>

        <div className="grid gap-2">
          <Label className="text-sm text-[#161616] font-medium">
            {__("Working days", "eventkoi-lite")}
          </Label>
          <div className="flex items-center gap-4 flex-wrap">
            {orderedWeekdays.map((label, i) => {
              const realIndex = (startDayIndex + i) % 7;
              return (
                <Button
                  key={label}
                  type="button"
                  size="sm"
                  variant={
                    workingDays.includes(realIndex) ? "default" : "secondary"
                  }
                  className={cn(
                    "rounded-full border-none cursor-pointer w-9 h-9 p-0 transition-none text-smm font-medium",
                    workingDays.includes(realIndex)
                      ? "bg-foreground text-background"
                      : "bg-secondary border border-solid border-[1px] border-input text-foreground/80"
                  )}
                  onClick={() => toggleWorkingDay(realIndex)}
                >
                  {label}
                </Button>
              );
            })}
          </div>
          <div className="text-muted-foreground text-sm">
            {__(
              "Select your working days. These are used for recurring event rules.",
              "eventkoi-lite"
            )}
          </div>
        </div>

        <div className="grid gap-2">
          <Label className="text-sm text-[#161616] font-medium">
            {__("Time format", "eventkoi-lite")}
          </Label>
          <Tabs
            value={timeFormat}
            onValueChange={handleTimeFormatChange}
            className="w-[350px]"
          >
            <TabsList className="border border-input rounded-lg w-full flex gap-2">
              <TabsTrigger
                value="12"
                className="flex-1 rounded-lg text-center border-none cursor-pointer"
              >
                {__("12-hour (AM/PM) clock", "eventkoi-lite")}
              </TabsTrigger>
              <TabsTrigger
                value="24"
                className="flex-1 rounded-lg text-center border-none cursor-pointer"
              >
                {__("24-hour clock", "eventkoi-lite")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="text-muted-foreground text-sm">
            {__(
              "Select how event times are displayed (e.g. 2:00 PM or 14:00).",
              "eventkoi-lite"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
