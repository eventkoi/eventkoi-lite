import { NewTabNote } from "@/components/new-tab-note";
import { AddButton } from "@/components/add-button";
import { DataTable } from "@/components/data-table";
import { Heading } from "@/components/heading";
import { SortButton } from "@/components/sort-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatWPtime } from "@/lib/date-utils";
import { showStaticToast, showToast, showToastError } from "@/lib/toast";
import apiRequest from "@wordpress/api-fetch";
import { __, _n, sprintf } from "@wordpress/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { URLImportDialog } from "@/components/url-import-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Ban,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  CircleDotDashed,
  Clock3,
  Download,
  Link2,
  Repeat,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// All-day rows carry the calendar dates the event was authored with
// (all_day_start_date / all_day_end_date, plain Y-m-d). Rendering the UTC
// instant in the site timezone instead shifts those dates whenever the two
// zones disagree, so an all-day 10–11 Nov event read as ending on the 12th.
// Format the plain date as-is by pinning it to UTC.
const formatAllDayDate = (dateOnly) =>
  dateOnly
    ? formatWPtime(String(dateOnly).slice(0, 10), {
        timezone: "UTC",
        format: "date",
      })
    : "";

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
  const [fetchError, setFetchError] = useState(false);
  const [statusCounts, setStatusCounts] = useState({});
  const [urlImportOpen, setUrlImportOpen] = useState(false);
  const icsFileRef = useRef(null);
  const [icsImporting, setIcsImporting] = useState(false);
  const [tecDialogOpen, setTecDialogOpen] = useState(false);
  const [tecState, setTecState] = useState({ loading: true, data: null, importing: false, result: null });
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false);
  const [emptyingTrash, setEmptyingTrash] = useState(false);

  const [searchParams] = useSearchParams();
  const queryStatus = searchParams.get("status") || "";
  const eventStatus = searchParams.get("event_status") || "";
  const calStatus = searchParams.get("calendar") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const fetchStatusCounts = useCallback(async () => {
    try {
      const apiBase = window?.eventkoi_params?.api || "/wp-json/eventkoi/v1";
      const url = `${apiBase}/get_event_counts`;
      const counts = await apiRequest({ path: url, method: "GET" });
      setStatusCounts(counts || {});
    } catch (err) {
      console.warn("Could not fetch event counts:", err);
    }
  }, []);

  const fetchResults = useCallback(
    async (toastMessage = null) => {
      setIsLoading(true);
      setFetchError(false);
      try {
        const params = new URLSearchParams({
          status: queryStatus,
          event_status: eventStatus,
          calendar: calStatus,
          from,
          to,
          include_counts: "1",
        });
        const apiURL = `${eventkoi_params.api}/events?${params.toString()}`;
        const response = await apiRequest({ path: apiURL, method: "get" });
        const items = response?.items ?? response;
        setData(items);
        if (response?.counts) {
          setStatusCounts(response.counts);
        }
        showStaticToast(toastMessage);
      } catch (error) {
        console.error("Failed to load events:", error);
        setFetchError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [queryStatus, eventStatus, calStatus, from, to]
  );

  useEffect(() => {
    (async () => {
      try {
        const response = await apiRequest({
          path: `${eventkoi_params.api}/tec-import/detect`,
          method: "GET",
          headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
        });
        setTecState((s) => ({ ...s, loading: false, data: response }));
      } catch {
        setTecState((s) => ({ ...s, loading: false, data: null }));
      }
    })();
  }, []);

  const importTEC = async () => {
    setTecState((s) => ({ ...s, importing: true, result: null }));
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/tec-import/run`,
        method: "POST",
        data: { event_ids: [], import_images: true },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      setTecState((s) => ({ ...s, importing: false, result: response }));
      if (response?.imported > 0) {
        showToast({ message: `${response.imported} event${response.imported !== 1 ? "s" : ""} imported.` });
        fetchResults();
      }
      if (response?.errors > 0) {
        showToastError(`${response.errors} event(s) failed.`);
      }
      setTecDialogOpen(false);
    } catch (err) {
      showToastError(err?.message ?? __("Import failed.", "eventkoi-lite"));
      setTecState((s) => ({ ...s, importing: false }));
    }
  };

  const tecAvailable = !tecState.loading && tecState.data?.installed && tecState.data?.events_count > 0;

  const trashCount = Number(statusCounts?.trash || 0);
  const handleEmptyTrash = async () => {
    setEmptyingTrash(true);
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/empty_trash`,
        method: "POST",
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      const removed = Number(response?.removed || 0);
      if (removed > 0) {
        showToast({ message: response?.success || sprintf(_n("%d event permanently removed.", "%d events permanently removed.", removed, "eventkoi-lite"), removed) });
      }
      if (Number(response?.skipped || 0) > 0) {
        showToastError(sprintf(_n("%d event was skipped (no permission).", "%d events were skipped (no permission).", response.skipped, "eventkoi-lite"), response.skipped));
      }
      setEmptyTrashOpen(false);
      fetchResults();
    } catch (err) {
      showToastError(err?.message ?? __("Failed to empty trash.", "eventkoi-lite"));
    } finally {
      setEmptyingTrash(false);
    }
  };

  const handleICSUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setIcsImporting(true);
    try {
      const parsed = await apiRequest({
        path: `${eventkoi_params.api}/ics-import/parse`,
        method: "POST",
        data: { content },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      if (!parsed?.cache_key || parsed.events_count === 0) {
        showToastError(
          parsed?.skipped > 0
            ? __("All events already imported.", "eventkoi-lite")
            : __("No events found in file.", "eventkoi-lite")
        );
        setIcsImporting(false);
        e.target.value = "";
        return;
      }
      const response = await apiRequest({
        path: `${eventkoi_params.api}/ics-import/run`,
        method: "POST",
        data: { cache_key: parsed.cache_key },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      if (response?.imported > 0) {
        showToast({ message: `${response.imported} event${response.imported !== 1 ? "s" : ""} imported.` });
        fetchResults();
      }
      if (response?.errors > 0) {
        showToastError(`${response.errors} event(s) failed.`);
      }
    } catch {
      showToastError(__("Import failed.", "eventkoi-lite"));
    }
    setIcsImporting(false);
    e.target.value = "";
  };

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
              aria-label={__("Select all", "eventkoi-lite")}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center min-h-6">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={__("Select row", "eventkoi-lite")}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <SortButton title={__("Event name", "eventkoi-lite")} column={column} />
        ),
        cell: ({ row }) => {
          const { id, wp_status, url } = row.original;
          return (
            <div className="grid space-y-1 min-w-0">
              <div className="flex items-center gap-2 text-foreground min-w-0">
                {/* Title + frontend link icon */}
                <a
                  href={`#/events/${parseInt(id, 10)}/main`}
                  className="inline min-w-[4.5rem] font-medium hover:underline hover:decoration-dotted underline-offset-4 truncate"
                  title={row.getValue("title")}
                  data-ek-tour="event-title"
                  data-ek-event-id={parseInt(id, 10)}
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
                  <NewTabNote /></a>
                )}

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
        header: ({ column }) => <SortButton title={__("Status", "eventkoi-lite")} column={column} />,
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
        accessorKey: "rsvp_used",
        header: ({ column }) => (
          <SortButton title={__("RSVPs/Tickets", "eventkoi-lite")} column={column} />
        ),
        cell: ({ row }) => {
          const attendanceMode = row.original.attendance_mode || "none";
          if (attendanceMode === "tickets") {
            const count = Number(row.original.tickets_sold || 0);
            const label = count === 1 ? "ticket" : "tickets";
            return (
              <div className="text-foreground tabular-nums">
                {count} {label}
              </div>
            );
          }
          if (attendanceMode === "rsvp") {
            const count = Number(row.original.rsvp_used || 0);
            const label = count === 1 ? "RSVP" : "RSVPs";
            return (
              <div className="text-foreground tabular-nums">
                {count} {label}
              </div>
            );
          }
          return <div className="text-muted-foreground">—</div>;
        },
        sortingFn: (rowA, rowB) => {
          const getCount = (row) => {
            const mode = row.original.attendance_mode || "none";
            if (mode === "tickets") return Number(row.original.tickets_sold || 0);
            if (mode === "rsvp") return Number(row.original.rsvp_used || 0);
            return -1;
          };
          return getCount(rowA) - getCount(rowB);
        },
      },
      {
        accessorKey: "start_date_iso",
        header: ({ column }) => <SortButton title={__("Starts", "eventkoi-lite")} column={column} />,
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

          const allDayStart = event_days?.[0]?.all_day_start_date;

          return (
            <div className="text-foreground whitespace-pre-line">
              {isAllDay && allDayStart
                ? formatAllDayDate(allDayStart)
                : formatWPtime(start_date_iso, {
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
        header: ({ column }) => <SortButton title={__("Ends", "eventkoi-lite")} column={column} />,
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

          const allDayEnd =
            event_days?.[event_days.length - 1]?.all_day_end_date;

          return (
            <div className="text-foreground whitespace-pre-line">
              {isInfiniteRecurring
                ? "Never"
                : isAllDay && allDayEnd
                ? formatAllDayDate(allDayEnd)
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
        header: () => <>{__("Calendar", "eventkoi-lite")}</>,
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
          <SortButton title={__("Last modified", "eventkoi-lite")} column={column} />
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
        sortingFn: (rowA, rowB, columnId) => {
          const a = Date.parse(rowA.getValue(columnId)) || 0;
          const b = Date.parse(rowB.getValue(columnId)) || 0;
          return a - b;
        },
        sortUndefined: "last",
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
      <Dialog open={emptyTrashOpen} onOpenChange={setEmptyTrashOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {__("Empty trash?", "eventkoi-lite")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {sprintf(
                /* translators: %d: number of events. */
                _n(
                  "This will permanently delete %d event in the trash. This action cannot be undone.",
                  "This will permanently delete %d events in the trash. This action cannot be undone.",
                  trashCount,
                  "eventkoi-lite"
                ),
                trashCount
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button variant="outline" className="cursor-pointer shadow-none border-solid">
                {__("Cancel", "eventkoi-lite")}
              </Button>
            </DialogClose>
            <Button
              onClick={handleEmptyTrash}
              disabled={emptyingTrash}
              className="gap-1.5 cursor-pointer shadow-none"
              style={{ border: "1px solid transparent" }}
            >
              {emptyingTrash ? (
                <>
                  <span className="h-3.5 w-3.5 mr-1.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {__("Emptying…", "eventkoi-lite")}
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  {__("Empty trash", "eventkoi-lite")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto flex w-full gap-2 justify-between">
        <Heading>
          <span data-ek-tour="events-heading">
            {__("Events", "eventkoi-lite")}
          </span>
        </Heading>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="default" className="gap-2 font-normal">
                <Download className="h-4 w-4" />
                {__("Import", "eventkoi-lite")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setUrlImportOpen(true)}>
                {__("Import from URL", "eventkoi-lite")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => icsFileRef.current?.click()} disabled={icsImporting}>
                {icsImporting ? __("Importing...", "eventkoi-lite") : __("Import from ICS / iCal file", "eventkoi-lite")}
              </DropdownMenuItem>
              {tecAvailable && (
                <DropdownMenuItem onClick={() => setTecDialogOpen(true)}>
                  {__("Import from The Events Calendar", "eventkoi-lite")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <URLImportDialog
            open={urlImportOpen}
            onOpenChange={setUrlImportOpen}
            onImported={() => fetchResults()}
          />
          <Dialog open={tecDialogOpen} onOpenChange={setTecDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <img src={`${eventkoi_params.plugin_url}templates/assets/tec-icon.png`} alt="The Events Calendar" className="h-8 w-8 rounded-lg" />
                  <DialogTitle className="text-base">
                    {__("Import from The Events Calendar", "eventkoi-lite")}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-sm leading-relaxed">
                  {__("This will import the following into EventKoi:", "eventkoi-lite")}
                </DialogDescription>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1.5 pl-1">
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                    {`${tecState.data?.events_count ?? 0} event${(tecState.data?.events_count ?? 0) !== 1 ? "s" : ""}`}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                    {__("Venues, categories & featured images", "eventkoi-lite")}
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground/70 mt-3">
                  {__("Previously imported events will be skipped.", "eventkoi-lite")}
                </p>
              </DialogHeader>
              <DialogFooter className="mt-2">
                <DialogClose asChild>
                  <Button variant="outline" className="cursor-pointer shadow-none border-solid">
                    {__("Cancel", "eventkoi-lite")}
                  </Button>
                </DialogClose>
                <Button onClick={importTEC} disabled={tecState.importing} className="gap-1.5 cursor-pointer shadow-none" style={{ border: "1px solid transparent" }}>
                  {tecState.importing ? <><span className="h-3.5 w-3.5 mr-1.5 animate-spin rounded-full border-2 border-current border-t-transparent" />{__("Importing...", "eventkoi-lite")}</> : <><Download className="h-3.5 w-3.5" />{__("Import", "eventkoi-lite")}</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <input
            ref={icsFileRef}
            type="file"
            accept=".ics,.ical,.ifb,.icalendar"
            className="hidden"
            onChange={handleICSUpload}
          />
          <AddButton title={__("Add event", "eventkoi-lite")} url="/events/add" />
        </div>
      </div>

      {fetchError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <p className="text-sm text-muted-foreground">{__("Failed to load events.", "eventkoi-lite")}</p>
          <Button variant="outline" onClick={() => fetchResults()}>
            {__("Try again", "eventkoi-lite")}
          </Button>
        </div>
      ) : (
      <DataTable
        data={data}
        columns={columns}
        empty={"No events are found."}
        base="events"
        titleColumnWidth="24%"
        statusFilters={statusFilters}
        isLoading={isLoading}
        fetchResults={fetchResults}
        queryStatus={queryStatus}
        eventStatus={eventStatus}
        calStatus={calStatus}
        from={from}
        to={to}
        hideCategories
        defaultSort={[{ id: "modified_date", desc: true }]}
        statusCounts={statusCounts}
        refreshStatusCounts={fetchResults}
        topLeftExtra={
          queryStatus === "trash" && trashCount > 0 ? (
            <div className="flex items-center gap-3">
              <div className="h-5 w-px bg-border" aria-hidden="true" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEmptyTrashOpen(true)}
                className="font-normal text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {__("Empty trash", "eventkoi-lite")}
              </Button>
            </div>
          ) : null
        }
        statusFiltersBelowControls
      />
      )}
    </div>
  );
}
