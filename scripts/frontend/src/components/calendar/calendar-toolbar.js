// components/calendar/calendar-toolbar.jsx

import { CalendarHeaderPopover } from "@/components/calendar/CalendarHeaderPopover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useRef, useState } from "react";

export function CalendarToolbar({
  calendarApi,
  currentDate,
  setCurrentDate,
  view,
  setView,
  search,
  setSearch,
  events,
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const filteredResults = search
    ? events.filter((event) => {
        const q = search.toLowerCase();
        return (
          event.title?.toLowerCase().includes(q) ||
          event.description?.toLowerCase().includes(q) ||
          event.location?.toLowerCase().includes(q)
        );
      })
    : [];

  const handleToday = () => {
    if (!calendarApi) return;
    calendarApi.today();
    setCurrentDate(calendarApi.getDate());
  };

  const isTodayInRange = (() => {
    if (!calendarApi) return false;

    const start = calendarApi.view?.currentStart;
    const end = calendarApi.view?.currentEnd;
    const today = new Date();

    return start <= today && today <= end;
  })();

  return (
    <div className="flex flex-wrap items-center justify-between text-sm gap-3">
      {/* Left section: prev / next / month dropdown / today */}
      <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-auto">
        {/* Buttons and popover: stack vertically on mobile, row on desktop */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-solid shadow-sm cursor-pointer shrink-0 rounded"
            size="icon"
            onClick={() => calendarApi?.prev()}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            className="border-solid shadow-sm cursor-pointer shrink-0 rounded"
            size="icon"
            onClick={() => calendarApi?.next()}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <CalendarHeaderPopover
            calendarApi={calendarApi}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
          <Button
            variant="outline"
            className="border-solid shadow-sm cursor-pointer rounded"
            disabled={isTodayInRange}
            onClick={handleToday}
          >
            Today
          </Button>
        </div>

        {/* Search input: always full width on mobile, max-w on desktop */}
        <div className="relative w-full lg:min-w-[300px]">
          <Input
            ref={inputRef}
            placeholder="Search events…"
            value={search}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 min-w-24 w-full shadow-sm border border-solid box-border rounded"
            autoComplete="off"
          />
          <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground pointer-events-none">
            <Search className="w-4 h-4" />
          </span>

          {/* Desktop dropdown */}
          {open && search && (
            <Command className="absolute z-50 w-full md:w-full lg:w-[600px] h-auto top-12 left-0 bg-background rounded shadow-md border border-solid border-border">
              <CommandList className="max-h-[400px] p-2 overflow-y-auto">
                {filteredResults.length === 0 ? (
                  <CommandEmpty className="p-4 text-muted-foreground text-sm">
                    No events found
                  </CommandEmpty>
                ) : (
                  filteredResults.slice(0, 10).map((event) => (
                    <CommandItem
                      key={event.id}
                      value={event.title}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        window.open(event.url, "_blank", "noopener,noreferrer");
                        setOpen(false);
                      }}
                      className="grid grid-cols-[180px_1fr] gap-2 p-2 cursor-pointer text-sm text-foreground rounded-md hover:!bg-accent"
                    >
                      <span className="font-normal truncate">
                        {format(
                          new Date(event.start_date || event.start),
                          "d MMM yyyy, eee • h:mm a"
                        )
                          .replace(/\s([AP]M)$/, "$1")
                          .replace("AM", "am")
                          .replace("PM", "pm")}
                      </span>
                      <span className="font-medium truncate">
                        {event.title}
                      </span>
                    </CommandItem>
                  ))
                )}
              </CommandList>
            </Command>
          )}
        </div>
      </div>

      {/* Right section: view switch */}
      <div className="shrink-0">
        <ToggleGroup
          type="single"
          className="gap-0.5 border border-solid border-border px-[2px] py-0.5 h-10 box-border rounded shadow-sm"
          value={view}
          onValueChange={(val) => {
            if (!val) return;
            calendarApi?.changeView(val);
            setView(val);
          }}
        >
          <ToggleGroupItem
            value="dayGridMonth"
            className="border-none cursor-pointer h-full rounded"
          >
            Month
          </ToggleGroupItem>
          <ToggleGroupItem
            value="timeGridWeek"
            className="border-none cursor-pointer h-full rounded"
          >
            Week
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
