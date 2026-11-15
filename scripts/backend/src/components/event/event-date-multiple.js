"use client";

import { __ } from "@wordpress/i18n";
import { ContinuousEventDates } from "@/components/event/continuous-event-dates";
import { StandardTypeSelector } from "@/components/event/standard-type-selector";
import { ShortcodeBox } from "@/components/ShortcodeBox";
import { TimeInput } from "@/components/time-input";
import { Button } from "@/components/ui/button";
import { FloatingDatePicker } from "@/components/ui/FloatingDatePicker";
import { Switch } from "@/components/ui/switch";
import { useEventEditContext } from "@/hooks/EventEditContext";
import {
  ensureUtcZ,
  getDateInTimezone,
  normalizeTimeZone,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { MoveRight, Plus, Trash2 } from "lucide-react";
import { DateTime } from "luxon";
import { useState } from "react";

const getValidTimezone = (timezone, fallback = "UTC") => {
  const fallbackZone = normalizeTimeZone(fallback || "UTC");
  const normalized = normalizeTimeZone(timezone || fallbackZone);

  return DateTime.now().setZone(normalized).isValid
    ? normalized
    : fallbackZone;
};

const getAllDayTimezone = (day, event, fallback) =>
  getValidTimezone(
    day?.all_day_timezone || event?.all_day_timezone || event?.timezone,
    fallback
  );

const getDateOnlyInTimezone = (dateOnly, timezone) => {
  if (!dateOnly) {
    return undefined;
  }

  const dt = DateTime.fromISO(String(dateOnly), {
    zone: getValidTimezone(timezone),
  });

  return dt.isValid ? dt.toJSDate() : undefined;
};

const getAllDayDateTime = (value, timezone) => {
  const zone = getValidTimezone(timezone);
  let dt = null;

  if (DateTime.isDateTime(value)) {
    dt = value.setZone(zone, { keepLocalTime: true });
  } else if (value instanceof Date) {
    dt = DateTime.fromJSDate(value, { zone });
  } else if (value) {
    dt = DateTime.fromISO(String(value), { zone });
  }

  if (!dt?.isValid) {
    return null;
  }

  return DateTime.fromObject(
    {
      year: dt.year,
      month: dt.month,
      day: dt.day,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    },
    { zone }
  );
};

const getAllDayBounds = (value, timezone) => {
  const zone = getValidTimezone(timezone);
  const start = getAllDayDateTime(value, zone);

  if (!start) {
    return null;
  }

  const end = start.set({
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 0,
  });

  return {
    startIso: start.toUTC().toISO({ suppressMilliseconds: true }),
    endIso: end.toUTC().toISO({ suppressMilliseconds: true }),
    startDate: start.toISODate(),
    endDate: start.toISODate(),
    endExclusiveDate: start.plus({ days: 1 }).toISODate(),
    timezone: zone,
  };
};

const allDayFieldsFromBounds = (bounds) => ({
  all_day_timezone: bounds.timezone,
  all_day_start_date: bounds.startDate,
  all_day_end_date: bounds.endDate,
  all_day_end_exclusive_date: bounds.endExclusiveDate,
});

const clearAllDayFields = (day) => {
  delete day.all_day_timezone;
  delete day.all_day_start_date;
  delete day.all_day_end_date;
  delete day.all_day_end_exclusive_date;
};

const getEndAfterStartChange = (previousStart, previousEnd, newStart) => {
  const fallback = newStart.plus({ hours: 1 });

  if (
    !previousStart?.isValid ||
    !previousEnd?.isValid ||
    previousEnd <= previousStart
  ) {
    return fallback;
  }

  const duration = previousEnd.diff(previousStart);
  const durationMinutes = duration.as("minutes");
  const isGeneratedNineToFiveRange =
    previousStart.hasSame(previousEnd, "day") &&
    previousStart.hour === 9 &&
    previousStart.minute === 0 &&
    previousEnd.hour === 17 &&
    previousEnd.minute === 0;

  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0 ||
    isGeneratedNineToFiveRange
  ) {
    return fallback;
  }

  return newStart.plus(duration);
};

const getDayStartDate = (day, event, wpTz) => {
  if (!day?.start_date) {
    return undefined;
  }

  if (day.all_day) {
    const allDayTz = getAllDayTimezone(day, event, wpTz);
    return (
      getDateOnlyInTimezone(day.all_day_start_date, allDayTz) ||
      getDateInTimezone(ensureUtcZ(day.start_date), allDayTz)
    );
  }

  return getDateInTimezone(ensureUtcZ(day.start_date), wpTz);
};

