import { AddButton } from "@/components/add-button";
import { ProLaunch } from "@/components/dashboard/pro-launch";
import { DataTable } from "@/components/data-table";
import { Heading } from "@/components/heading";
import { SortButton } from "@/components/sort-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import apiRequest from "@wordpress/api-fetch";
import { CheckCheck, Copy, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const multiColumnSearch = (row, columnId, filterValue) => {
  const searchableRowContent = `${row.original.name} ${row.original.slug}`;
  return searchableRowContent.toLowerCase().includes(filterValue.toLowerCase());
};

function CalendarNameCell({ row }) {
  const isDefaultCal =
    parseInt(row.original.id) === parseInt(eventkoi_params.default_cal);
  const url = `#/calendars/${row.original.id}/main`;

  return (
    <div className="grid space-y-1">
      <div className="flex gap-2 items-start text-foreground group">
        <a
          href={url}
          className="font-medium hover:underline hover:decoration-dotted underline-offset-4"
        >
          {row.getValue("name")}
        </a>
        {isDefaultCal && (
          <Badge variant="outline" className="font-normal">
            Default
          </Badge>
        )}
        <a
          href={row.original.url}
          target="_blank"
          rel="noopener noreferrer"
          className="invisible group-hover:visible min-w-5 w-5 h-5 flex items-center justify-center"
          aria-label="View public calendar"
        >
          <Link2 className="w-full h-full" />
        </a>
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
      <Input type="text" value={value} readOnly className="w-full pr-10" />
      <TooltipProvider delayDuration={0}>
        <Tooltip key={tooltipKey}>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="absolute h-8 right-[5px] top-[4px] border-none cursor-pointer hover:bg-input"
              onClick={handleCopy}
              aria-label="Copy shortcode"
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
            {copied ? "Copied!" : "Copy shortcode"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

const columns = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center min-h-6">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all rows"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center min-h-6">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortButton title="Calendar name" column={column} />
    ),
    cell: CalendarNameCell,
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "slug",
    header: ({ column }) => <SortButton title="Slug" column={column} />,
    cell: ({ row }) => (
      <div className="text-foreground">{row.getValue("slug")}</div>
    ),
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "shortcode",
    header: ({ column }) => <SortButton title="Shortcode" column={column} />,
    cell: ShortcodeCell,
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "count",
    header: ({ column }) => <SortButton title="Events count" column={column} />,
    cell: ({ row }) => (
      <div className="text-foreground text-right">{row.getValue("count")}</div>
    ),
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
];

export function CalendarsOverview() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const fetchResults = async () => {
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/calendars`,
        method: "get",
      });
      setData(response);
    } catch (error) {
      console.error("Failed to load calendars:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchResults();
  }, [searchParams]);

  return (
    <div className="flex flex-col gap-8">
      <div className="mx-auto flex w-full gap-2 justify-between">
        <Heading>Calendars</Heading>
        <AddButton title="Add calendar" url="/calendars/add" locked />
      </div>
      <DataTable
        data={data}
        columns={columns}
        empty="No calendars are found."
        base="calendars"
        hideStatusFilters
        isLoading={isLoading}
        fetchResults={fetchResults}
        hideCategories
        hideDateRange
      />

      <ProLaunch
        headline="Upgrade now to add multiple calendars"
        className="my-8 max-w-2xl"
      />
    </div>
  );
}
