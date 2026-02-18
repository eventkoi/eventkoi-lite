/**
 * SearchBox (i18n-ready)
 *
 * @package EventKoi
 */

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { __, sprintf } from "@wordpress/i18n";
import { Loader2, Search } from "lucide-react";
import { DateTime } from "luxon";

export function SearchBox({
  inputRef,
  search,
  setSearch,
  open,
  setOpen,
  events,
  filteredResults,
  paginatedResults,
  totalPages,
  page,
  setPage,
  timezone,
  timeFormat,
  setSearchOpen,
}) {
  const isLoading = events === undefined || events === null;
  const isEmpty = !isLoading && events.length === 0;

  return (
    <div
      className="relative w-full min-w-0 lg:w-[350px] lg:max-w-full"
      aria-busy={isLoading}
      aria-live="polite"
    >
      {/* Hidden accessible label */}
      <label htmlFor="event-search" className="sr-only">
        {__("Search events", "eventkoi")}
      </label>

      <Input
        id="event-search"
        ref={inputRef}
        type="search"
        placeholder={__("Search events…", "eventkoi")}
        aria-label={__("Search events", "eventkoi")}
        role="combobox"
        aria-expanded={open}
        aria-controls="event-search-listbox"
        aria-autocomplete="list"
        value={search}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          const related = e.relatedTarget;
          const isStillInsidePopover =
            related && e.currentTarget.parentNode?.contains(related);

          if (isStillInsidePopover) return;

          setTimeout(() => {
            setOpen(false);
            setSearchOpen?.(false);
          }, 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setSearchOpen?.(false);
            e.currentTarget.blur();
          }
        }}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-9 h-10 w-full min-w-0 shadow-none border border-solid box-border rounded disabled:bg-background"
        autoComplete="off"
        disabled={isLoading || isEmpty}
      />

      {/* Icon */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-3 flex items-center text-muted-foreground pointer-events-none"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </span>

      {/* Live region for loading/empty states */}
      <div className="sr-only" role="status">
        {isLoading
          ? __("Loading events...", "eventkoi")
          : isEmpty
          ? __("No events found.", "eventkoi")
          : sprintf(
              /* translators: %d: number of events found */
              __("%d events found.", "eventkoi"),
              filteredResults.length
            )}
      </div>

      {open && search && (
        <Command
          className={cn(
            "absolute z-50 left-0 top-12 w-full rounded-md border bg-popover text-popover-foreground shadow-md border-border border-solid",
            "max-h-[400px] h-auto"
          )}
        >
          <CommandList
            id="event-search-listbox"
            role="listbox"
            className="p-2 max-h-[400px] overflow-y-auto"
          >
            {filteredResults.length === 0 ? (
              <CommandEmpty className="p-4 text-muted-foreground text-sm">
                {__("No events found.", "eventkoi")}
              </CommandEmpty>
            ) : (
              <>
                {paginatedResults.map((event) => {
                  const formatted = DateTime.fromISO(
                    event.start_date || event.start,
                    { zone: "utc" }
                  )
                    .setZone(timezone)
                    .toFormat(
                      timeFormat === "24"
                        ? "d MMM yyyy, EEE • HH:mm"
                        : "d MMM yyyy, EEE • h:mma"
                    )
                    .replace("AM", "am")
                    .replace("PM", "pm");

                  return (
                    <CommandItem
                      key={event.id}
                      role="option"
                      aria-selected="false"
                      value={event.title}
                      onClick={() => {
                        window.open(event.url, "_blank", "noopener,noreferrer");
                        setOpen(false);
                        setSearchOpen?.(false);
                      }}
                      className="grid gap-1 p-2 cursor-pointer text-sm text-foreground rounded-md hover:!bg-accent"
                    >
                      <span className="font-normal block">{formatted}</span>
                      <span className="font-medium">{event.title}</span>
                      {/* Hidden full date for screen readers */}
                      <span className="sr-only">
                        {DateTime.fromISO(event.start_date || event.start, {
                          zone: timezone,
                        }).toLocaleString(DateTime.DATETIME_FULL)}
                      </span>
                    </CommandItem>
                  );
                })}

                {totalPages > 1 && (
                  <div className="flex justify-between items-center px-2 pt-2 text-xs text-muted-foreground">
                    {/* Prev */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      aria-label={__("Previous page", "eventkoi")}
                      aria-disabled={page === 0}
                      className="cursor-pointer box-border border-none text-foreground bg-transparent shadow-none"
                    >
                      {__("Prev", "eventkoi")}
                    </Button>

                    <span aria-live="polite">
                      {sprintf(
                        __("Page %1$d of %2$d", "eventkoi"),
                        page + 1,
                        totalPages
                      )}
                    </span>

                    {/* Next */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={page >= totalPages - 1}
                      aria-label={__("Next page", "eventkoi")}
                      aria-disabled={page >= totalPages - 1}
                      className="cursor-pointer box-border border-none text-foreground bg-transparent shadow-none"
                    >
                      {__("Next", "eventkoi")}
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
