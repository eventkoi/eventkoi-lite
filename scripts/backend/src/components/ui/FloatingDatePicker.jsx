"use client";

import { Button } from "@/components/ui/button";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { cn } from "@/lib/utils";
import { DateTime } from "luxon";
import { useRef, useState } from "react";
import { useClickAway } from "react-use";

export function FloatingDatePicker({
  value,
  onChange,
  wpTz = "UTC",
  className,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useClickAway(ref, () => {
    if (open) setOpen(false);
  });

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        disabled={disabled}
        className={cn(
          !value && "text-muted-foreground font-normal",
          "w-[116px] justify-start",
          className
        )}
      >
        {value
          ? DateTime.fromJSDate(value, { zone: wpTz }).toFormat("d MMM yyyy")
          : "Set date"}
      </Button>

      {open && !disabled && (
        <div className="absolute z-50 mt-2 rounded-md border bg-background shadow-md">
          <CalendarPicker
            // Show the date in WP timezone
            value={
              value
                ? DateTime.fromJSDate(value, { zone: wpTz }).toJSDate()
                : null
            }
            onChange={(date) => {
              if (date) {
                setOpen(false);
                // Pass date back in WP timezone, not shifted to browser local
                const dtWall = DateTime.fromJSDate(date, {
                  zone: wpTz,
                }).toJSDate();
                onChange(dtWall);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
