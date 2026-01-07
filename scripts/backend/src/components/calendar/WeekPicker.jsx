import { endOfWeek, setMonth, startOfWeek } from "date-fns";
import { useEffect, useState } from "react";
import { Calendar } from "../ui/calendar";

const dayLabels = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

function getWeekStartDayByName(data, value) {
  const entry = Object.entries(data).find(([_, v]) => v === value);
  return entry ? Number(entry[0]) : undefined;
}

export function WeekPicker({ calendarApi, currentDate, setCurrentDate }) {
  const { startday } = eventkoi_params;
  const weekStartsOn = getWeekStartDayByName(dayLabels, startday);

  const [selectedDate, setSelectedDate] = useState(
    currentDate ? new Date(currentDate) : new Date()
  );
  const [displayMonth, setDisplayMonth] = useState(
    currentDate ? new Date(currentDate) : new Date()
  );

  useEffect(() => {
    if (currentDate) {
      const parsed = new Date(currentDate);
      setSelectedDate(parsed);
      setDisplayMonth(parsed);
    }
  }, [currentDate]);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn });
  const selectedDays = { from: weekStart, to: weekEnd };

  const handleDateSelect = (date) => {
    if (!date) return;
    if (date.getTime() === selectedDate.getTime()) return;

    setSelectedDate(date);
    setDisplayMonth(date);

    if (calendarApi) {
      calendarApi.gotoDate(date);
    }
    if (setCurrentDate) {
      setCurrentDate(date);
    }
  };

  const handleMonthChange = (newMonth) => {
    // Detect next / previous
    const isNext = newMonth > displayMonth;
    const isPrev = newMonth < displayMonth;

    // Keep same day number if possible
    const newSelected = setMonth(selectedDate, newMonth.getMonth());

    // Update both month & selected date
    setDisplayMonth(newMonth);
    setSelectedDate(newSelected);

    if (calendarApi) {
      calendarApi.gotoDate(newSelected);
    }
    if (setCurrentDate) {
      setCurrentDate(newSelected);
    }
  };

  return (
    <Calendar
      mode="single"
      selected={selectedDays}
      month={displayMonth}
      weekStartsOn={weekStartsOn}
      onSelect={handleDateSelect}
      onMonthChange={handleMonthChange}
      classNames={{
        day_range_end: "",
        day_range_middle: "",
        day_today: "",
        day_outside: "text-muted-foreground",
        day_disabled: "",
        row: "flex w-full mt-2 justify-between [&>*]:flex-1 [&>td:first-child>button]:rounded-l-md [&>td:last-child>button]:rounded-r-md",
        head_cell:
          "text-muted-foreground w-9 font-bold text-sm transition-colors",
        day_selected: "!bg-accent !text-black",
        cell: "h-9 w-9 p-0",
        day: "h-9 w-full border-0 [&:not([aria-selected='true'])]:bg-white hover:[&:not([aria-selected='true'])]:bg-accent [&:not([aria-selected='true'])]:rounded-md transition-colors",
        button: "cursor-pointer",
        nav_button:
          "bg-white border-0 h-8 w-10 hover:bg-accent rounded-md transition-colors",
        nav_icon: "w-2.5 h-2.5",
      }}
    />
  );
}
