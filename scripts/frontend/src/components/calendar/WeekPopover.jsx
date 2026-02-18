"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { __ } from "@wordpress/i18n";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { WeekPicker } from "./WeekPicker";

export function WeekPopover({ calendarApi, currentDate, setCurrentDate }) {
  const [open, setOpen] = useState(false);

  // Derived title for screen readers
  const title = calendarApi?.view?.title || "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="eventkoi-week-picker"
          aria-label={
            open
              ? __("Close week picker", "eventkoi")
              : __("Open week picker", "eventkoi")
          }
          className="text-sm box-border text-foreground bg-background shadow-none rounded border-[1px] border-border border-solid px-3 py-1 pr-2 gap-2 h-10 justify-between hover:bg-muted cursor-pointer font-normal"
        >
          {/* translators: The current week or month title in the calendar header */}
          {title || __("Select week", "eventkoi")}
          <ChevronDown
            className="h-4 w-4 min-w-4"
            aria-hidden="true"
            focusable="false"
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        id="eventkoi-week-picker"
        role="dialog"
        aria-label={__("Week picker", "eventkoi")}
        aria-modal="false"
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
