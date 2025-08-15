"use client";

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
  getUtcISOString,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { MoveRight, Plus, Trash2 } from "lucide-react";
import { DateTime } from "luxon";
import { useState } from "react";

export function EventDateMultiple({ showAttributes }) {
  const { event, setEvent } = useEventEditContext();
  const days = event.event_days || [];
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

  const updateDayDateAndTimes = (index, newStart, newEnd) => {
    const updatedDays = [...days];
    const day = { ...updatedDays[index] };
    day.start_date = getUtcISOString(toWallTimeString(newStart), wpTz);
    day.end_date = getUtcISOString(toWallTimeString(newEnd), wpTz);
    updatedDays[index] = day;
    setEvent((prev) => ({
      ...prev,
      event_days: updatedDays,
    }));
  };

  const updateDay = (index, key, value) => {
    const updatedDays = [...days];
    const day = { ...updatedDays[index] };
    const newErrors = { ...errors };
    const previousEnd = getPreviousEndDate(index);

    // Parse current values in WP time for comparison/manipulation
    const currentStart = day.start_date
      ? DateTime.fromISO(day.start_date, { zone: "utc" }).setZone(wpTz)
      : null;
    const currentEnd = day.end_date
      ? DateTime.fromISO(day.end_date, { zone: "utc" }).setZone(wpTz)
      : null;

    // --- ALL DAY TOGGLE ---
    if (key === "all_day") {
      day.all_day = value;

      if (currentStart && currentEnd) {
        let newStart = currentStart;
        let newEnd = currentEnd;

        if (value) {
          newStart = newStart.set({
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0,
          });
          newEnd = newEnd.set({
            hour: 23,
            minute: 59,
            second: 59,
            millisecond: 999,
          });
        } else {
          if (newStart.hour === 0)
            newStart = newStart.set({ hour: 9, minute: 0 });
          if (newEnd.hour >= 23) newEnd = newEnd.set({ hour: 17, minute: 0 });
        }

        day.start_date = newStart
          .setZone("utc")
          .toISO({ suppressMilliseconds: true });
        day.end_date = newEnd
          .setZone("utc")
          .toISO({ suppressMilliseconds: true });
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
        newErrors[index] = "End must be after start.";
      } else {
        day.end_date = wallTime
          .setZone("utc")
          .toISO({ suppressMilliseconds: true });

        if (
          (event.standard_type || "selected") === "continuous" &&
          index === days.length - 1
        ) {
          setEvent((prev) => ({
            ...prev,
            end_date: wallTime
              .setZone("utc")
              .toISO({ suppressMilliseconds: true }),
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

  const standardType = event.standard_type || "selected";

  return (
    <div className="flex flex-col gap-6">
      {/* Event Type Selector */}
      <StandardTypeSelector
        value={standardType}
        onChange={(value) => {
          setEvent((prev) => {
            return { ...prev, standard_type: value };
          });
        }}
      />

      {standardType === "selected" && (
        <>
          {days.map((day, index) => {
            const startDate = day.start_date
              ? getDateInTimezone(ensureUtcZ(day.start_date), wpTz)
              : undefined;

            const endDate = day.end_date
              ? getDateInTimezone(ensureUtcZ(day.end_date), wpTz)
              : undefined;

            return (
              <div
                key={index}
                className="flex flex-wrap items-center gap-2 md:gap-4 group"
              >
                {/* Date Picker: updates both start and end date parts, preserves time */}
                <FloatingDatePicker
                  value={startDate}
                  wpTz={wpTz} // ✅ pass timezone for consistent behavior
                  onChange={(pickedDate) => {
                    if (!pickedDate) return;

                    const startTime = startDate
                      ? { h: startDate.getHours(), m: startDate.getMinutes() }
                      : { h: 9, m: 0 };
                    const endTime = endDate
                      ? { h: endDate.getHours(), m: endDate.getMinutes() }
                      : { h: 17, m: 0 };

                    // ✅ Ensure the picked date is treated as WP wall time
                    const newStart = DateTime.fromJSDate(pickedDate, {
                      zone: wpTz,
                    })
                      .set({
                        hour: startTime.h,
                        minute: startTime.m,
                        second: 0,
                        millisecond: 0,
                      })
                      .toJSDate();

                    const newEnd = DateTime.fromJSDate(pickedDate, {
                      zone: wpTz,
                    })
                      .set({
                        hour: endTime.h,
                        minute: endTime.m,
                        second: 0,
                        millisecond: 0,
                      })
                      .toJSDate();

                    updateDayDateAndTimes(index, newStart, newEnd);
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
                      setDate={(utcDate) => {
                        if (!utcDate || !startDate) return;

                        // `utcDate` from TimeInput is already in UTC
                        const parsedUtc = DateTime.fromJSDate(utcDate, {
                          zone: "utc",
                        }).setZone(wpTz);

                        // Take existing WP wall date and replace time
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
                          "start_date",
                          dtWall.toISO({ suppressMilliseconds: true })
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
                    checked={day.all_day}
                    onCheckedChange={(checked) =>
                      updateDay(index, "all_day", checked)
                    }
                    disabled={tbc}
                  />
                  <span className="text-sm text-muted-foreground">All day</span>
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
            Add day
          </Button>
        </div>
      )}
    </div>
  );
}
