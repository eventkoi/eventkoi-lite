"use client";

import { ShortcodeBox } from "@/components/ShortcodeBox";
import { TimeInput } from "@/components/time-input";
import { Button } from "@/components/ui/button";
import { FloatingDatePicker } from "@/components/ui/FloatingDatePicker";
import { Switch } from "@/components/ui/switch";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { getDateInTimezone, getUtcISOString } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { isBefore } from "date-fns";
import { MoveRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export function EventDateMultiple({ showAttributes }) {
  const { event, setEvent } = useEventEditContext();
  const days = event.event_days || [];
  const tbc = event?.tbc ?? false;
  const timezone = event?.timezone || "UTC";

  const [errors, setErrors] = useState({});

  const getPreviousEndDate = (index) => {
    if (index === 0) return null;
    const previousDay = days[index - 1];
    return previousDay?.end_date ? new Date(previousDay.end_date) : null;
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
    day.start_date = getUtcISOString(toWallTimeString(newStart), timezone);
    day.end_date = getUtcISOString(toWallTimeString(newEnd), timezone);
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

    const currentStart = day.start_date ? new Date(day.start_date) : null;
    const currentEnd = day.end_date ? new Date(day.end_date) : null;

    if (key === "all_day") {
      day.all_day = value;

      if (currentStart && currentEnd) {
        const newStart = getDateInTimezone(currentStart, timezone);
        const newEnd = getDateInTimezone(currentEnd, timezone);

        if (value) {
          newStart.setHours(0, 0, 0, 0);
          newEnd.setHours(23, 59, 59, 999);
        } else {
          if (newStart.getHours() === 0) newStart.setHours(9, 0, 0, 0);
          if (newEnd.getHours() >= 23) newEnd.setHours(17, 0, 0, 0);
        }

        day.start_date = getUtcISOString(toWallTimeString(newStart), timezone);
        day.end_date = getUtcISOString(toWallTimeString(newEnd), timezone);
      }
    }

    if (key === "start_date") {
      const newStart = new Date(value);

      if (previousEnd && isBefore(newStart, previousEnd)) {
        newErrors[index] = "Start must be after previous event.";
      } else {
        day.start_date = getUtcISOString(toWallTimeString(newStart), timezone);

        if (currentEnd && isBefore(currentEnd, newStart)) {
          const newEnd = new Date(newStart);
          newEnd.setHours(newEnd.getHours() + 8);
          day.end_date = getUtcISOString(toWallTimeString(newEnd), timezone);
        }

        delete newErrors[index];
      }
    }

    if (key === "end_date") {
      const newEnd = new Date(value);

      if (currentStart && isBefore(newEnd, currentStart)) {
        newErrors[index] = "End must be after start.";
      } else {
        day.end_date = getUtcISOString(toWallTimeString(newEnd), timezone);
        delete newErrors[index];
      }
    }

    updatedDays[index] = day;

    console.log(updatedDays);

    setEvent((prev) => ({
      ...prev,
      event_days: updatedDays,
    }));

    setErrors(newErrors);
  };

  const addDay = () => {
    const lastDay = days[days.length - 1];
    const base = lastDay?.end_date
      ? getDateInTimezone(lastDay.end_date, timezone)
      : getDateInTimezone(new Date(), timezone);

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

  return (
    <div className="flex flex-col gap-6">
      {days.map((day, index) => {
        const startDate = day.start_date
          ? getDateInTimezone(day.start_date, timezone)
          : undefined;

        const endDate = day.end_date
          ? getDateInTimezone(day.end_date, timezone)
          : undefined;

        return (
          <div
            key={index}
            className="flex flex-wrap items-center gap-2 md:gap-4 group"
          >
            {/* Date Picker: updates both start and end date parts, preserves time */}
            <FloatingDatePicker
              value={startDate}
              onChange={(date) => {
                if (!date) return;
                const startTime = startDate
                  ? { h: startDate.getHours(), m: startDate.getMinutes() }
                  : { h: 9, m: 0 };
                const endTime = endDate
                  ? { h: endDate.getHours(), m: endDate.getMinutes() }
                  : { h: 17, m: 0 };

                const newStart = new Date(date);
                newStart.setHours(startTime.h, startTime.m, 0, 0);
                const newEnd = new Date(date);
                newEnd.setHours(endTime.h, endTime.m, 0, 0);

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
                  setDate={(time) => {
                    if (!time || !startDate) return;
                    // Apply new time to current date
                    const newStart = new Date(startDate);
                    newStart.setHours(time.getHours(), time.getMinutes(), 0, 0);
                    updateDay(index, "start_date", newStart.toISOString());
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
                  setDate={(time) => {
                    if (!time || !startDate) return;
                    const newEnd = new Date(startDate);
                    newEnd.setHours(time.getHours(), time.getMinutes(), 0, 0);
                    updateDay(index, "end_date", newEnd.toISOString());
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

      {showAttributes && (
        <ShortcodeBox
          attribute="event_datetime"
          data="datetime"
          eventId={event?.id}
        />
      )}

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
    </div>
  );
}
