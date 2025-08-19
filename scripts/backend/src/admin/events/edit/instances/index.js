import { Box } from "@/components/box";
import { ProLaunch } from "@/components/dashboard/pro-launch";
import { EventInstancesTable } from "@/components/event/instances-table";
import { Panel } from "@/components/panel";
import { Textarea } from "@/components/ui/textarea";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { useSettings } from "@/hooks/SettingsContext";
import { cn } from "@/lib/utils";
import { DateTime } from "luxon";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RRule } from "rrule";

const MAX_INSTANCES = 500;

export function generateInstances(
  rules = [],
  title = "",
  overrides = [],
  workingDays = [],
  eventUrl = null,
  includeTrashed = false,
  timezone = "UTC"
) {
  const now = new Date();
  const instances = [];

  const weekdaysMap = [
    RRule.MO,
    RRule.TU,
    RRule.WE,
    RRule.TH,
    RRule.FR,
    RRule.SA,
    RRule.SU,
  ];

  let globalIndex = 0;

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];

    const luxonStart = DateTime.fromISO(rule.start_date, { zone: "utc" });
    const luxonEnd = DateTime.fromISO(rule.end_date, { zone: "utc" });

    const duration = luxonEnd.diff(luxonStart);

    const start = new Date(
      luxonStart.year,
      luxonStart.month - 1,
      luxonStart.day,
      luxonStart.hour,
      luxonStart.minute,
      luxonStart.second,
      luxonStart.millisecond
    );

    const end = luxonEnd.toUTC().toJSDate(); // end date in UTC

    const startHour = luxonStart.hour;
    const startMinute = luxonStart.minute;
    const endHour = luxonEnd.hour;
    const endMinute = luxonEnd.minute;

    if (!start) {
      continue; // Skip if no start date is provided.
    }

    if (!end && rule.all_day) {
      end = new Date(start);
      end.setHours(23, 59, 0, 0);
    }

    if (!end) {
      continue; // Skip if no valid end is set.
    }

    const isNeverEnding = rule.ends === "never";

    if (
      rule.frequency === "day" &&
      rule.working_days_only === true &&
      Array.isArray(workingDays) &&
      workingDays.length > 0
    ) {
      const simulated = [];
      const dateCursor = new Date(start);
      const ruleInterval = rule.every || 1;

      let skipCounter = 0;
      let added = 0;

      while (simulated.length < MAX_INSTANCES) {
        const weekday = dateCursor.getDay();

        if (workingDays.includes(weekday)) {
          if (skipCounter === 0) {
            simulated.push(new Date(dateCursor));
            added++;
            skipCounter = ruleInterval - 1;

            if (rule.ends === "after" && added >= rule.ends_after) {
              break;
            }

            if (rule.ends === "on" && dateCursor > new Date(rule.ends_on)) {
              break;
            }
          } else {
            skipCounter--;
          }
        }

        dateCursor.setDate(dateCursor.getDate() + 1);
      }

      for (let j = 0; j < simulated.length; j++) {
        const date = simulated[j];

        const instanceStart = DateTime.fromObject(
          {
            year: date.getFullYear?.() ?? date.year,
            month: date.getMonth?.() + 1 ?? date.month,
            day: date.getDate?.() ?? date.day,
            hour: startHour,
            minute: startMinute,
          },
          { zone: "utc" }
        );

        const instanceEnd = instanceStart.plus(duration);

        const instanceTimestamp = Math.floor(instanceStart.toUTC().toSeconds());

        const override = overrides.find(
          (o) => o.timestamp === instanceTimestamp
        );

        const isLive = instanceStart <= now && now < instanceEnd;
        const isPast = instanceEnd < now;

        let status;

        if (override?.status === "trash") {
          if (!includeTrashed) continue;
          status = "trash";
        } else if (isLive) {
          status = "live";
        } else if (isPast) {
          status = "completed";
        } else {
          status = "upcoming";
        }

        const hasTrailingSlash = eventUrl?.endsWith("/");
        const isPrettyLink = hasTrailingSlash || eventUrl?.includes("/event/");

        const instanceUrl = eventUrl
          ? isPrettyLink
            ? `${eventUrl.replace(/\/$/, "")}/${instanceTimestamp}`
            : `${eventUrl}?instance=${instanceTimestamp}`
          : null;

        instances.push({
          id: String(globalIndex++),
          title: override?.title || title || `Instance ${j + 1}`,
          status,
          all_day: rule.all_day || false,
          start_date: instanceStart
            .toUTC()
            .toISO({ suppressMilliseconds: false }),
          end_date: instanceEnd.toUTC().toISO({ suppressMilliseconds: false }),
          modified_date: override?.modified_at || "",
          instance_url: instanceUrl,
          override, // ✅ so the table can use it
        });
      }

      continue;
    }

    let byweekday;

    if (rule.frequency === "week" && rule.weekdays?.length) {
      byweekday = rule.weekdays.map((i) => weekdaysMap[i]);
    }

    if (
      (rule.frequency === "month" || rule.frequency === "year") &&
      rule.month_day_rule === "weekday-of-month"
    ) {
      const weekdayIndex = luxonStart.weekday - 1;
      const ordinal = Math.ceil(luxonStart.day / 7); // Dynamically compute nth weekday
      byweekday = [weekdaysMap[weekdayIndex].nth(ordinal)];
    }

    const options = {
      freq:
        rule.frequency === "day"
          ? RRule.DAILY
          : rule.frequency === "week"
          ? RRule.WEEKLY
          : rule.frequency === "month"
          ? RRule.MONTHLY
          : RRule.YEARLY,
      interval: rule.every || 1,
      dtstart: start,
      count:
        rule.ends === "after"
          ? rule.ends_after
          : isNeverEnding
          ? MAX_INSTANCES
          : undefined,
      until: rule.ends === "on" ? new Date(rule.ends_on) : undefined,
      byweekday,
      bymonthday:
        rule.frequency === "month" &&
        rule.month_day_rule === "day-of-month" &&
        rule.month_day_value
          ? [rule.month_day_value]
          : undefined,
      bymonth:
        rule.frequency === "year" && rule.months?.length
          ? rule.months.map((m) => m + 1)
          : undefined,
    };

    try {
      const rrule = new RRule(options);
      const dates = rrule.all();

      for (
        let j = 0;
        j < dates.length && instances.length < MAX_INSTANCES;
        j++
      ) {
        const date = dates[j];

        const instanceStart = DateTime.fromObject(
          {
            year: date.getFullYear?.() ?? date.year,
            month: date.getMonth?.() + 1 ?? date.month,
            day: date.getDate?.() ?? date.day,
            hour: startHour,
            minute: startMinute,
          },
          { zone: "utc" }
        );

        const instanceEnd = instanceStart.plus(duration);

        const instanceTimestamp = Math.floor(instanceStart.toUTC().toSeconds());

        const override = overrides.find(
          (o) => o.timestamp === instanceTimestamp
        );

        const isLive = instanceStart <= now && now < instanceEnd;
        const isPast = instanceEnd < now;

        let status;

        if (override?.status === "trash") {
          if (!includeTrashed) continue;
          status = "trash";
        } else if (isLive) {
          status = "live";
        } else if (isPast) {
          status = "completed";
        } else {
          status = "upcoming";
        }

        const hasTrailingSlash = eventUrl?.endsWith("/");
        const isPrettyLink = hasTrailingSlash || eventUrl?.includes("/event/");

        const instanceUrl = eventUrl
          ? isPrettyLink
            ? `${eventUrl.replace(/\/$/, "")}/${instanceTimestamp}`
            : `${eventUrl}?instance=${instanceTimestamp}`
          : null;

        instances.push({
          id: String(globalIndex++),
          title: title || `Instance ${j + 1}`,
          status,
          all_day: rule.all_day || false,
          start_date: instanceStart
            .toUTC()
            .toISO({ suppressMilliseconds: false }),
          end_date: instanceEnd.toUTC().toISO({ suppressMilliseconds: false }),
          modified_date: override?.modified_at || "",
          instance_url: instanceUrl,
          override,
        });
      }
    } catch (err) {
      console.error("Failed to generate recurring instances:", err);
    }
  }

  return includeTrashed
    ? instances.filter((i) => i.status === "trash")
    : instances.filter((i) => i.status !== "trash");
}

