import { useSettings } from "@/hooks/SettingsContext";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { memo, useMemo } from "react";
import { useNavigation } from "react-day-picker";
import { MemoCalendar as Calendar } from "./memo-calendar";

function CustomCaption({ displayMonth }) {
  const { goToMonth } = useNavigation(); // ✅ correct way in v8+
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center gap-1">
        {/* Jump prev year */}
        <button
          onClick={() => goToMonth(new Date(year - 1, month))}
          className="p-1 hover:bg-muted rounded"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* Prev month */}
        <button
          onClick={() => goToMonth(new Date(year, month - 1))}
          className="p-1 hover:bg-muted rounded"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Current month + year label */}
        <span className="font-medium w-32 text-center">
          {displayMonth.toLocaleString("default", { month: "long" })} {year}
        </span>

        {/* Next month */}
        <button
          onClick={() => goToMonth(new Date(year, month + 1))}
          className="p-1 hover:bg-muted rounded"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Jump next year */}
        <button
          onClick={() => goToMonth(new Date(year + 1, month))}
          className="p-1 hover:bg-muted rounded"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Stable Calendar wrapper to prevent broken arrow behavior
 * in Popover + Dialog contexts.
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
      />
    </div>
  );
});
