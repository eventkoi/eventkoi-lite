"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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

  const yearView = currentDate.getFullYear();
  const selectedMonth = currentDate.getMonth();

  const gotoMonth = (targetMonth) => {
    const newDate = new Date(currentDate); // Clone
    newDate.setUTCFullYear(yearView);
    newDate.setUTCMonth(targetMonth);
    newDate.setUTCDate(1);
    calendarApi.gotoDate(newDate);
    setCurrentDate(newDate);
    setOpen(false);
  };

  const gotoPrevYear = () => {
    const newDate = new Date(currentDate);
    newDate.setUTCFullYear(yearView - 1);
    calendarApi.gotoDate(newDate);
    setCurrentDate(newDate);
  };

  const gotoNextYear = () => {
    const newDate = new Date(currentDate);
    newDate.setUTCFullYear(yearView + 1);
    calendarApi.gotoDate(newDate);
    setCurrentDate(newDate);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="text-sm shadow-sm rounded border-[1px] border-border border-solid px-3 py-1 pr-2 gap-2 h-10 bg-transparent justify-between hover:bg-muted cursor-pointer font-normal"
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
            className="bg-transparent border-none shadow-none cursor-pointer hover:bg-muted h-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-sm font-medium">{yearView}</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={gotoNextYear}
            className="bg-transparent border-none shadow-none cursor-pointer hover:bg-muted h-8"
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
                "text-sm font-medium bg-transparent border-none shadow-none cursor-pointer hover:bg-muted",
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
