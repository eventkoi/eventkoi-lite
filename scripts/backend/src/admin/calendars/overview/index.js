import { NewTabNote } from "@/components/new-tab-note";
import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { AddButton } from "@/components/add-button";
import { ProLaunch } from "@/components/dashboard/pro-launch";
import { DataTable } from "@/components/data-table";
import { Heading } from "@/components/heading";
import { SortButton } from "@/components/sort-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { tourHandleCalendarLink } from "@/tour/store";

import { CheckCheck, Copy, Link2 } from "lucide-react";

const multiColumnSearch = (row, columnId, filterValue) => {
  const searchableRowContent = `${row.original.name} ${row.original.slug}`;
  return searchableRowContent.toLowerCase().includes(filterValue.toLowerCase());
};

function CalendarNameCell({ row }) {
  const isDefaultCal =
    parseInt(row.original.id) === parseInt(eventkoi_params.default_cal);
  const url = `#/calendars/${row.original.id}/main`;
  const color = row.original.color;
  const isTransparent = !color || color === "transparent";
  const dotStyle = isTransparent
    ? {
        backgroundImage:
          "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
        backgroundSize: "6px 6px",
        backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0",
      }
    : { backgroundColor: color };

  return (
    <div className="grid space-y-1">
      <div className="flex gap-2 items-start text-foreground">
        <span className="inline">
          <span
            aria-hidden="true"
            style={dotStyle}
            className="inline-block w-3 h-3 rounded-full shrink-0 mr-2 align-middle relative -top-0.5"
          />
          <a
            href={url}
            className="inline font-medium hover:underline hover:decoration-dotted underline-offset-4"
          >
            {row.getValue("name")}
          </a>
          <CalendarLinkIcon
            url={row.original.url}
            isDefaultCal={isDefaultCal}
            calendarId={row.original.id}
          />
        </span>
        {isDefaultCal && (
          <Badge variant="outline" className="font-normal">
            Default
          </Badge>
        )}
      </div>
    </div>
  );
}

function ShortcodeCell({ row }) {
  const value = row.getValue("shortcode");
  const [copied, setCopied] = useState(false);
  const [tooltipKey, setTooltipKey] = useState(0);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTooltipKey((k) => k + 1);
    setTimeout(() => {
      setCopied(false);
      setTooltipKey((k) => k + 1);
    }, 1500);
  };

  return (
    <div className="relative text-foreground w-full max-w-[220px]">
      <Input
        type="text"
        aria-label={__("Shortcode", "eventkoi-lite")}
        value={value}
        readOnly
        className="w-full pr-10"
      />
      <TooltipProvider delayDuration={0}>
        <Tooltip key={tooltipKey}>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="absolute h-8 right-[5px] top-[4px] border-none cursor-pointer hover:bg-input"
              onClick={handleCopy}
              aria-label={__("Copy shortcode", "eventkoi-lite")}
            >
              {copied ? (
                <CheckCheck className="h-4 w-4 transition-all duration-200" />
              ) : (
                <Copy className="h-4 w-4 transition-all duration-200" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent
            className="bg-zinc-900 text-white px-3 py-1.5 text-sm rounded-md shadow-lg"
            side="top"
            sideOffset={8}
          >
            {copied ? __("Copied!", "eventkoi-lite") : __("Copy shortcode", "eventkoi-lite")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

const columns = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortButton title={__("Calendar name", "eventkoi-lite")} column={column} />
    ),
    cell: CalendarNameCell,
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "slug",
    header: ({ column }) => <SortButton title={__("Slug", "eventkoi-lite")} column={column} />,
    cell: ({ row }) => (
      <div className="text-foreground">{row.getValue("slug")}</div>
    ),
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "shortcode",
    header: ({ column }) => <SortButton title={__("Shortcode", "eventkoi-lite")} column={column} />,
    cell: ShortcodeCell,
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "count",
    header: ({ column }) => <SortButton title={__("Events count", "eventkoi-lite")} column={column} />,
    cell: ({ row }) => (
      <div className="text-foreground text-right">{row.getValue("count")}</div>
    ),
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
];

function CalendarLinkIcon({ url, isDefaultCal, calendarId }) {
  return (
    <a
      href={url || ""}
      target="_blank"
      rel="noopener noreferrer"
      className="ms-2 text-muted-foreground hover:text-foreground shrink-0 eventkoi-calendar-link-icon"
      data-default-cal-link={isDefaultCal ? "true" : undefined}
      aria-label={__("View public calendar (opens in new tab)", "eventkoi-lite")}
      data-calendar-id={calendarId}
      data-ek-tour="calendar-link"
      onClick={(event) => {
        if (tourHandleCalendarLink(url)) {
          event.preventDefault();
        }
      }}
    >
      <Link2 className="w-5 h-5 inline-block" />
    </a>
  );
}

export function CalendarsOverview() {
  const [searchParams] = useSearchParams();
  const dataQueryKey = searchParams.toString();

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchResults = async () => {
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/calendars`,
        method: "get",
      });
      const defaultCalId = parseInt(eventkoi_params.default_cal, 10);
      const filtered = Array.isArray(response)
        ? response.filter((cal) => parseInt(cal.id, 10) === defaultCalId)
        : response;
      setData(filtered);
    } catch (error) {
      console.error("Failed to load calendars:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchResults();
  }, [dataQueryKey]);

  return (
    <div className="flex flex-col gap-8">
      <div className="mx-auto flex w-full gap-2 justify-between">
        <Heading className="eventkoi-calendars-heading">
          <span data-ek-tour="calendars-heading">
            {__("Calendars", "eventkoi-lite")}
          </span>
        </Heading>
        <AddButton title={__("Add calendar", "eventkoi-lite")} url="/calendars/add" locked />
      </div>
      <DataTable
        data={data}
        columns={columns}
        empty={__("No calendars are found.", "eventkoi-lite")}
        base="calendars"
        hideStatusFilters
        isLoading={isLoading}
        fetchResults={fetchResults}
        hideCategories
        hideDateRange
        hideSearchBox
        hideBottomBar
        customTopLeft={() => null}
      />
      <ProLaunch
        headline={__("Upgrade to access Unlimited Calendars", "eventkoi-lite")}
        minimal
        source="calendars"
      />
    </div>
  );
}
