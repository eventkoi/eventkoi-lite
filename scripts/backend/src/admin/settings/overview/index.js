import { __ } from "@wordpress/i18n";
import apiRequest from "@wordpress/api-fetch";
import { useEffect, useMemo, useState } from "react";

import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { foldAccents } from "@/lib/slug";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
const cleanPermalinkBase = (value, fallback) => {
  // Sanitize each path segment separately so nested bases like
  // "agenda/calendar" keep their slashes.
  const slug = foldAccents(value)
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .split("/")
    .map((part) => part.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .join("/");

  return slug || fallback;
};

export function SettingsOverview() {
  const { settings, setSettings, refreshSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [timeFormat, setTimeFormat] = useState(settings?.time_format || "12");
  const [dayStartTime, setDayStartTime] = useState(
    settings?.day_start_time || "07:00"
  );
  const [defaultTemplate, setDefaultTemplate] = useState(
    settings?.default_event_template || "default"
  );
  const [seriesTemplate, setSeriesTemplate] = useState(
    settings?.default_series_template || "default"
  );
  const [calendarTemplate, setCalendarTemplate] = useState(
    settings?.default_calendar_template || "default"
  );
  // Builder template groups come from a page-load snapshot. They are kept in
  // state so a list handed back by the server (after the onboarding step
  // imports the Elementor templates, for instance) replaces it in place.
  const [templateGroups, setTemplateGroups] = useState(
    () => eventkoi_params?.custom_templates || []
  );
  const [autoDetectTimezone, setAutoDetectTimezone] = useState(
    settings?.auto_detect_timezone === "1" ||
      settings?.auto_detect_timezone === true ||
      settings?.auto_detect_timezone === 1
      ? "local"
      : "site"
  );
  const [dateFormat, setDateFormat] = useState(settings?.date_format || "");
  const [timeFormatString, setTimeFormatString] = useState(
    settings?.time_format_string || ""
  );
  const [eventBase, setEventBase] = useState(
    settings?.permalinks?.event_base || "event"
  );
  const [calendarBase, setCalendarBase] = useState(
    settings?.permalinks?.category_base || "calendar"
  );
  const [datePreview, setDatePreview] = useState("");
  const [timePreview, setTimePreview] = useState("");

  const templateOptions = useMemo(() => {
    const options = [];

    templateGroups.forEach((group) => {
      if (group.templates && group.templates.length > 0) {
        group.templates.forEach((tpl) => {
          options.push({
            slug: tpl.slug,
            title: tpl.title,
            group: group.label,
            // "Elementor > EventKoi Event Page": the builder stays visible in
            // the closed picker, where the group heading is not.
            label: `${group.label} > ${tpl.title}`,
            editUrl: tpl.edit_url || "",
          });
        });
      }
    });

    return options;
  }, [templateGroups]);

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

  useEffect(() => {
    if (typeof settings?.date_format !== "undefined" && settings.date_format !== dateFormat) {
      setDateFormat(settings.date_format || "");
    }
  }, [settings?.date_format]);

  useEffect(() => {
    if (
      typeof settings?.time_format_string !== "undefined" &&
      settings.time_format_string !== timeFormatString
    ) {
      setTimeFormatString(settings.time_format_string || "");
    }
  }, [settings?.time_format_string]);

  useEffect(() => {
    const nextEventBase = settings?.permalinks?.event_base || "event";
    if (nextEventBase !== eventBase) {
      setEventBase(nextEventBase);
    }
  }, [settings?.permalinks?.event_base]);

  useEffect(() => {
    const nextCalendarBase = settings?.permalinks?.category_base || "calendar";
    if (nextCalendarBase !== calendarBase) {
      setCalendarBase(nextCalendarBase);
    }
  }, [settings?.permalinks?.category_base]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const params = new URLSearchParams();
        if (dateFormat) params.set("date", dateFormat);
        if (timeFormatString) params.set("time", timeFormatString);
        const qs = params.toString();
        const path =
          `${eventkoi_params.api}/settings/preview-format` + (qs ? `?${qs}` : "");
        const response = await apiRequest({
          path,
          method: "GET",
          headers: {
            "EVENTKOI-API-KEY": eventkoi_params.api_key,
          },
        });
        if (!cancelled) {
          setDatePreview(response?.date || "");
          setTimePreview(response?.time || "");
        }
      } catch (err) {
        if (!cancelled) {
          setDatePreview("");
          setTimePreview("");
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [dateFormat, timeFormatString, settings?.time_format]);

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

      if (response?.settings) {
        setSettings(response.settings);
      } else {
        await refreshSettings();
      }
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

  const commitDateFormat = () => {
    const next = (dateFormat || "").trim();
    if (next === (settings?.date_format || "")) return;
    saveSettings({ date_format: next });
  };

  const commitTimeFormatString = () => {
    const next = (timeFormatString || "").trim();
    if (next === (settings?.time_format_string || "")) return;
    saveSettings({ time_format_string: next });
  };

  const commitPermalinks = () => {
    const nextEventBase = cleanPermalinkBase(eventBase, "event");
    const nextCalendarBase = cleanPermalinkBase(calendarBase, "calendar");
    setEventBase(nextEventBase);
    setCalendarBase(nextCalendarBase);

    if (
      nextEventBase === (settings?.permalinks?.event_base || "event") &&
      nextCalendarBase === (settings?.permalinks?.category_base || "calendar")
    ) {
      return;
    }

    saveSettings({
      permalinks: {
        event_base: nextEventBase,
        category_base: nextCalendarBase,
      },
    });
  };

  const handleDefaultTemplateChange = (value) => {
    setDefaultTemplate(value);
    if (value !== settings?.default_event_template) {
      saveSettings({ default_event_template: value });
    }
  };

  const handleSeriesTemplateChange = (value) => {
    setSeriesTemplate(value);
    if (value !== (settings?.default_series_template || "default")) {
      saveSettings({ default_series_template: value });
    }
  };

  const handleCalendarTemplateChange = (value) => {
    setCalendarTemplate(value);
    if (value !== (settings?.default_calendar_template || "default")) {
      saveSettings({ default_calendar_template: value });
    }
  };

  // Keep the pickers in step with settings saved elsewhere (the Elementor
  // switch below, the onboarding wizard).
  useEffect(() => {
    setSeriesTemplate(settings?.default_series_template || "default");
    setCalendarTemplate(settings?.default_calendar_template || "default");
  }, [settings?.default_series_template, settings?.default_calendar_template]);

  useEffect(() => {
    if (Array.isArray(window.eventkoi_params?.custom_templates)) {
      setTemplateGroups(window.eventkoi_params.custom_templates);
    }
  }, [settings?.default_event_template, settings?.default_series_template, settings?.default_calendar_template]);

  const usingDefaultTemplates =
    (defaultTemplate || "default") === "default" &&
    (seriesTemplate || "default") === "default" &&
    (calendarTemplate || "default") === "default";

  const switchBackToDefaultTemplates = () => {
    setDefaultTemplate("default");
    setSeriesTemplate("default");
    setCalendarTemplate("default");
    saveSettings({
      default_event_template: "default",
      default_series_template: "default",
      default_calendar_template: "default",
    });
  };

  // Calendar pages are PHP templates, so only page builder templates can
  // replace them; the block group stays out of that picker.
  const calendarTemplateOptions = useMemo(
    () => templateOptions.filter((option) => option.group !== __("Block", "eventkoi-lite")),
    [templateOptions]
  );

  // Classic themes have no Site Editor template screens; only builder
  // templates with their own edit URL stay editable there.
  const isBlockTheme = !!eventkoi_params?.block_theme;
  const editorLinkFor = (slug, option) => {
    if (!slug || slug === "default") {
      return isBlockTheme
        ? {
            href: `${eventkoi_params.site_url}/wp-admin/site-editor.php?p=/template&activeView=EventKoi`,
            label: __("View/edit templates", "eventkoi-lite"),
          }
        : null;
    }
    if (option?.editUrl) {
      return { href: option.editUrl, label: __("Edit template", "eventkoi-lite") };
    }
    if (isBlockTheme) {
      return {
        href: `${eventkoi_params.site_url}/wp-admin/site-editor.php?p=${encodeURIComponent(
          `/wp_template/${themeSlug}//${slug}`
        )}&canvas=edit`,
        label: __("Edit in Site Editor", "eventkoi-lite"),
      };
    }
    return null;
  };

  const renderTemplateGroups = (options) =>
    Object.values(
      options.reduce((groups, option) => {
        if (!groups[option.group]) {
          groups[option.group] = [];
        }
        groups[option.group].push(option);
        return groups;
      }, {})
    ).map((groupOptions, index) => {
      const label = groupOptions[0]?.group;
      return (
        <SelectGroup key={`${label}-${index}`}>
          {groupOptions.map((option) => (
            <SelectItem key={option.slug} value={option.slug}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      );
    });

  const renderTemplatePicker = ({ id, label, value, onChange, options, help }) => {
    const option = options.find((item) => item.slug === value);
    const link = editorLinkFor(value, option);

    return (
      <div className="grid gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Select value={value} onValueChange={onChange} disabled={isSaving}>
          <SelectTrigger id={id} className="w-[250px]">
            <SelectValue placeholder={__("Select a template", "eventkoi-lite")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">{__("Default template", "eventkoi-lite")}</SelectItem>
            {renderTemplateGroups(options)}
          </SelectContent>
        </Select>
        <div className="text-muted-foreground">{help}</div>
        {link && (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline hover:text-primary/80 transition"
          >
            {link.label}
            <span className="sr-only"> {__("(opens in new tab)", "eventkoi-lite")}</span>
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-8">
      {/* Calendar & week */}
      <Box>
        <div className="grid w-full">
          <Panel variant="header" className="gap-1">
            <Heading level={3}>{__("Calendar & week", "eventkoi-lite")}</Heading>
            <p className="text-sm text-muted-foreground">
              {__(
                "These settings are applied at a global level. They can also be adjusted at a calendar level.",
                "eventkoi-lite"
              )}
            </p>
          </Panel>
          <Panel className="gap-10 pt-2">
            {/* Week Start Dropdown */}
            <div className="grid gap-2">
              <Label htmlFor="week-start">{__("Week starts on", "eventkoi-lite")}</Label>
              <Select
                value={String(startDayIndex)}
                onValueChange={handleStartDayChange}
                disabled={isSaving}
              >
                <SelectTrigger id="week-start" className="w-[250px]">
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
              <div className="text-muted-foreground">
                {__("The first day of the week in calendar and week views.", "eventkoi-lite")}
              </div>
            </div>

            {/* Day Start Time */}
            <div className="grid gap-2">
              <Label htmlFor="day-start-time">{__("Day starts at", "eventkoi-lite")}</Label>
              <Select
                value={dayStartTime}
                onValueChange={handleDayStartTimeChange}
                disabled={isSaving}
              >
                <SelectTrigger id="day-start-time" className="w-[250px]">
                  <SelectValue placeholder={__("Select time", "eventkoi-lite")} />
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
                {__("The earliest hour shown in week and day views. Earlier hours stay hidden to reduce scrolling.", "eventkoi-lite")}
              </div>
            </div>

            {/* Working Days Toggle */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium">{__("Working days", "eventkoi-lite")}</Label>
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
                {__('Shaded in calendar views and used as the default for "every working day" recurring rules.', "eventkoi-lite")}
              </div>
            </div>
          </Panel>
        </div>
      </Box>

      {/* Dates & times */}
      <Box>
        <div className="grid w-full">
          <Panel variant="header">
            <Heading level={3}>{__("Dates & times", "eventkoi-lite")}</Heading>
          </Panel>
          <Panel className="gap-10 pt-2">
            {/* Time format */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium">{__("Time format", "eventkoi-lite")}</Label>
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
                    {__("12-hour (AM/PM) clock", "eventkoi-lite")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="24"
                    className="flex-1 rounded-lg text-center"
                  >
                    {__("24-hour clock", "eventkoi-lite")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="text-muted-foreground">
                {__("How event times display across the site (e.g. 2:00 PM or 14:00).", "eventkoi-lite")}
              </div>
            </div>

            {/* Time format (custom) */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium">{__("Time format (custom)", "eventkoi-lite")}</Label>
              <Input
                value={timeFormatString}
                onChange={(e) => setTimeFormatString(e.target.value)}
                onBlur={commitTimeFormatString}
                placeholder={eventkoi_params?.time_format_string || "g:i a"}
                className="w-[350px]"
                disabled={isSaving}
              />
              <div className="text-muted-foreground text-sm">
                {timePreview ? `${__("Preview:", "eventkoi-lite")} ${timePreview}. ` : ""}
                {__("Overrides the toggle above. Leave blank to use the default.", "eventkoi-lite")}
              </div>
            </div>

            {/* Custom PHP date format */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium">{__("Date format", "eventkoi-lite")}</Label>
              <Input
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                onBlur={commitDateFormat}
                placeholder={eventkoi_params?.date_format || "F j, Y"}
                className="w-[350px]"
                disabled={isSaving}
              />
              <div className="text-muted-foreground text-sm">
                {datePreview
                  ? `${__("Preview:", "eventkoi-lite")} ${datePreview}`
                  : __("Leave blank to use the WordPress default date format.", "eventkoi-lite")}{" "}
                &middot;{" "}
                <a
                  href="https://wordpress.org/documentation/article/customize-date-and-time-format/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  {__("Format reference", "eventkoi-lite")}
                </a>
              </div>
            </div>

            {/* Timezone display */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium mb-0">
                {__("Timezone display", "eventkoi-lite")}
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
                    {__("Visitors see event times in their local timezone.", "eventkoi-lite")}
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm text-foreground">
                  <RadioGroupItem value="site" id="auto-tz-site" />
                  <span className="leading-snug">
                    {__("Event times use the site's timezone.", "eventkoi-lite")}
                  </span>
                </label>
              </RadioGroup>
              <div className="text-muted-foreground">
                {__("Controls whose clock event times follow: the visitor's local time, or your site's fixed timezone.", "eventkoi-lite")}
              </div>
            </div>
          </Panel>
        </div>
      </Box>

      {/* Event URLs */}
      <Box>
        <div className="grid w-full">
          <Panel variant="header">
            <Heading level={3}>{__("Event URLs", "eventkoi-lite")}</Heading>
          </Panel>
          <Panel className="gap-10 pt-2">
            <div className="grid gap-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="event-url-base">{__("Event base", "eventkoi-lite")}</Label>
                  <Input
                    id="event-url-base"
                    value={eventBase}
                    onChange={(e) => setEventBase(e.target.value)}
                    onBlur={commitPermalinks}
                    placeholder="event"
                    className="max-w-[350px]"
                    disabled={isSaving}
                  />
                  <div className="text-muted-foreground text-sm">
                    {`${eventkoi_params.site_url}/${cleanPermalinkBase(
                      eventBase,
                      "event"
                    )}/sample-event/`}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="calendar-url-base">
                    {__("Calendar base", "eventkoi-lite")}
                  </Label>
                  <Input
                    id="calendar-url-base"
                    value={calendarBase}
                    onChange={(e) => setCalendarBase(e.target.value)}
                    onBlur={commitPermalinks}
                    placeholder="calendar"
                    className="max-w-[350px]"
                    disabled={isSaving}
                  />
                  <div className="text-muted-foreground text-sm">
                    {`${eventkoi_params.site_url}/${cleanPermalinkBase(
                      calendarBase,
                      "calendar"
                    )}/default-calendar/`}
                  </div>
                </div>
              </div>
              <div className="text-muted-foreground">
                {__("Changes to URL bases take effect after the next page load.", "eventkoi-lite")}
              </div>
            </div>
          </Panel>
        </div>
      </Box>

      {/* Single event pages */}
      <Box>
        <div className="grid w-full">
          <Panel variant="header">
            <Heading level={3}>{__("Single event pages", "eventkoi-lite")}</Heading>
          </Panel>
          <Panel className="gap-10 pt-2">
            {renderTemplatePicker({
              id: "default-event-template",
              label: __("Default event template", "eventkoi-lite"),
              value: defaultTemplate,
              onChange: handleDefaultTemplateChange,
              options: templateOptions,
              help: __("Applied to every event page unless overridden on the event itself.", "eventkoi-lite"),
            })}

            {renderTemplatePicker({
              id: "default-series-template",
              label: __("Event series template", "eventkoi-lite"),
              value: seriesTemplate,
              onChange: handleSeriesTemplateChange,
              options: templateOptions,
              help: __("The overview page of a recurring event, listing its dates. Default keeps EventKoi's built-in series layout.", "eventkoi-lite"),
            })}

            {renderTemplatePicker({
              id: "default-calendar-template",
              label: __("Calendar page template", "eventkoi-lite"),
              value: calendarTemplate,
              onChange: handleCalendarTemplateChange,
              options: calendarTemplateOptions,
              help: __("The page each calendar opens on. Default keeps EventKoi's built-in calendar page.", "eventkoi-lite"),
            })}

            {!usingDefaultTemplates && (
              <div>
                <Button
                  variant="outline"
                  className="h-9 cursor-pointer"
                  disabled={isSaving}
                  onClick={switchBackToDefaultTemplates}
                >
                  {__("Switch back to default templates", "eventkoi-lite")}
                </Button>
              </div>
            )}

          </Panel>
        </div>
      </Box>
    </div>
  );
}
