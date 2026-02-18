import { __, sprintf } from "@wordpress/i18n";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/useIsMobile";
import { formatTimezoneLabel, safeNormalizeTimeZone } from "@/lib/date-utils";
import { groupTimezones } from "@/lib/utils";
import { useState } from "react";

export function TimezonePicker({
  timezone,
  setTimezone,
  timeFormat,
  setTimeFormat,
}) {
  const [open, setOpen] = useState(false);
  const tzGroups = groupTimezones();
  const isMobile = useIsMobile();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls="timezone-listbox"
          aria-label={sprintf(
            /* translators: %s: current timezone label */
            __(
              "Current timezone: %s. Press Enter or Space to change.",
              "eventkoi"
            ),
            formatTimezoneLabel(timezone, timeFormat)
          )}
          className="inline-flex bg-transparent border-none cursor-pointer w-auto h-auto p-0 font-normal text-foreground underline"
        >
          {formatTimezoneLabel(timezone, timeFormat)}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={isMobile ? "start" : "end"}
        className="!z-[2147483647] p-0 w-[280px] !border border-border border-solid border-[1px] !bg-white !opacity-100"
      >
        <Command>
          {/* Tabs ABOVE the search input */}
          <div className="">
            <Tabs
              value={timeFormat}
              onValueChange={setTimeFormat}
              aria-label={__("Time format selection", "eventkoi")}
              className="w-full bg-muted"
            >
              <TabsList className="flex bg-muted px-2 gap-2 shadow-none rounded-none">
                <TabsTrigger
                  value="12"
                  className="rounded-sm bg-muted text-foreground hover:text-foreground flex-1 data-[state=active]:font-semibold shadow-none border-none cursor-pointer"
                >
                  {__("12hr (AM/PM)", "eventkoi")}
                </TabsTrigger>
                <TabsTrigger
                  value="24"
                  className="rounded-sm bg-muted text-foreground hover:text-foreground flex-1 data-[state=active]:font-semibold shadow-none border-none cursor-pointer"
                >
                  {__("24hr", "eventkoi")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CommandInput
            placeholder={__("Search timezone...", "eventkoi")}
            className="h-auto border-none focus:border-none focus:border-transparent focus:border-[0px] focus:shadow-none"
          />
          <CommandList
            id="timezone-listbox"
            role="listbox"
            aria-label={__("Select a timezone", "eventkoi")}
            className="max-h-[300px] overflow-y-auto border-t border-border border-t-[1px] border-solid border-b-0 border-l-0 border-r-0"
          >
            <CommandEmpty>{__("No timezone found.", "eventkoi")}</CommandEmpty>

            {Object.entries(tzGroups).map(([region, tzList], index, array) => (
              <div key={region}>
                <CommandGroup
                  heading={
                    <span className="py-1 text-sm font-medium text-foreground">
                      {region}
                    </span>
                  }
                >
                  {tzList.map((tz) => (
                    <CommandItem
                      key={tz.value}
                      role="option"
                      aria-selected={timezone === tz.value}
                      onSelect={() => {
                        const normalized = safeNormalizeTimeZone(tz.value);
                        setTimezone(normalized);

                        const params = new URLSearchParams(
                          window.location.search
                        );
                        params.set("tz", tz.value);
                        window.history.replaceState({}, "", `?${params}`);

                        setOpen(false);
                      }}
                      className="cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm"
                    >
                      {tz.label}
                    </CommandItem>
                  ))}
                </CommandGroup>

                {/* Only add separator if not last group */}
                {index < array.length - 1 && <CommandSeparator />}
              </div>
            ))}
          </CommandList>
        </Command>
        <span className="sr-only" aria-live="polite">
          {sprintf(
            /* translators: %s: selected timezone label */
            __("Selected timezone: %s", "eventkoi"),
            formatTimezoneLabel(timezone, timeFormat)
          )}
        </span>
      </PopoverContent>
    </Popover>
  );
}
