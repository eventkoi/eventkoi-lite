import { useSettings } from "@/hooks/SettingsContext";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { DateTime } from "luxon";
import { memo, useMemo } from "react";
import { useNavigation } from "react-day-picker";
import { MemoCalendar as Calendar } from "./memo-calendar";

/**
 * Locale-aware caption using Luxon (no date-fns)
 */
function CustomCaption({ displayMonth }) {
  const { goToMonth } = useNavigation();
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();

  // Normalize WP locale (e.g., de_DE → de-DE)
  const normalizeLocale = (loc) => {
    if (!loc) return "en";
    return loc.replace("_", "-");
  };

  const wpLocale =
    typeof eventkoi_params !== "undefined" && eventkoi_params.locale
      ? normalizeLocale(eventkoi_params.locale)
      : "en";

  // Localized month name using Luxon
  const monthLabel = DateTime.fromJSDate(displayMonth)
    .setLocale(wpLocale)
    .toFormat("LLLL");

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center gap-1">
        {/* Jump prev year */}
        <button
          onClick={() => goToMonth(new Date(year - 1, month))}
          className="p-1 hover:bg-muted rounded"
          aria-label="Previous year"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* Prev month */}
        <button
          onClick={() => goToMonth(new Date(year, month - 1))}
          className="p-1 hover:bg-muted rounded"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Localized month + year */}
        <span className="font-medium w-32 text-center capitalize">
          {monthLabel} {year}
        </span>

        {/* Next month */}
        <button
          onClick={() => goToMonth(new Date(year, month + 1))}
          className="p-1 hover:bg-muted rounded"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Jump next year */}
        <button
          onClick={() => goToMonth(new Date(year + 1, month))}
          className="p-1 hover:bg-muted rounded"
          aria-label="Next year"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Locale-aware CalendarPicker (Luxon only, automatic WordPress locale)
 */
export const CalendarPicker = memo(function CalendarPicker({
  value,
  onChange,
  className,
}) {
  const { settings } = useSettings();

  const defaultMonth = useMemo(() => {
    return value instanceof Date && !isNaN(value) ? value : new Date();
  }, [value?.getFullYear(), value?.getMonth()]);

  const key = `${defaultMonth.getFullYear()}-${defaultMonth.getMonth()}`;

  // Map WP setting to react-day-picker week start (0=Sunday)
  const mapWeekStart = (stored) => {
    if (stored === undefined || stored === null || stored === "") {
      stored = 0;
    }
    const n = Number(stored);
    if (n === 6) return 0;
    if (n >= 0 && n <= 5) return n + 1;
    return 1;
  };

  const weekStartsOn = mapWeekStart(settings?.week_starts_on);

  // Normalize WP locale (de_DE → de-DE)
  const normalizeLocale = (loc) => {
    if (!loc) return "en";
    return loc.replace("_", "-");
  };

  const wpLocale =
    typeof eventkoi_params !== "undefined" && eventkoi_params.locale
      ? normalizeLocale(eventkoi_params.locale)
      : "en";

  // Generate localized weekday labels using Luxon
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    DateTime.now()
      .setLocale(wpLocale)
      .set({ weekday: i + 1 })
      .toFormat("ccc")
  );

  return (
    <div key={key}>
      <Calendar
        mode="single"
        selected={value}
        onSelect={onChange}
        defaultMonth={defaultMonth}
        weekStartsOn={weekStartsOn}
        className={className}
        components={{
          Caption: CustomCaption,
        }}
        formatters={{
          formatWeekdayName: (day) => weekdays[day],
        }}
      />
    </div>
  );
});
