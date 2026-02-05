import apiRequest from "@wordpress/api-fetch";
import { useEffect, useMemo, useState } from "react";

import { Box } from "@/components/box";
import { ProLaunch } from "@/components/dashboard/pro-launch";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { ProBadge } from "@/components/pro-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/SettingsContext";
import { showToast, showToastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const dayLabels = {
  0: "Monday",
  1: "Tuesday",
  2: "Wednesday",
  3: "Thursday",
  4: "Friday",
  5: "Saturday",
  6: "Sunday",
};

const themeSlug = eventkoi_params?.theme || "twentytwentyfive";
const customTemplates = eventkoi_params?.custom_templates || [];

export function SettingsOverview() {
  const { settings, refreshSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [timeFormat, setTimeFormat] = useState(settings?.time_format || "12");
  const [dayStartTime, setDayStartTime] = useState(
    settings?.day_start_time || "07:00"
  );
  const [defaultTemplate, setDefaultTemplate] = useState(
    settings?.default_event_template || "default"
  );
  const [autoDetectTimezone, setAutoDetectTimezone] = useState(
    settings?.auto_detect_timezone === "1" ||
      settings?.auto_detect_timezone === true ||
      settings?.auto_detect_timezone === 1
      ? "local"
      : "site"
  );

  const blockTemplates = useMemo(() => {
    const group = customTemplates.find((tplGroup) => tplGroup.type === "block");
    return group?.templates || [];
  }, []);

  useEffect(() => {
    if (settings?.time_format && settings.time_format !== timeFormat) {
      setTimeFormat(settings.time_format);
    }
  }, [settings?.time_format]);

  useEffect(() => {
    if (settings?.day_start_time && settings.day_start_time !== dayStartTime) {
      setDayStartTime(settings.day_start_time);
    }
  }, [settings?.day_start_time]);

  useEffect(() => {
    if (typeof settings?.auto_detect_timezone === "undefined") {
      return;
    }
    const next =
      settings.auto_detect_timezone === "1" ||
      settings.auto_detect_timezone === true ||
      settings.auto_detect_timezone === 1
        ? "local"
        : "site";
    if (next !== autoDetectTimezone) {
      setAutoDetectTimezone(next);
    }
  }, [settings?.auto_detect_timezone]);

  useEffect(() => {
    if (
      settings?.default_event_template &&
      settings.default_event_template !== defaultTemplate
    ) {
      setDefaultTemplate(settings.default_event_template);
    }
  }, [settings?.default_event_template]);

  const handleTimeFormatChange = (val) => {
    setTimeFormat(val);
    if (val !== settings?.time_format) {
      saveSettings({ time_format: val });
    }
  };

  const formatHourLabel = (hour) => {
    if (timeFormat === "24") {
      return `${String(hour).padStart(2, "0")}:00`;
    }
    const suffix = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12} ${suffix}`;
  };

  const handleDayStartTimeChange = (val) => {
    setDayStartTime(val);
    if (val !== settings?.day_start_time) {
      saveSettings({ day_start_time: val });
    }
  };

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

  const handleAutoDetectChange = (value) => {
    setAutoDetectTimezone(value);
    saveSettings({ auto_detect_timezone: value === "local" ? "1" : "0" });
  };

  const handleDefaultTemplateChange = (value) => {
    setDefaultTemplate(value);
  };

  const templateEditorUrl =
    defaultTemplate && defaultTemplate !== "default"
      ? `${
          eventkoi_params.site_url
        }/wp-admin/site-editor.php?p=${encodeURIComponent(
          `/wp_template/${themeSlug}//${defaultTemplate}`
        )}&canvas=edit`
      : `${eventkoi_params.site_url}/wp-admin/site-editor.php?p=/template&activeView=eventkoi`;

  return (
    <div className="grid gap-8">
      <Box>
        <div className="grid w-full">
          <Panel variant="header">
            <Heading level={3}>General Settings</Heading>
          </Panel>

          <Separator />

          <Panel className="gap-10">
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
              <div className="text-muted-foreground">
                Select the day calendars use as the start of the week.
              </div>
            </div>

            {/* Day Start Time */}
            <div className="grid gap-2">
              <Label htmlFor="day-start-time">Day starts at</Label>
              <Select
                value={dayStartTime}
                onValueChange={handleDayStartTimeChange}
                disabled={isSaving}
              >
                <SelectTrigger id="day-start-time" className="w-[250px]">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => {
                    const value = `${String(hour).padStart(2, "0")}:00`;
                    return (
                      <SelectItem key={value} value={value}>
                        {formatHourLabel(hour)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="text-muted-foreground">
                Set the first visible hour in weekly view.
              </div>
            </div>

            {/* Working Days Toggle */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Working days</Label>
              <div className="flex items-center gap-4 flex-wrap">
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
              <div className="text-muted-foreground">
                Select your working days. These are used for recurring event
                rules.
              </div>
            </div>

            {/* Time format */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Time format</Label>
              <Tabs
                value={timeFormat}
                onValueChange={handleTimeFormatChange}
                className="w-[350px]"
              >
                <TabsList className="border border-input rounded-lg w-full flex">
                  <TabsTrigger
                    value="12"
                    className="flex-1 rounded-lg text-center"
                  >
                    12-hour (AM/PM) clock
                  </TabsTrigger>
                  <TabsTrigger
                    value="24"
                    className="flex-1 rounded-lg text-center"
                  >
                    24-hour clock
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="text-muted-foreground">
                Select how event times are displayed (e.g. 2:00 PM or 14:00).
              </div>
            </div>

            {/* Auto-detect timezone */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium mb-0">
                Auto-detect timezone
              </Label>
              <RadioGroup
                value={autoDetectTimezone}
                onValueChange={handleAutoDetectChange}
                className="grid gap-2"
                disabled={isSaving}
              >
                <label className="flex items-start gap-3 text-sm text-foreground">
                  <RadioGroupItem value="local" id="auto-tz-local" />
                  <span className="leading-snug">
                    Visitors see event times in their local timezone.
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm text-foreground">
                  <RadioGroupItem value="site" id="auto-tz-site" />
                  <span className="leading-snug">
                    Event times use the site&apos;s timezone.
                  </span>
                </label>
              </RadioGroup>
            </div>

            {/* Default event template */}
            <div className="grid gap-2">
              <Label htmlFor="default-event-template">
                <span className="inline-flex items-center gap-2">
                  Default event template
                  <ProBadge />
                </span>
              </Label>
              <Select
                value={defaultTemplate}
                onValueChange={handleDefaultTemplateChange}
                disabled
              >
                <SelectTrigger
                  id="default-event-template"
                  className="w-[250px]"
                >
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default template</SelectItem>
                  {blockTemplates.map((tpl) => (
                    <SelectItem key={tpl.slug} value={tpl.slug}>
                      {tpl.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-muted-foreground">
                Choose the template used for all event pages by default.
              </div>
              <a
                href={templateEditorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline hover:text-primary/80 transition"
              >
                {defaultTemplate && defaultTemplate !== "default"
                  ? "Edit in Site Editor"
                  : "View/edit templates"}
              </a>
            </div>
            <ProLaunch
              headline="Upgrade to switch default event template"
              minimal
              className="!mt-0"
            />
          </Panel>
        </div>
      </Box>
    </div>
  );
}
