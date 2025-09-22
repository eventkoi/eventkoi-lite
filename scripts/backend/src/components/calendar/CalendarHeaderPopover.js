"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DateTime } from "luxon";
import { useState } from "react";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function CalendarHeaderPopover({
  calendarApi,
  currentDate,
  setCurrentDate,
}) {
  const [open, setOpen] = useState(false);

  const tz = calendarApi?.view?.calendar?.getOption("timeZone") || "UTC";

  // Normalize currentDate safely
  let jsDate =
    currentDate instanceof Date ? currentDate : new Date(currentDate);
  if (isNaN(jsDate)) {
    jsDate = new Date(); // fallback to today
  }

  const dt = DateTime.fromJSDate(jsDate, { zone: tz });
  const yearView = dt.year;
  const selectedMonth = dt.month - 1;

  const gotoMonth = (targetMonth) => {
    const newDt = DateTime.fromObject(
      { year: yearView, month: targetMonth + 1, day: 1 },
      { zone: tz }
    );
    const jsDate = newDt.toJSDate();
    calendarApi.gotoDate(jsDate);
    setCurrentDate(jsDate);
    setOpen(false);
  };

  const gotoPrevYear = () => {
    const newDt = dt.minus({ years: 1 }).startOf("month");
    const jsDate = newDt.toJSDate();
    calendarApi.gotoDate(jsDate);
    setCurrentDate(jsDate);
  };

  const gotoNextYear = () => {
    const newDt = dt.plus({ years: 1 }).startOf("month");
    const jsDate = newDt.toJSDate();
    calendarApi.gotoDate(jsDate);
    setCurrentDate(jsDate);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="text-sm box-border text-foreground bg-background shadow-none rounded border-[1px] border-border border-solid px-3 py-1 pr-2 gap-2 h-10 justify-between hover:bg-muted cursor-pointer font-normal"
        >
          {`${MONTHS[selectedMonth]} ${yearView}`}
          <ChevronDown className="h-4 w-4 min-w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={20}
        className="w-[240px] rounded border bg-white shadow-[0_0_4px_#bbb] text-sm overflow-hidden"
      >
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={gotoPrevYear}
            className="bg-transparent p-0 text-[1px] text-foreground border-none shadow-none cursor-pointer hover:bg-muted h-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-sm font-medium">{yearView}</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={gotoNextYear}
            className="bg-transparent p-0 text-[1px] text-foreground border-none shadow-none cursor-pointer hover:bg-muted h-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {MONTHS.map((label, i) => (
            <Button
              key={label}
              variant="ghost"
              className={cn(
                "text-sm font-medium bg-transparent text-foreground border-none shadow-none cursor-pointer hover:bg-muted",
                i === selectedMonth && "bg-muted text-foreground font-semibold"
              )}
              onClick={() => gotoMonth(i)}
            >
              {label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
