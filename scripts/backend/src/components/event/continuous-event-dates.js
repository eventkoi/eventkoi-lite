"use client";

import { __ } from "@wordpress/i18n";
import { TimeInput } from "@/components/time-input";
import { Switch } from "@/components/ui/switch";
import { FloatingDatePicker } from "@/components/ui/FloatingDatePicker";
import {
  ensureUtcZ,
  getDateInTimezone,
  getUtcISOString,
} from "@/lib/date-utils";
import { MoveRight } from "lucide-react";
import { DateTime } from "luxon";

export function ContinuousEventDates({ event, updateDay, updateEvent, tbc }) {
  const wpTz = event?.timezone || "UTC";

  const len = Array.isArray(event.event_days) ? event.event_days.length : 0;
  const startIndex = 0;
  const endIndex = Math.max(0, len - 1);

  const allDay = !!event?.event_days?.[0]?.all_day;

  const startDate = event.start_date
    ? getDateInTimezone(ensureUtcZ(event.start_date), wpTz)
    : undefined;

  const endDate = event.end_date
    ? getDateInTimezone(ensureUtcZ(event.end_date), wpTz)
    : undefined;

  const setAllDay = (value) => {
    // Compute normalized ISO dates when turning all-day ON
    let newStartIso = event.start_date;
    let newEndIso = event.end_date;

    if (value) {
      if (startDate) {
        const s = DateTime.fromJSDate(startDate, { zone: wpTz }).set({
          hour: 0,
          minute: 0,
          second: 0,
          millisecond: 0,
        });
        newStartIso = getUtcISOString(s.toISO(), wpTz);
      }
      if (endDate) {
        const e = DateTime.fromJSDate(endDate, { zone: wpTz }).set({
          hour: 23,
          minute: 59,
          second: 59,
          millisecond: 999,
        });
        newEndIso = getUtcISOString(e.toISO(), wpTz);
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
      if (value && idx === 0) next.start_date = newStartIso;
      if (value && idx === lastIdx) next.end_date = newEndIso;
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
          wpTz={wpTz}
          onChange={(pickedDate) => {
            if (!pickedDate) {
              // Clicking the selected day deselects it.
              updateEvent("start_date", null);
              updateDay(startIndex, "start_date", null);
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
          }}
          disabled={tbc}
        />

        {/* Start time */}
        {!allDay && (
          <TimeInput
            date={startDate}
            setDate={(time) => {
              if (!time) return;
              const base = startDate || new Date();
              const newStart = new Date(base);
              newStart.setHours(time.getHours(), time.getMinutes(), 0, 0);
              updateContinuous("start", newStart);
            }}
            wpTz={wpTz}
          />
        )}

        <MoveRight className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />

        {/* End date */}
        <FloatingDatePicker
          value={endDate}
          wpTz={wpTz}
          onChange={(pickedDate) => {
            if (!pickedDate) {
              // Clicking the selected day deselects it.
              updateEvent("end_date", null);
              updateDay(endIndex, "end_date", null);
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
              const base = endDate || startDate || new Date();
              const newEnd = new Date(base);
              newEnd.setHours(time.getHours(), time.getMinutes(), 0, 0);
              updateContinuous("end", newEnd);
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