const getDayEndDate = (day, event, wpTz) => {
  if (!day?.end_date) {
    return undefined;
  }

  if (day.all_day) {
    const allDayTz = getAllDayTimezone(day, event, wpTz);
    return (
      getDateOnlyInTimezone(day.all_day_end_date, allDayTz) ||
      getDateInTimezone(ensureUtcZ(day.end_date), allDayTz)
    );
  }

  return getDateInTimezone(ensureUtcZ(day.end_date), wpTz);
};

export function EventDateMultiple({ showAttributes }) {
  const { event, setEvent } = useEventEditContext();
  const days = event.event_days?.length
    ? event.event_days
    : [{ start_date: null, end_date: null, all_day: false }];
  const tbc = event?.tbc ?? false;
  const wpTz =
    event?.timezone || window.eventkoi_params?.timezone_string || "UTC";

  const [errors, setErrors] = useState({});

  const getPreviousEndDate = (index) => {
    if (index === 0) return null;
    const previousDay = days[index - 1];
    return previousDay?.end_date
      ? DateTime.fromISO(previousDay.end_date, { zone: "utc" }).setZone(wpTz)
      : null;
  };

  const toWallTimeString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:00`;
  };

  const updateDayDateAndTimes = (index, startIso, endIso, extra = {}) => {
    const updatedDays = [...days];
    const day = { ...updatedDays[index], ...extra };
    day.start_date = startIso;
    day.end_date = endIso;
    updatedDays[index] = day;
    setEvent((prev) => ({ ...prev, event_days: updatedDays }));
  };

  const updateDay = (index, key, value) => {
    const updatedDays = [...days];
    const day = { ...updatedDays[index] };
    const newErrors = { ...errors };
    const previousEnd = getPreviousEndDate(index);

    // Parse current values in WP time for comparison/manipulation
    const allDayTz = getAllDayTimezone(day, event, wpTz);
    const currentStartDate = getDayStartDate(day, event, wpTz);
    const currentEndDate = getDayEndDate(day, event, wpTz);
    const currentStart = currentStartDate
      ? DateTime.fromJSDate(currentStartDate, {
          zone: day.all_day ? allDayTz : wpTz,
        })
      : null;
    const currentEnd = currentEndDate
      ? DateTime.fromJSDate(currentEndDate, {
          zone: day.all_day ? allDayTz : wpTz,
        })
      : null;

    // --- ALL DAY TOGGLE ---
    if (key === "all_day") {
      day.all_day = value;

      if (currentStart && currentEnd) {
        if (value) {
          const bounds = getAllDayBounds(currentStart, allDayTz);

          if (bounds) {
            day.start_date = bounds.startIso;
            day.end_date = bounds.endIso;
            Object.assign(day, allDayFieldsFromBounds(bounds));
          }
        } else {
          let newStart = DateTime.fromObject(
            {
              year: currentStart.year,
              month: currentStart.month,
              day: currentStart.day,
              hour: currentStart.hour === 0 ? 9 : currentStart.hour,
              minute: currentStart.hour === 0 ? 0 : currentStart.minute,
              second: 0,
              millisecond: 0,
            },
            { zone: wpTz }
          );
          let newEnd = DateTime.fromObject(
            {
              year: currentEnd.year,
              month: currentEnd.month,
              day: currentEnd.day,
              hour: currentEnd.hour >= 23 ? 17 : currentEnd.hour,
              minute: currentEnd.hour >= 23 ? 0 : currentEnd.minute,
              second: 0,
              millisecond: 0,
            },
            { zone: wpTz }
          );

          day.start_date = newStart
            .setZone("utc")
            .toISO({ suppressMilliseconds: true });
          day.end_date = newEnd
            .setZone("utc")
            .toISO({ suppressMilliseconds: true });
          clearAllDayFields(day);
        }
      }
    }

    if (key === "start_date") {
      if (/[+-]\d\d:\d\d|Z$/.test(value)) {
        // Already has offset → assume UTC or explicit tz
        day.start_date = DateTime.fromISO(value)
          .toUTC()
          .toISO({ suppressMilliseconds: true });
      } else {
        // Only wall-time string → interpret in WP tz
        const wallTime = DateTime.fromISO(value, { zone: wpTz });
        day.start_date = wallTime.toUTC().toISO({ suppressMilliseconds: true });
      }

      if (currentEnd && DateTime.fromISO(day.start_date) > currentEnd) {
        const newEnd = DateTime.fromISO(day.start_date).plus({ hours: 8 });
        day.end_date = newEnd.toUTC().toISO({ suppressMilliseconds: true });
      }

      delete newErrors[index];
    }

    if (key === "end_date") {
      const wallTime = DateTime.fromISO(value, { zone: wpTz });

      if (currentStart && wallTime < currentStart) {
        newErrors[index] = __("End must be after start.", "eventkoi-lite");
      } else {
        day.end_date = wallTime
          .setZone("utc")
          .toISO({ suppressMilliseconds: true });

        // Only sync top-level end_date for continuous
        if (event.standard_type === "continuous" && index === days.length - 1) {
          setEvent((prev) => ({
            ...prev,
            end_date: day.end_date,
          }));
        }

        delete newErrors[index];
      }
    }

    updatedDays[index] = day;

    setEvent((prev) => ({
      ...prev,
      event_days: updatedDays,
    }));

    setErrors(newErrors);
  };

  const addDay = () => {
    const lastDay = days[days.length - 1];
    const base = lastDay?.end_date
      ? getDateInTimezone(lastDay.end_date, wpTz)
      : getDateInTimezone(new Date().toISOString(), wpTz);

    const start = new Date(base);
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);

    const end = new Date(start);
    end.setHours(17, 0, 0, 0);

    const newDay = {
      // Stable React-key identifier (stripped server-side before persist).
      // Was key={index} before — input focus + per-row state attached to
      // the wrong row after middle-row delete.
      _uid: `day_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      start_date: null,
      end_date: null,
      all_day: false,
    };

    setEvent((prev) => ({
      ...prev,
      event_days: [...(prev.event_days || []), newDay],
    }));
  };

  const deleteDay = (index) => {
    if (days.length <= 1) return;
    const updatedDays = [...days];
    updatedDays.splice(index, 1);
    setEvent((prev) => ({
      ...prev,
      event_days: updatedDays,
    }));
  };

  const standardType = event.standard_type || "continuous";

  return (
    <div className="flex flex-col gap-6">
      {/* Event Type Selector */}
      <StandardTypeSelector
        value={standardType}
        onChange={(value) => {
          setEvent((prev) => {
            if (value === "continuous") {
              return {
                ...prev,
                standard_type: "continuous",
                start_date: null,
                end_date: null,
                event_days: [],
              };
            }

            if (value === "selected") {
              // Always start with an empty event_day
              const days = [
                {
                  start_date: null,
                  end_date: null,
                  all_day: false,
                },
              ];

              return {
                ...prev,
                standard_type: "selected",
                start_date: null, // clear continuous span
                end_date: null,
                event_days: days,
              };
            }

            return prev;
          });
        }}
      />

      {standardType === "selected" && (
        <>
          {days.map((day, index) => {
            const dayTz = day.all_day
              ? getAllDayTimezone(day, event, wpTz)
              : wpTz;
            const startDate = getDayStartDate(day, event, wpTz);
            const endDate = getDayEndDate(day, event, wpTz);
            const rowKey = day._uid
              || (day.start_date ? `srv_${day.start_date}_${day.end_date || ""}` : `idx_${index}`);

            return (
              <div
                key={rowKey}
                className="flex flex-wrap items-center gap-2 md:gap-4 group"
              >
                {/* Date Picker: updates both start and end date parts, preserves time */}
                <FloatingDatePicker
                  value={startDate}
                  wpTz={dayTz}
                  onChange={(pickedDate) => {
                    if (!pickedDate) return;

                    if (day.all_day) {
                      const bounds = getAllDayBounds(pickedDate, dayTz);

                      if (bounds) {
                        updateDayDateAndTimes(
                          index,
                          bounds.startIso,
                          bounds.endIso,
                          allDayFieldsFromBounds(bounds)
                        );
                      }

                      return;
                    }

                    const startWall = startDate
                      ? DateTime.fromJSDate(startDate, { zone: wpTz })
                      : null;
                    const startTime = startWall?.isValid
                      ? { h: startWall.hour, m: startWall.minute }
                      : { h: 9, m: 0 };

                    const endWall = endDate
                      ? DateTime.fromJSDate(endDate, { zone: wpTz })
                      : null;

                    // pickedDate is already Luxon in WP tz
                    const newStart = pickedDate.set({
                      hour: startTime.h,
                      minute: startTime.m,
                      second: 0,
                      millisecond: 0,
                    });

                    const newEnd = getEndAfterStartChange(
                      startWall,
                      endWall,
                      newStart
                    );

                    updateDayDateAndTimes(
                      index,
                      newStart.toUTC().toISO({ suppressMilliseconds: true }),
                      newEnd.toUTC().toISO({ suppressMilliseconds: true })
                    );
                  }}
                  className={cn(
                    "disabled:bg-muted disabled:text-muted-foreground/40 disabled:cursor-not-allowed disabled:opacity-100"
                  )}
                  disabled={tbc}
                />

                {/* Start Time Input: only updates time of start_date */}
                {!day.all_day && (
                  <>
                    <TimeInput
                      date={startDate}
                      wpTz={wpTz}
                      commitOnValidChange
                      setDate={(utcDate) => {
                        if (!utcDate) return;

                        // `utcDate` from TimeInput is already in UTC
                        const parsedUtc = DateTime.fromJSDate(utcDate, {
                          zone: "utc",
                        }).setZone(wpTz);

                        // Take existing WP wall date and replace time
                        const currentStart = startDate
                          ? DateTime.fromJSDate(startDate, { zone: wpTz })
                          : DateTime.now().setZone(wpTz).startOf("day");
                        const dtWall = currentStart.set({
                          hour: parsedUtc.hour,
                          minute: parsedUtc.minute,
                          second: 0,
                          millisecond: 0,
                        });
                        const currentEnd = endDate
                          ? DateTime.fromJSDate(endDate, { zone: wpTz })
                          : null;
                        const nextEnd = getEndAfterStartChange(
                          currentStart,
                          currentEnd,
                          dtWall
                        );

                        updateDayDateAndTimes(
                          index,
                          dtWall.toUTC().toISO({ suppressMilliseconds: true }),
                          nextEnd.toUTC().toISO({ suppressMilliseconds: true })
                        );
                      }}
                      disabled={tbc}
                    />
                    <MoveRight
                      className="w-6 h-6 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    {/* End Time Input: only updates time of end_date, but always keeps the date SAME as startDate */}
                    <TimeInput
                      date={endDate}
                      wpTz={wpTz}
                      setDate={(utcDate) => {
                        if (!utcDate || !startDate) return;

                        // Convert the UTC date from TimeInput into WP tz
                        const parsedUtc = DateTime.fromJSDate(utcDate, {
                          zone: "utc",
                        }).setZone(wpTz);

                        // Overlay hours/minutes on the same day as startDate in WP tz
                        const dtWall = DateTime.fromJSDate(startDate, {
                          zone: wpTz,
                        }).set({
                          hour: parsedUtc.hour,
                          minute: parsedUtc.minute,
                          second: 0,
                          millisecond: 0,
                        });

                        updateDay(
                          index,
                          "end_date",
                          dtWall.toISO({ suppressMilliseconds: true })
                        );
                      }}
                      disabled={tbc}
                    />
                  </>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    aria-label={__("All day", "eventkoi-lite")}
                    checked={day.all_day}
                    onCheckedChange={(checked) =>
                      updateDay(index, "all_day", checked)
                    }
                    disabled={tbc}
                  />
                  <span className="text-sm text-muted-foreground">{__("All day", "eventkoi-lite")}</span>
                  {index !== 0 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteDay(index)}
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      disabled={days.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {standardType === "continuous" && (
        <ContinuousEventDates
          event={event}
          updateDay={updateDay}
          updateEvent={(key, value) =>
            setEvent((prev) => ({
              ...prev,
              [key]: value,
            }))
          }
        />
      )}

      {showAttributes && (
        <ShortcodeBox
          attribute="event_datetime"
          data="datetime"
          eventId={event?.id}
        />
      )}

      {standardType === "selected" && (
        <div className="flex">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addDay}
            className="w-auto justify-start text-sm"
            disabled={tbc}
          >
            <Plus className="w-4 h-4 mr-2" />
            {__("Add day", "eventkoi-lite")}
          </Button>
        </div>
      )}
    </div>
  );
}
