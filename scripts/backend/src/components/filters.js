import { useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DateWithRange } from "@/components/date-range";
import { SearchBox } from "@/components/search-box";
import { ListFilter } from "lucide-react";

const statuses = {
  live: "Live",
  upcoming: "Upcoming",
  completed: "Completed",
  tbc: "Date not set",
};

const calendars = eventkoi_params.calendars;

export function Filters({
  base,
  table,
  hideDateRange,
  hideCategories,
  filterName,
  queryStatus,
  eventStatus,
  calStatus,
  from,
  to,
  statusFilters,
  hideSearchBox = false,
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeStatus = eventStatus?.split(",").filter(Boolean) || [];
  const activeCal = calStatus?.split(",").filter(Boolean) || [];

  const getUpdatedParams = (newStatusList) => {
    const params = {};

    if (queryStatus) params.status = queryStatus;
    if (newStatusList.length > 0) params.event_status = newStatusList.join(",");
    if (calStatus) params.calendar = calStatus;
    if (from) params.from = from;
    if (to) params.to = to;

    return params;
  };

  return (
    <>
      {statusFilters && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex font-normal w-full sm:w-auto justify-start sm:justify-center"
            >
              <ListFilter className="mr-2 h-4 w-4" />
              Status
              {activeStatus.length > 0 && <> ({activeStatus.length})</>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            <DropdownMenuCheckboxItem
              onClick={() => {
                const all = Object.keys(statuses);
                const params = {
                  ...Object.fromEntries(searchParams.entries()),
                  event_status: all.join(","),
                };
                setSearchParams(params);
              }}
            >
              Select all
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              onClick={() => {
                const params = {
                  ...Object.fromEntries(searchParams.entries()),
                };
                delete params.event_status;
                setSearchParams(params);
              }}
            >
              Clear selected
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {Object.keys(statuses).map((status) => {
              const isActive = activeStatus.includes(status);

              return (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={isActive}
                  onCheckedChange={() => {
                    const current = activeStatus.slice(); // clone
                    const next = isActive
                      ? current.filter((s) => s !== status)
                      : [...current, status];

                    const params = {
                      ...Object.fromEntries(searchParams.entries()),
                    };

                    if (next.length > 0) {
                      params.event_status = next.join(",");
                    } else {
                      delete params.event_status;
                    }

                    setSearchParams(params);
                  }}
                >
                  {statuses[status]}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {base === "events" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex font-normal w-full sm:w-auto justify-start sm:justify-center"
            >
              <ListFilter className="mr-2 h-4 w-4" />
              Calendar
              {activeCal.length > 0 && <> ({activeCal.length})</>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            <DropdownMenuCheckboxItem
              onClick={() => {
                const all = calendars.map((c) => c.id.toString());
                const params = {
                  ...Object.fromEntries(searchParams.entries()),
                  calendar: all.join(","),
                };
                setSearchParams(params);
              }}
            >
              Select all
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              onClick={() => {
                const params = {
                  ...Object.fromEntries(searchParams.entries()),
                };
                delete params.calendar;
                setSearchParams(params);
              }}
            >
              Clear selected
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {calendars.map((calendar) => {
              const isActive = activeCal.includes(calendar.id.toString());

              return (
                <DropdownMenuCheckboxItem
                  key={calendar.id}
                  checked={isActive}
                  onCheckedChange={() => {
                    const current = activeCal.slice(); // clone
                    const next = isActive
                      ? current.filter((c) => c !== calendar.id.toString())
                      : [...current, calendar.id.toString()];

                    const params = {
                      ...Object.fromEntries(searchParams.entries()),
                    };

                    if (next.length > 0) {
                      params.calendar = next.join(",");
                    } else {
                      delete params.calendar;
                    }

                    setSearchParams(params);
                  }}
                >
                  {calendar.name}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {!hideCategories && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex font-normal w-full sm:w-auto justify-start sm:justify-center"
            >
              <ListFilter className="mr-2 h-4 w-4" />
              {filterName}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]" />
        </DropdownMenu>
      )}

      {!hideDateRange && <DateWithRange />}
      {!hideSearchBox && <SearchBox table={table} />}
    </>
  );
}
