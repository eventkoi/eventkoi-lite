"use client";

import { TimeInput } from "@/components/time-input";
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

  const startDate = event.start_date
    ? getDateInTimezone(ensureUtcZ(event.start_date), wpTz)
    : undefined;

  const endDate = event.end_date
    ? getDateInTimezone(ensureUtcZ(event.end_date), wpTz)
    : undefined;

  const ensureDayAt = (index) => {
    if (!len && index === 0) {
      const nowUtc = getUtcISOString(new Date().toISOString(), wpTz);
      updateDay(0, "start_date", nowUtc);
      updateDay(0, "end_date", nowUtc);
    }
  };

  const updateContinuous = (which, wallTimeJS) => {
    // Convert JS Date (wall time in wpTz) → UTC ISO before saving
    const utcIso = getUtcISOString(
      DateTime.fromJSDate(wallTimeJS, { zone: wpTz }).toISO(),
      wpTz
    );

    if (which === "start") {
      ensureDayAt(startIndex);
      updateDay(startIndex, "start_date", utcIso);
      updateEvent("start_date", utcIso);
    } else {
      ensureDayAt(endIndex);
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
          if (!pickedDate) return;
          const base = startDate
            ? DateTime.fromJSDate(startDate, { zone: wpTz })
            : DateTime.fromObject({ hour: 9, minute: 0 }, { zone: wpTz });

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
      <TimeInput
        date={startDate}
        setDate={(time) => {
          if (!time) return;
          const base = startDate || new Date();
          const newStart = new Date(base);
          newStart.setHours(time.getHours(), time.getMinutes(), 0, 0);
          updateContinuous("start", newStart);
        }}
        wpTz={wpTz} // ✅ pass timezone
      />

      <MoveRight className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />

      {/* End date */}
      <FloatingDatePicker
        value={endDate}
        wpTz={wpTz}
        onChange={(pickedDate) => {
          if (!pickedDate) return;
          const base = endDate
            ? DateTime.fromJSDate(endDate, { zone: wpTz })
            : startDate
            ? DateTime.fromJSDate(startDate, { zone: wpTz })
            : DateTime.fromObject({ hour: 17, minute: 0 }, { zone: wpTz });

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
      <TimeInput
        date={endDate}
        setDate={(time) => {
          if (!time) return;
          const base = endDate || startDate || new Date();
          const newEnd = new Date(base);
          newEnd.setHours(time.getHours(), time.getMinutes(), 0, 0);
          updateContinuous("end", newEnd);
        }}
        wpTz={wpTz} // ✅ pass timezone
      />
    </div>
  );
}
