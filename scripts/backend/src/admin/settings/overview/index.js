import apiRequest from "@wordpress/api-fetch";
import { useMemo, useState } from "react";

import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "@/hooks/SettingsContext";
import { showToast, showToastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const dayLabels = {
  0: "Monday",
  1: "Tuesday",
  2: "Wednesday",
  3: "Thursday",
  4: "Friday",
  5: "Saturday",
  6: "Sunday",
};

export function SettingsOverview() {
  const { settings, refreshSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
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

      await refreshSettings(); // sync context
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

  return (
    <div className="grid gap-8">
      <Box>
        <div className="grid w-full">
          <Panel variant="header">
            <Heading level={3}>General Settings</Heading>
          </Panel>

          <Separator />

          <Panel className="gap-6">
            {/* Week Start Dropdown */}
            <div className="grid gap-2">
              <Label htmlFor="week-start">Week starts on</Label>
              <Select
                value={String(startDayIndex)}
                onValueChange={handleStartDayChange}
                disabled={isSaving}
              >
                <SelectTrigger id="week-start" className="w-[250px]">
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(dayLabels).map(([key, label]) => (
                    <SelectItem key={`option-${key}`} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Working Days Toggle */}
            <div className="grid gap-3">
              <Label className="text-sm font-medium">Select working days</Label>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {orderedWeekdays.map((label, i) => {
                  const realIndex = (startDayIndex + i) % 7;
                  return (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant={
                        workingDays.includes(realIndex)
                          ? "default"
                          : "secondary"
                      }
                      className={cn(
                        "rounded-full w-9 h-9 p-0 transition-none text-smm font-medium",
                        workingDays.includes(realIndex)
                          ? "bg-foreground text-background"
                          : "bg-secondary border border-input text-foreground/80"
                      )}
                      onClick={() => toggleWorkingDay(realIndex)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </Panel>
        </div>
      </Box>
    </div>
  );
}
