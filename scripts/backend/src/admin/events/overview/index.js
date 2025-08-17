import { AddButton } from "@/components/add-button";
import { ProLaunch } from "@/components/dashboard/pro-launch";
import { DataTable } from "@/components/data-table";
import { Heading } from "@/components/heading";
import { SortButton } from "@/components/sort-button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatWPtime } from "@/lib/date-utils";
import { showStaticToast } from "@/lib/toast";
import apiRequest from "@wordpress/api-fetch";
import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleDotDashed,
  Clock3,
  Link2,
  Repeat,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const statuses = {
  live: "Live",
  completed: "Completed",
  tbc: "Date not set",
  upcoming: "Upcoming",
  publish: "Upcoming",
  draft: "Draft",
  trash: "Trash",
  recurring: "Recurring",
};

const multiColumnSearch = (row, _columnId, filterValue) => {
  const searchableRowContent = `${row.original.title} ${row.original.status}`;
  return searchableRowContent.toLowerCase().includes(filterValue.toLowerCase());
};

const sortStatusFn = (rowA, rowB) => {
  const order = [
    "live",
    "upcoming",
    "publish",
    "tbc",
    "draft",
    "completed",
    "trash",
  ];
  return (
    order.indexOf(rowA.original.status) - order.indexOf(rowB.original.status)
  );
};

