import { memo, useMemo } from "react";
import { MemoCalendar as Calendar } from "./memo-calendar";

/**
 * Stable Calendar wrapper to prevent broken arrow behavior
 * in Popover + Dialog contexts.
 */
export const CalendarPicker = memo(function CalendarPicker({
  value,
  onChange,
  className,
}) {
  const defaultMonth = useMemo(() => {
    return value instanceof Date && !isNaN(value) ? value : new Date();
  }, [value?.getFullYear(), value?.getMonth()]);

  const key = `${defaultMonth.getFullYear()}-${defaultMonth.getMonth()}`;

  return (
    <div key={key}>
      <Calendar
        mode="single"
        selected={value}
        onSelect={onChange}
        defaultMonth={defaultMonth}
        className={className}
      />
    </div>
  );
});
