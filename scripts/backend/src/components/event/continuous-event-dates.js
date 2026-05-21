"use client";

import { __ } from "@wordpress/i18n";
import { TimeInput } from "@/components/time-input";
import { Switch } from "@/components/ui/switch";
import { FloatingDatePicker } from "@/components/ui/FloatingDatePicker";
import {
  ensureUtcZ,
  getDateInTimezone,
  getUtcISOString,
  normalizeTimeZone,
} from "@/lib/date-utils";
import { MoveRight } from "lucide-react";
import { DateTime } from "luxon";

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

export function ContinuousEventDates({ event, updateDay, updateEvent, tbc }) {
  const wpTz = event?.timezone || "UTC";

  const len = Array.isArray(event.event_days) ? event.event_days.length : 0;
  const startIndex = 0;
  const endIndex = Math.max(0, len - 1);

  const allDay = !!event?.event_days?.[0]?.all_day;
  const startDay = event?.event_days?.[startIndex] || {};
  const endDay = event?.event_days?.[endIndex] || startDay;
  const startAllDayTz = getAllDayTimezone(startDay, event, wpTz);
  const endAllDayTz = getAllDayTimezone(endDay, event, startAllDayTz);

  const startDate = event.start_date
    ? allDay
      ? getDateOnlyInTimezone(startDay.all_day_start_date, startAllDayTz) ||
        getDateInTimezone(ensureUtcZ(event.start_date), startAllDayTz)
      : getDateInTimezone(ensureUtcZ(event.start_date), wpTz)
    : undefined;

  const endDate = event.end_date
    ? allDay
      ? getDateOnlyInTimezone(endDay.all_day_end_date, endAllDayTz) ||
        getDateInTimezone(ensureUtcZ(event.end_date), endAllDayTz)
      : getDateInTimezone(ensureUtcZ(event.end_date), wpTz)
    : undefined;

  const applyAllDayBoundary = (baseDays, which, bounds) => {
    const updatedDays =
      Array.isArray(baseDays) && baseDays.length > 0
        ? baseDays.map((day) => ({ ...day }))
        : [
            {
              start_date: event.start_date || bounds.startIso,
              end_date: event.end_date || bounds.endIso,
              all_day: true,
            },
          ];
    const targetIndex =
      which === "start" ? startIndex : Math.max(0, updatedDays.length - 1);
    const day = { ...updatedDays[targetIndex], all_day: true };

    day.all_day_timezone = bounds.timezone;

    if (which === "start") {
      day.start_date = bounds.startIso;
      day.all_day_start_date = bounds.startDate;
    } else {
      day.end_date = bounds.endIso;
      day.all_day_end_date = bounds.endDate;
      day.all_day_end_exclusive_date = bounds.endExclusiveDate;
    }

    updatedDays[targetIndex] = day;

    return updatedDays;
  };

  const setAllDay = (value) => {
    // Compute normalized ISO dates when turning all-day ON
    let newStartIso = event.start_date;
    let newEndIso = event.end_date;
    let startBounds = null;
    let endBounds = null;
    const allDayTz = getAllDayTimezone(startDay, event, wpTz);

    if (value) {
      if (startDate) {
        startBounds = getAllDayBounds(startDate, allDayTz);
        newStartIso = startBounds?.startIso || newStartIso;
      }
      if (endDate) {
        endBounds = getAllDayBounds(endDate, allDayTz);
        newEndIso = endBounds?.endIso || newEndIso;
      }
    }

    // Build event_days atomically: all_day flag on every day + normalized first/last dates
    const baseDays =
      Array.isArray(event.event_days) && event.event_days.length > 0
        ? event.event_days
        : [{ start_date: newStartIso, end_date: newEndIso }];
    const lastIdx = baseDays.length - 1;
    const updatedDays = baseDays.map((d, idx) => {
      const next = { ...d, all_day: value };
      if (value) {
        next.all_day_timezone = allDayTz;
        if (idx === 0 && startBounds) {
          next.start_date = startBounds.startIso;
          next.all_day_start_date = startBounds.startDate;
        }
        if (idx === lastIdx && endBounds) {
          next.end_date = endBounds.endIso;
          next.all_day_end_date = endBounds.endDate;
          next.all_day_end_exclusive_date = endBounds.endExclusiveDate;
        }
      } else {
        clearAllDayFields(next);
      }
      return next;
    });

    // Only touch event_days here — top-level start_date/end_date are derived from it on save.
    // Using updateDay() would read a stale `days` closure and clobber our all_day flag.
    updateEvent("event_days", updatedDays);
    if (value) {
      updateEvent("start_date", newStartIso);
      updateEvent("end_date", newEndIso);
    }
  };

  const ensureDayAt = (index, which) => {
    if (!len && index === 0) {
      const nowUtc = getUtcISOString(new Date().toISOString(), wpTz);

      if (which === "start") {
        updateDay(0, "start_date", nowUtc);
      }
      if (which === "end") {
        updateDay(0, "end_date", nowUtc);
      }
    }
  };

  const updateContinuous = (which, wallTimeJS) => {
    // Convert JS Date (wall time in wpTz) → UTC ISO before saving
    const utcIso = getUtcISOString(
      DateTime.fromJSDate(wallTimeJS, { zone: wpTz }).toISO(),
      wpTz
    );

    if (which === "start") {
      ensureDayAt(startIndex, "start");
      updateDay(startIndex, "start_date", utcIso);
      updateEvent("start_date", utcIso);
    } else {
      ensureDayAt(endIndex, "end");
      updateDay(endIndex, "end_date", utcIso);
      updateEvent("end_date", utcIso);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
        {/* Start date */}
        <FloatingDatePicker
          value={startDate}
          wpTz={allDay ? startAllDayTz : wpTz}
          onChange={(pickedDate) => {
            if (!pickedDate) {
              // Clicking the selected day deselects it.
              updateEvent("start_date", null);
              updateDay(startIndex, "start_date", null);
              return;
            }

            if (allDay) {
              const bounds = getAllDayBounds(pickedDate, startAllDayTz);

              if (!bounds) {
                return;
              }

              updateEvent(
                "event_days",
                applyAllDayBoundary(event.event_days, "start", bounds)
              );
              updateEvent("start_date", bounds.startIso);
              return;
            }

            const base = startDate
              ? DateTime.fromJSDate(startDate, { zone: wpTz })
              : DateTime.fromObject({ hour: 0, minute: 0 }, { zone: wpTz });

            const dtWall = pickedDate.set({
              hour: base.hour,
              minute: base.minute,
              second: 0,
              millisecond: 0,
            });

            updateContinuous("start", dtWall.toJSDate());

            const previousStart = startDate
              ? DateTime.fromJSDate(startDate, { zone: wpTz })
              : null;
            const previousEnd = endDate
              ? DateTime.fromJSDate(endDate, { zone: wpTz })
              : null;
            const newEnd = getEndAfterStartChange(
              previousStart,
              previousEnd,
              dtWall
            );

            updateContinuous("end", newEnd.toJSDate());
          }}
          disabled={tbc}
        />

        {/* Start time */}
        {!allDay && (
          <TimeInput
            date={startDate}
            commitOnValidChange
            setDate={(time) => {
              if (!time) return;
              // `time` is a UTC JS Date whose wpTz wall-clock hour/minute
              // is what the user picked. Apply that hour/minute onto the
              // start date's wpTz wall, NOT via JS Date.setHours which
              // would use the browser's local TZ and roll the date.
              const baseDt = startDate
                ? DateTime.fromJSDate(startDate, { zone: wpTz })
                : DateTime.now().setZone(wpTz).startOf("day");
              const timeDt = DateTime.fromJSDate(time, { zone: wpTz });
              const newStart = baseDt.set({
                hour: timeDt.hour,
                minute: timeDt.minute,
                second: 0,
                millisecond: 0,
              });
              updateContinuous("start", newStart.toJSDate());

              const previousStart = startDate
                ? DateTime.fromJSDate(startDate, { zone: wpTz })
                : null;
              const previousEnd = endDate
                ? DateTime.fromJSDate(endDate, { zone: wpTz })
                : null;
              const newEnd = getEndAfterStartChange(
                previousStart,
                previousEnd,
                newStart
              );

              updateContinuous("end", newEnd.toJSDate());
            }}
            wpTz={wpTz}
          />
        )}

        <MoveRight className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />

        {/* End date */}
        <FloatingDatePicker
          value={endDate}
          defaultMonth={startDate}
          wpTz={allDay ? endAllDayTz : wpTz}
          onChange={(pickedDate) => {
            if (!pickedDate) {
              // Clicking the selected day deselects it.
              updateEvent("end_date", null);
              updateDay(endIndex, "end_date", null);
              return;
            }

            if (allDay) {
              const bounds = getAllDayBounds(pickedDate, endAllDayTz);

              if (!bounds) {
                return;
              }

              updateEvent(
                "event_days",
                applyAllDayBoundary(event.event_days, "end", bounds)
              );
              updateEvent("end_date", bounds.endIso);
              return;
            }

            const base = endDate
              ? DateTime.fromJSDate(endDate, { zone: wpTz })
              : startDate
              ? DateTime.fromJSDate(startDate, { zone: wpTz })
              : DateTime.fromObject({ hour: 0, minute: 0 }, { zone: wpTz });

            const dtWall = pickedDate.set({
              hour: base.hour,
              minute: base.minute,
              second: 0,
              millisecond: 0,
            });

            updateContinuous("end", dtWall.toJSDate());
          }}
          disabled={tbc}
        />

        {/* End time */}
        {!allDay && (
          <TimeInput
            date={endDate}
            setDate={(time) => {
              if (!time) return;
              const baseDt = endDate
                ? DateTime.fromJSDate(endDate, { zone: wpTz })
                : startDate
                ? DateTime.fromJSDate(startDate, { zone: wpTz })
                : DateTime.now().setZone(wpTz).startOf("day");
              const timeDt = DateTime.fromJSDate(time, { zone: wpTz });
              const newEnd = baseDt.set({
                hour: timeDt.hour,
                minute: timeDt.minute,
                second: 0,
                millisecond: 0,
              });
              updateContinuous("end", newEnd.toJSDate());
            }}
            wpTz={wpTz}
          />
        )}

        <div className="flex items-center gap-2">
          <Switch
            aria-label={__("All day", "eventkoi-lite")}
            checked={allDay}
            onCheckedChange={setAllDay}
            disabled={tbc}
          />
          <span className="text-sm text-muted-foreground">
            {__("All day", "eventkoi-lite")}
          </span>
        </div>
    </div>
  );
}
