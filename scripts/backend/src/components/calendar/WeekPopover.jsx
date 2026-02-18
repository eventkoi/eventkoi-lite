"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { WeekPicker } from "./WeekPicker";

export function WeekPopover({ calendarApi, currentDate, setCurrentDate }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="text-sm box-border text-foreground bg-background shadow-none rounded border-[1px] border-border border-solid px-3 py-1 pr-2 gap-2 h-10 justify-between hover:bg-muted cursor-pointer font-normal"
        >
          {calendarApi?.view?.title || ""}
          <ChevronDown className="h-4 w-4 min-w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={20}
        className="!z-[2147483647] w-auto rounded !border !bg-white !opacity-100 shadow-[0_0_4px_#bbb] text-sm overflow-hidden p-1"
      >
        <WeekPicker
          calendarApi={calendarApi}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
        />
      </PopoverContent>
    </Popover>
  );
}
