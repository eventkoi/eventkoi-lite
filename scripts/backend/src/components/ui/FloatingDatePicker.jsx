"use client";

import { Button } from "@/components/ui/button";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { useSettings } from "@/hooks/SettingsContext";
import { wpToLuxonFormat } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { __ } from "@wordpress/i18n";
import { DateTime } from "luxon";
import { useRef, useState } from "react";
import { useClickAway } from "react-use";

export function FloatingDatePicker({
  value,
  onChange,
  wpTz = "UTC",
  className,
  disabled = false,
  defaultMonth,
}) {
  const [open, setOpen] = useState(false);
  const { settings } = useSettings();
  const ref = useRef(null);

  useClickAway(ref, () => {
    if (open) setOpen(false);
  });

  // Normalize WP locale (e.g. de_DE → de-DE)
  const normalizeLocale = (loc) => {
    if (!loc) return "en";
    return loc.replace("_", "-");
  };

  const wpLocale =
    typeof eventkoi_params !== "undefined" && eventkoi_params.locale
      ? normalizeLocale(eventkoi_params.locale)
      : "en";
  const dateFormat = wpToLuxonFormat(
    settings?.date_format ||
      (typeof eventkoi_params !== "undefined" && eventkoi_params.date_format
        ? eventkoi_params.date_format
        : "F j, Y")
  );

  const pickerValue = value
    ? (() => {
        const wallDate = DateTime.fromJSDate(value, { zone: wpTz });
        if (!wallDate.isValid) {
          return null;
        }

        return new Date(wallDate.year, wallDate.month - 1, wallDate.day);
      })()
    : null;

  const fallbackMonth = defaultMonth
    ? (() => {
        const wallDate = DateTime.fromJSDate(defaultMonth, { zone: wpTz });
        if (!wallDate.isValid) return null;
        return new Date(wallDate.year, wallDate.month - 1, wallDate.day);
      })()
    : null;

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
          "min-w-[116px] w-auto justify-start",
          className
        )}
      >
        {value
          ? // Localized formatted value using Luxon locale
            DateTime.fromJSDate(value, { zone: wpTz })
              .setLocale(wpLocale)
              .toFormat(dateFormat)
          : __("Set date", "eventkoi-lite")}
      </Button>

      {open && !disabled && (
        <div className="absolute z-50 mt-2 rounded-md border bg-background shadow-md">
          <CalendarPicker
            value={pickerValue}
            fallbackMonth={fallbackMonth}
            onChange={(date) => {
              setOpen(false);

              if (!date) {
                // react-day-picker single mode fires onSelect(undefined)
                // when the user clicks the already-selected day.
                onChange(null);
                return;
              }

              // Build the wall date manually from Y/M/D parts
              const dtWall = DateTime.fromObject(
                {
                  year: date.getFullYear(),
                  month: date.getMonth() + 1,
                  day: date.getDate(),
                },
                { zone: wpTz }
              );

              onChange(dtWall); // Pass Luxon DateTime in WP timezone
            }}
          />
        </div>
      )}
    </div>
  );
}
