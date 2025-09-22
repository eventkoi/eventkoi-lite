import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { DateTime } from "luxon";

export function SearchBox({
  inputRef,
  search,
  setSearch,
  open,
  setOpen,
  filteredResults,
  paginatedResults,
  totalPages,
  page,
  setPage,
  timezone,
  timeFormat,
  setSearchOpen,
}) {
  return (
    <div className="relative w-full lg:min-w-[350px]">
      <Input
        ref={inputRef}
        placeholder="Search events…"
        value={search}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => {
            setOpen(false);
            setSearchOpen?.(false);
          }, 150);
        }}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-9 h-10 w-full shadow-none border border-solid box-border rounded"
        autoComplete="off"
      />
      <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground pointer-events-none">
        <Search className="w-4 h-4" />
      </span>

      {open && search && (
        <Command
          className={cn(
            "absolute z-50 left-0 top-12 w-full rounded-md border bg-popover text-popover-foreground shadow-md border-border border-solid",
            "max-h-[400px] h-auto"
          )}
        >
          <CommandList className="p-2 max-h-[400px] overflow-y-auto">
            {filteredResults.length === 0 ? (
              <CommandEmpty className="p-4 text-muted-foreground text-sm">
                No events found.
              </CommandEmpty>
            ) : (
              <>
                {paginatedResults.map((event) => (
                  <CommandItem
                    key={event.id}
                    value={event.title}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      window.open(event.url, "_blank", "noopener,noreferrer");
                      setOpen(false);
                      setSearchOpen?.(false);
                    }}
                    className="grid gap-1 p-2 cursor-pointer text-sm text-foreground rounded-md hover:!bg-accent"
                  >
                    <span className="font-normal block">
                      {DateTime.fromISO(event.start_date || event.start, {
                        zone: "utc",
                      })
                        .setZone(timezone)
                        .toFormat(
                          timeFormat === "24"
                            ? "d MMM yyyy, EEE • HH:mm"
                            : "d MMM yyyy, EEE • h:mma"
                        )
                        .replace("AM", "am")
                        .replace("PM", "pm")}
                    </span>
                    <span className="font-medium">{event.title}</span>
                  </CommandItem>
                ))}

                {totalPages > 1 && (
                  <div className="flex justify-between items-center px-2 pt-2 text-xs text-muted-foreground">
                    {/* Prev */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.max(0, p - 1));
                      }}
                      disabled={page === 0}
                      className="cursor-pointer box-border border-none text-foreground bg-transparent shadow-none"
                    >
                      Prev
                    </Button>
                    <span>
                      Page {page + 1} of {totalPages}
                    </span>
                    {/* Next */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.min(totalPages - 1, p + 1));
                      }}
                      disabled={page >= totalPages - 1}
                      className="cursor-pointer box-border border-none text-foreground bg-transparent shadow-none"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      )}
    </div>
  );
}