export function EventsOverview() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);

  const [searchParams] = useSearchParams();
  const queryStatus = searchParams.get("status") || "";
  const eventStatus = searchParams.get("event_status") || "";
  const calStatus = searchParams.get("calendar") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const fetchResults = useCallback(
    async (toastMessage = null) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          status: queryStatus,
          event_status: eventStatus,
          calendar: calStatus,
          from,
          to,
        });
        const apiURL = `${eventkoi_params.api}/events?${params.toString()}`;
        const response = await apiRequest({ path: apiURL, method: "get" });
        setData(response);
        showStaticToast(toastMessage);
      } catch (error) {
        console.error("Failed to load events:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [queryStatus, eventStatus, calStatus, from, to]
  );

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center min-h-6">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Select all"
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
        accessorKey: "title",
        header: ({ column }) => (
          <SortButton title="Event name" column={column} />
        ),
        cell: ({ row }) => {
          const { id, wp_status, url } = row.original;
          return (
            <div className="grid space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                {/* Title + frontend link icon */}
                <span className="inline">
                  <a
                    href={`#/events/${parseInt(id)}/main`}
                    className="inline font-medium hover:underline hover:decoration-dotted underline-offset-4 break-words"
                  >
                    {row.getValue("title")}
                  </a>
                  {url && (
                    <a
                      href={url}
                      className="ms-2 text-muted-foreground hover:text-foreground shrink-0"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link2 className="w-5 h-5 inline-block" />
                    </a>
                  )}
                </span>

                {/* Status badges inline with title */}
                {["draft", "trash"].includes(wp_status) && (
                  <Badge variant="outline" className="font-normal">
                    {wp_status.charAt(0).toUpperCase() + wp_status.slice(1)}
                  </Badge>
                )}

                {row.original.date_type === "recurring" && (
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full border border-[#D0E6FB] bg-[#F0F8FF] text-foreground">
                    Recurring
                  </span>
                )}
              </div>
            </div>
          );
        },
        filterFn: multiColumnSearch,
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "status",
        header: ({ column }) => <SortButton title="Status" column={column} />,
        cell: ({ row }) => {
          const status = row.getValue("status");
          const iconMap = {
            completed: <CircleCheck className="w-4 h-4 text-success" />,
            draft: <CircleDotDashed className="w-4 h-4 text-primary/60" />,
            tbc: <CircleDotDashed className="w-4 h-4 text-primary/60" />,
            upcoming: <Clock3 className="w-4 h-4 text-[#48BEFA]" />,
            publish: <Clock3 className="w-4 h-4 text-[#48BEFA]" />,
            live: <CircleAlert className="w-4 h-4 text-destructive" />,
            trash: <Ban className="w-4 h-4 text-primary/40" />,
            recurring: <Repeat className="w-4 h-4 text-primary/60" />,
          };
          return (
            <div className="flex items-center space-x-2">
              {iconMap[status]}
              <div className="text-foreground">{statuses[status]}</div>
            </div>
          );
        },
        filterFn: multiColumnSearch,
        sortingFn: sortStatusFn,
      },
      {
        accessorKey: "start_date_iso",
        header: ({ column }) => <SortButton title="Starts" column={column} />,
        cell: ({ row }) => {
          const {
            start_date_iso,
            timezone,
            recurrence_rules,
            event_days,
            date_type,
          } = row.original;

          const isAllDay =
            (date_type === "recurring" &&
              recurrence_rules?.[0]?.all_day === true) ||
            (["standard", "multi"].includes(date_type) &&
              event_days?.[0]?.all_day === true);

          return (
            <div className="text-foreground whitespace-pre-line">
              {formatWPtime(start_date_iso, {
                timezone,
                format: isAllDay ? "date" : "date-time",
              })}
            </div>
          );
        },
        filterFn: multiColumnSearch,
        sortingFn: "alphanumeric",
        sortUndefined: "last",
        invertSorting: true,
      },
      {
        accessorKey: "end_date_iso",
        header: ({ column }) => <SortButton title="Ends" column={column} />,
        cell: ({ row }) => {
          const {
            end_date_iso,
            timezone,
            recurrence_rules,
            event_days,
            date_type,
          } = row.original;

          const isAllDay =
            (date_type === "recurring" &&
              recurrence_rules?.[0]?.all_day === true) ||
            (["standard", "multi"].includes(date_type) &&
              event_days?.[event_days.length - 1]?.all_day === true);

          const isInfiniteRecurring =
            date_type === "recurring" &&
            recurrence_rules?.[0]?.ends === "never" &&
            !end_date_iso;

          return (
            <div className="text-foreground whitespace-pre-line">
              {isInfiniteRecurring
                ? "Never"
                : formatWPtime(end_date_iso, {
                    timezone,
                    format: isAllDay ? "date" : "date-time",
                  })}
            </div>
          );
        },
        filterFn: multiColumnSearch,
        sortingFn: "alphanumeric",
        sortUndefined: "last",
        invertSorting: true,
      },
      {
        accessorKey: "calendar",
        header: () => <>Calendar</>,
        cell: ({ row }) => {
          const calendar = row.original.calendar || [];
          return (
            <div className="text-foreground">
              {calendar.map((item, i) => (
                <span key={`calendar-${i}`}>
                  {item.name}
                  {i < calendar.length - 1 && ", "}
                </span>
              ))}
            </div>
          );
        },
        filterFn: multiColumnSearch,
      },
      {
        accessorKey: "modified_date",
        header: ({ column }) => (
          <SortButton title="Last modified" column={column} />
        ),
        cell: ({ row }) => {
          const raw = row.getValue("modified_date");
          const { timezone } = row.original;
          return (
            <div className="text-foreground whitespace-pre-line">
              {formatWPtime(raw, { timezone })}
            </div>
          );
        },
        filterFn: multiColumnSearch,
        sortingFn: "alphanumeric",
        sortUndefined: "last",
        invertSorting: true,
      },
    ],
    []
  );

  const statusFilters = [
    { key: "all", title: "All", hideCount: true, isSelected: true },
    { key: "publish", title: "Published" },
    { key: "draft", title: "Draft" },
    { key: "future", title: "Scheduled" },
    { key: "recurring", title: "Recurring" },
    { key: "trash", title: "Trash" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="mx-auto flex w-full gap-2 justify-between">
        <Heading>Events</Heading>
        <AddButton title="Add event" url="/events/add" />
      </div>

      <DataTable
        data={data}
        columns={columns}
        empty={"No events are found."}
        base="events"
        statusFilters={statusFilters}
        isLoading={isLoading}
        fetchResults={fetchResults}
        queryStatus={queryStatus}
        eventStatus={eventStatus}
        calStatus={calStatus}
        from={from}
        to={to}
        hideCategories
        defaultSort={[{ id: "status", desc: false }]}
      />

      <ProLaunch className="my-8 max-w-2xl" />
    </div>
  );
}
