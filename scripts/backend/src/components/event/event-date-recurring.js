import { EventDateTBCSetting } from "@/components/event/event-date-tbc-setting";
import { EventDateTimezoneSetting } from "@/components/event/event-date-timezone-setting";
import { ShortcodeBox } from "@/components/ShortcodeBox";
import { TimeInput } from "@/components/time-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { FloatingDatePicker } from "@/components/ui/FloatingDatePicker";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { useSettings } from "@/hooks/SettingsContext";
import {
  getDateInTimezone,
  getOrderedWeekdays,
  getUtcISOString,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { CheckCheck, Copy, MoveRight, Plus, Trash2, X } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { Link } from "react-router-dom";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getOrdinal(date) {
  if (!(date instanceof Date) || isNaN(date)) return "";
  const dayOfMonth = date.getDate();
  const ordinalIndex = Math.ceil(dayOfMonth / 7);
  const ordinals = ["first", "second", "third", "fourth", "fifth"];
  return ordinals[ordinalIndex - 1] || `${ordinalIndex}th`;
}

function getRecurringSummary(rule) {
  const freqSingular = {
    day: "day",
    week: "week",
    month: "month",
    year: "year",
  };

  const freqPlural = {
    day: "days",
    week: "weeks",
    month: "months",
    year: "years",
  };

  // Main text: "Daily", "Weekly", ... or "Every 2 weeks"
  let freqText;
  if (rule.every && rule.every > 1) {
    freqText = `Every ${rule.every} ${freqPlural[rule.frequency] || "custom"}`;
  } else {
    freqText =
      {
        day: "Daily",
        week: "Weekly",
        month: "Monthly",
        year: "Yearly",
      }[rule.frequency] || "Custom";
  }

  let details = "";

  // Weekly details: which days
  if (rule.frequency === "week" && rule.weekdays?.length) {
    const days = rule.weekdays.map((i) => WEEKDAY_NAMES[i]).join(", ");
    details = `, on ${days}`;
  }

  // Monthly details
  if (
    rule.frequency === "month" &&
    rule.month_day_rule === "weekday-of-month"
  ) {
    const startDate = new Date(rule.start_date);

    // Find weekday: 0 (Sunday) to 6 (Saturday)
    const weekday = startDate.getDay();

    // Find ordinal: (1st, 2nd, etc. Monday in the month)
    const ordinal = Math.ceil(startDate.getDate() / 7);

    // Use the right label directly (no -1 shift)
    const ordinals = ["first", "second", "third", "fourth", "fifth"];
    const dayName = WEEKDAY_NAMES[weekday]; // 0=Sunday, 1=Monday, etc.
    details = `, on the ${ordinals[ordinal - 1] || `${ordinal}th`} ${dayName}`;
  }

  if (rule.frequency === "month" && rule.month_day_rule === "day-of-month") {
    details = `, on day ${new Date(rule.start_date).getDate()}`;
  }

  // Yearly details: months
  if (rule.frequency === "year" && rule.months?.length) {
    const monthNames = rule.months.map((m) => MONTHS[m]).join(", ");
    details = `, in ${monthNames}`;
  }

  // Ends
  let endText = "";
  if (rule.ends === "after") {
    endText = `, ${rule.ends_after} events`;
  } else if (rule.ends === "on") {
    endText = `, until ${new Date(rule.ends_on).toLocaleDateString()}`;
  } else {
    endText = ", forever";
  }

  return `${freqText}${details}${endText}.`;
}

export const EventDateRecurring = memo(function EventDateRecurring({
  showAttributes,
}) {
  const { event, setEvent } = useEventEditContext();
  const tbc = event?.tbc ?? false;
  const [copyingIndex, setCopyingIndex] = useState(null);
  const rules = event.recurrence_rules || [];
  const { settings } = useSettings();

  const addRule = useCallback(() => {
    const now = new Date();
    now.setHours(9, 0, 0, 0);

    const end = new Date(now);
    end.setHours(17, 0, 0, 0);

    const defaultEnd = new Date();
    defaultEnd.setFullYear(defaultEnd.getFullYear() + 2);

    const rule = {
      start_date: now.toISOString(),
      end_date: end.toISOString(),
      all_day: false,
      every: 1,
      frequency: "day",
      working_days_only: false,
      ends: "after",
      ends_after: 30,
      ends_on: defaultEnd.toISOString(),
      weekdays: [],
      months: [now.getMonth()],
      month_day_rule: "day-of-month",
      month_day_value: now.getDate(),
    };

    setEvent((prev) => ({
      ...prev,
      recurrence_rules: [...(prev.recurrence_rules || []), rule],
    }));
  }, [setEvent]);

  const updateRule = useCallback(
    (index, key, value) => {
      const updated = [...rules];
      const prevRule = { ...updated[index] };
      const rule = { ...prevRule, [key]: value };

      const isStartDateChange = key === "start_date";
      const date = new Date(isStartDateChange ? value : rule.start_date);
      const isValidDate = date instanceof Date && !isNaN(date);

      if (key === "all_day" && value === true) {
        rule.end_date = null;
      }

      const isWeekly =
        key === "frequency" ? value === "week" : rule.frequency === "week";

      // ONLY auto-set if weekdays is still empty
      if (
        isValidDate &&
        isWeekly &&
        isStartDateChange &&
        (!rule.weekdays || rule.weekdays.length === 0)
      ) {
        const timezone = event?.timezone || "UTC";
        const dateInTZ = getDateInTimezone(date.toISOString(), timezone);
        const jsDay = dateInTZ.getDay();
        const weekdayIndex = jsDay === 0 ? 6 : jsDay - 1;
        rule.weekdays = [weekdayIndex];
      }

      if (
        (key === "frequency" && value === "year") ||
        (isStartDateChange && rule.frequency === "year")
      ) {
        if (isValidDate) {
          rule.months = [date.getMonth()];
          rule.month_day_value = date.getDate();
        }
      }

      if (
        (key === "frequency" && value === "month") ||
        (isStartDateChange && rule.frequency === "month")
      ) {
        if (isValidDate) {
          rule.month_day_value = date.getDate();
        }
      }

      updated[index] = rule;
      setEvent((prev) => ({ ...prev, recurrence_rules: updated }));
    },
    [rules, setEvent]
  );

  const updateMultiple = useCallback(
    (index, updates) => {
      setEvent((prev) => {
        const updated = [...(prev.recurrence_rules || [])];
        const current = updated[index] || {};
        const next = { ...current, ...updates };

        const date = new Date(updates.start_date || current.start_date);
        const isValidDate = date instanceof Date && !isNaN(date);

        if (
          isValidDate &&
          next.frequency === "week" &&
          "start_date" in updates
        ) {
          const timezone = event?.timezone || "UTC";
          const dateInTZ = getDateInTimezone(date.toISOString(), timezone); // ✅ FIX
          const jsDay = dateInTZ.getDay();
          const weekdayIndex = jsDay === 0 ? 6 : jsDay - 1;
          next.weekdays = [weekdayIndex];
        }

        updated[index] = next;
        return { ...prev, recurrence_rules: updated };
      });
    },
    [setEvent]
  );

  const deleteRule = useCallback(
    (index) => {
      const updated = [...rules];
      updated.splice(index, 1);
      setEvent((prev) => ({ ...prev, recurrence_rules: updated }));
    },
    [rules, setEvent]
  );

  const toggleItem = useCallback(
    (index, key, value) => {
      const list = rules[index][key] || [];
      const exists = list.includes(value);
      const updatedList = exists
        ? list.filter((v) => v !== value)
        : [...list, value];
      updateRule(index, key, updatedList);
    },
    [rules, updateRule]
  );

  console.log(event);

  return (
    <div className="flex flex-col gap-6 opacity-70 pointer-events-none">
      {rules.map((rule, index) => {
        const timezone = event?.timezone || "UTC";

        const start = getDateInTimezone(rule.start_date, timezone);
        const end = getDateInTimezone(rule.end_date, timezone);
        const endsOn = getDateInTimezone(rule.ends_on, timezone);

        return (
          <div key={index} className="border rounded-md p-4 space-y-6">
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <FloatingDatePicker
                value={start}
                onChange={(date) => {
                  if (!date) return;
                  const tz = event?.timezone || "UTC";
                  const prev = start ?? new Date();
                  date.setHours(prev.getHours(), prev.getMinutes(), 0, 0);

                  const wall = date.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
                  const startUTC = getUtcISOString(wall, tz);

                  let endUTC = null;
                  if (!rule.all_day && start && end) {
                    const e = new Date(date);
                    e.setHours(end.getHours(), end.getMinutes(), 0, 0);
                    const wallEnd = e.toISOString().slice(0, 16);
                    endUTC = getUtcISOString(wallEnd, tz);
                  }

                  updateMultiple(index, {
                    start_date: startUTC,
                    ...(endUTC && { end_date: endUTC }),
                  });
                }}
                className={cn(
                  "disabled:bg-muted disabled:text-muted-foreground/40 disabled:cursor-not-allowed disabled:opacity-100"
                )}
                disabled={tbc}
              />

              {!rule.all_day && (
                <>
                  <TimeInput
                    date={start}
                    setDate={(date) => {
                      const tz = event?.timezone || "UTC";
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(
                        2,
                        "0"
                      );
                      const day = String(date.getDate()).padStart(2, "0");
                      const hour = String(date.getHours()).padStart(2, "0");
                      const minute = String(date.getMinutes()).padStart(2, "0");
                      const wallTime = `${year}-${month}-${day}T${hour}:${minute}`;
                      updateRule(
                        index,
                        "start_date",
                        getUtcISOString(wallTime, tz)
                      );
                    }}
                    disabled={tbc}
                  />
                  <MoveRight
                    className="w-6 h-6 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <TimeInput
                    date={end}
                    setDate={(date) => {
                      const tz = event?.timezone || "UTC";
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(
                        2,
                        "0"
                      );
                      const day = String(date.getDate()).padStart(2, "0");
                      const hour = String(date.getHours()).padStart(2, "0");
                      const minute = String(date.getMinutes()).padStart(2, "0");
                      const wallTime = `${year}-${month}-${day}T${hour}:${minute}`;
                      updateRule(
                        index,
                        "end_date",
                        getUtcISOString(wallTime, tz)
                      );
                    }}
                    disabled={tbc}
                  />
                </>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={rule.all_day}
                  onCheckedChange={(val) => updateRule(index, "all_day", val)}
                  disabled={tbc}
                />
                <span className="text-sm text-muted-foreground">All day</span>
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => deleteRule(index)}
                className="h-7 w-7 ml-auto p-0"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            {showAttributes && (
              <ShortcodeBox
                attribute={`event_datetime_${index + 1}`}
                data={`datetime_${index + 1}`}
                eventId={event?.id}
              />
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                Repeats every
              </span>
              <Input
                type="number"
                min={1}
                value={rule.every}
                onChange={(e) =>
                  updateRule(index, "every", parseInt(e.target.value))
                }
                className="w-16 h-9"
              />
              <Select
                value={rule.frequency}
                onValueChange={(val) => updateRule(index, "frequency", val)}
              >
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {rule.frequency === "day" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={rule.working_days_only}
                  onCheckedChange={(val) =>
                    updateRule(index, "working_days_only", val)
                  }
                  id={`working-days-${index}`}
                />
                <label
                  htmlFor={`working-days-${index}`}
                  className="text-sm text-muted-foreground"
                >
                  Only count{" "}
                  <Link
                    to="/settings"
                    className="underline text-muted-foreground hover:text-primary/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    working days
                  </Link>
                  .
                </label>
              </div>
            )}
            {rule.frequency === "week" && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">On</span>

                {getOrderedWeekdays(
                  parseInt(settings?.week_starts_on ?? "0", 10)
                ).map(({ key, short }) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={
                      rule.weekdays.includes(key) ? "default" : "secondary"
                    }
                    className={cn(
                      "rounded-full w-8 h-8 p-0 transition-none",
                      rule.weekdays.includes(key)
                        ? "bg-foreground"
                        : "bg-secondary border border-input"
                    )}
                    onClick={() => toggleItem(index, "weekdays", key)}
                  >
                    {short}
                  </Button>
                ))}
              </div>
            )}
            {rule.frequency === "month" && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">On</span>
                <Select
                  value={rule.month_day_rule}
                  onValueChange={(val) =>
                    updateRule(index, "month_day_rule", val)
                  }
                >
                  <SelectTrigger className="w-[220px] h-9">
                    <SelectValue placeholder="Pick rule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day-of-month">
                      day {start?.getDate()}
                    </SelectItem>
                    <SelectItem value="weekday-of-month">
                      the {getOrdinal(start)}{" "}
                      {
                        WEEKDAY_NAMES[
                          start?.getDay() === 0 ? 6 : start?.getDay() - 1
                        ]
                      }
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {rule.frequency === "year" && (
              <div className="space-y-6">
                {/* In: Month selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    In
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "min-w-[260px] w-full px-2 h-9 justify-start items-center overflow-x-auto whitespace-nowrap",
                          "scrollbar-hide appearance-none",
                          "hover:bg-transparent hover:text-foreground"
                        )}
                      >
                        {rule.months.length === 0 ? (
                          <span className="text-muted-foreground">
                            Select months
                          </span>
                        ) : (
                          <div className="flex gap-1.5 items-center">
                            {[...rule.months]
                              .sort((a, b) => a - b)
                              .map((i) => (
                                <div
                                  key={i}
                                  className="flex items-center px-2 py-0.5 text-sm rounded-sm bg-[#eeeeee] text-foreground"
                                >
                                  {MONTHS[i]}
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleItem(index, "months", i);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleItem(index, "months", i);
                                      }
                                    }}
                                    className="ml-1 hover:text-foreground focus:outline-none"
                                  >
                                    <X className="h-3 w-3" />
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[260px] p-0">
                      <Command>
                        <CommandGroup>
                          {MONTHS.map((month, i) => {
                            const selected = rule.months.includes(i);
                            return (
                              <CommandItem
                                key={i}
                                value={month}
                                onSelect={() => toggleItem(index, "months", i)}
                                className={cn("cursor-pointer px-3 py-2")}
                              >
                                <span className="flex-1">{month}</span>
                                {selected && <span>✓</span>}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* On: Day rule selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    On
                  </span>
                  <Select
                    value={rule.month_day_rule}
                    onValueChange={(val) =>
                      updateRule(index, "month_day_rule", val)
                    }
                  >
                    <SelectTrigger className="w-[220px] h-9">
                      <SelectValue placeholder="Pick rule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day-of-month">
                        day {start?.getDate()}
                      </SelectItem>
                      <SelectItem value="weekday-of-month">
                        the {getOrdinal(start)}{" "}
                        {
                          WEEKDAY_NAMES[
                            start?.getDay() === 0 ? 6 : start?.getDay() - 1
                          ]
                        }
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Ends</span>
              <Select
                value={rule.ends}
                onValueChange={(val) => updateRule(index, "ends", val)}
              >
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="after">After</SelectItem>
                  <SelectItem value="on">On</SelectItem>
                </SelectContent>
              </Select>

              {rule.ends === "after" && (
                <>
                  <Input
                    type="number"
                    min={1}
                    value={rule.ends_after}
                    onChange={(e) =>
                      updateRule(index, "ends_after", parseInt(e.target.value))
                    }
                    className="w-20 h-9"
                  />
                  <span className="text-sm text-muted-foreground">events</span>
                </>
              )}

              {rule.ends === "on" && (
                <FloatingDatePicker
                  value={endsOn}
                  onChange={(date) => {
                    if (!date) return;
                    const tz = event?.timezone || "UTC";
                    const prev = endsOn ?? new Date();
                    date.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                    const wall = date.toISOString().slice(0, 16);
                    const utc = getUtcISOString(wall, tz);
                    updateRule(index, "ends_on", utc);
                  }}
                />
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Recurring rule summary
              </label>

              <div className="relative max-w-[450px]">
                <Input
                  type="text"
                  readOnly
                  value={getRecurringSummary(rule)}
                  className="w-full text-sm pr-[100px]"
                />
                <Button
                  variant="secondary"
                  type="button"
                  className="absolute h-8 px-2 right-[5px] top-[4px] border-none cursor-pointer hover:bg-input text-sm"
                  onClick={() => {
                    setCopyingIndex(index); // See below hook
                    navigator.clipboard.writeText(getRecurringSummary(rule));
                    setTimeout(() => setCopyingIndex(null), 1200);
                  }}
                >
                  {copyingIndex === index ? (
                    <CheckCheck className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copyingIndex === index ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
            {showAttributes && (
              <ShortcodeBox
                attribute={`event_rulesummary_${index + 1}`}
                data={`rulesummary_${index + 1}`}
                eventId={event?.id}
              />
            )}
          </div>
        );
      })}

      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addRule}
          className="w-auto justify-start text-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add recurring rule
        </Button>
      </div>

      <EventDateTBCSetting event={event} setEvent={setEvent} />
      <EventDateTimezoneSetting event={event} setEvent={setEvent} />
    </div>
  );
});