export function EventEditInstances() {
  const { event } = useEventEditContext();
  const { settings } = useSettings();
  const textareaRef = useRef(null);
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";

  const workingDays = useMemo(() => {
    return Array.isArray(settings?.working_days)
      ? settings.working_days.map((v) => parseInt(v, 10))
      : [0, 1, 2, 3, 4];
  }, [settings?.working_days]);

  const [instances, setInstances] = useState([]);

  useEffect(() => {
    const overrideArray = event?.recurrence_overrides
      ? Object.entries(event.recurrence_overrides).map(
          ([timestamp, override]) => ({
            ...override,
            timestamp: Number(timestamp),
          })
        )
      : [];

    const showOnlyTrashed = statusFilter === "trash";

    const newInstances = generateInstances(
      event?.recurrence_rules,
      event?.title,
      overrideArray,
      workingDays,
      event?.url,
      showOnlyTrashed,
      event?.timezone
    );

    setInstances(newInstances);
  }, [
    event?.recurrence_rules,
    event?.title,
    event?.recurrence_overrides,
    workingDays,
    event?.id,
    event?.url,
    statusFilter,
    searchParams,
  ]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [event?.title]);

  console.log(instances);

  return (
    <>
      <ProLaunch className="mb-8" />
      <div className="flex flex-col w-full gap-8">
        <Box container>
          <Panel className="flex gap-2 p-0">
            <div className="relative flex items-center gap-2">
              <Textarea
                ref={textareaRef}
                id="event-name-readonly"
                className={cn(
                  "inline-flex flex-1 resize-none overflow-hidden bg-transparent border-2 border-transparent rounded-md p-2 font-medium text-2xl leading-tight min-h-0 w-auto max-w-full",
                  "text-foreground",
                  "shadow-none ring-0 focus:ring-0 focus-visible:ring-0",
                  "outline-none focus:outline-none focus-visible:outline-none",
                  "focus-visible:ring-offset-0 focus-visible:ring-transparent focus-visible:ring-offset-transparent",
                  "cursor-default select-none",
                  !event?.title && "text-muted-foreground"
                )}
                value={event?.title || ""}
                readOnly
                rows={1}
              />
            </div>
          </Panel>

          <EventInstancesTable
            instances={instances}
            isLoading={false}
            eventId={event?.id}
            timezone={event?.timezone}
            status={statusFilter}
          />
        </Box>
      </div>
    </>
  );
}
