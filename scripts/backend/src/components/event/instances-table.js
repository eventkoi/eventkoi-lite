import { DataTable } from "@/components/data-table";
import { SortButton } from "@/components/sort-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { formatWPtime } from "@/lib/date-utils";
import { showToast, showToastError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import apiRequest from "@wordpress/api-fetch";
import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleDotDashed,
  Clock3,
  Link2,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const statusIcons = {
  completed: <CircleCheck className="w-4 h-4 text-success" />,
  upcoming: <Clock3 className="w-4 h-4 text-[#48BEFA]" />,
  tbc: <CircleDotDashed className="w-4 h-4 text-primary/60" />,
  trash: <Ban className="w-4 h-4 text-primary/40" />,
  live: <CircleAlert className="w-4 h-4 text-destructive" />,
};

const getStatusLabel = (status) => {
  return (
    {
      completed: "Completed",
      upcoming: "Upcoming",
      tbc: "Date not set",
      trash: "Trash",
      live: "Live",
    }[status] || "—"
  );
};

export function EventInstancesTable({
  instances: initialInstances,
  isLoading,
  eventId,
  timezone,
}) {
  const [instances, setInstances] = useState([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setEvent } = useEventEditContext();

  // inside component body
  const status = searchParams.get("status") || "all";

  const forceReloadTable = () => {
    setSearchParams((prev) => {
      // Create a new URLSearchParams object to force re-evaluation
      return new URLSearchParams(prev);
    });
  };

  const handleRestoreSelected = async (rows, table) => {
    if (!rows?.length) return;

    const nowISO = new Date().toISOString();
    const timestampsToRemove = [];

    try {
      await Promise.all(
        rows.map((row) => {
          const ts = Math.floor(
            new Date(row.original.start_date).getTime() / 1000
          );
          timestampsToRemove.push(ts);

          return apiRequest({
            path: `${eventkoi_params.api}/edit_instance`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "EVENTKOI-API-KEY": eventkoi_params.api_key,
            },
            body: JSON.stringify({
              event_id: eventId,
              timestamp: ts,
              overrides: {
                modified_at: nowISO,
              },
              deleteKeys: ["status"],
            }),
          });
        })
      );

      // Patch recurrence_overrides in event context by removing `status`
      setEvent((prev) => {
        const updated = { ...(prev.recurrence_overrides || {}) };

        timestampsToRemove.forEach((ts) => {
          if (updated[ts]) {
            const { status, ...rest } = updated[ts];
            if (Object.keys(rest).length === 0) {
              delete updated[ts];
            } else {
              updated[ts] = rest;
            }
          }
        });

        return {
          ...prev,
          recurrence_overrides: updated,
        };
      });

      showToast({ message: `Restored ${rows.length} instance(s).` });
      table.resetRowSelection();
      forceReloadTable();
    } catch (err) {
      console.error("Failed to restore instances:", err);
      showToastError("Failed to restore one or more instances.");
    }
  };

  const handleTrashSelected = async (rows, table) => {
    if (!rows?.length) return;

    const nowISO = new Date().toISOString();
    const newOverrides = {};

    try {
      await Promise.all(
        rows.map((row) => {
          const ts = Math.floor(
            new Date(row.original.start_date).getTime() / 1000
          );

          newOverrides[ts] = {
            ...(row.original.override || {}),
            status: "trash",
            modified_at: nowISO,
          };

          return apiRequest({
            path: `${eventkoi_params.api}/edit_instance`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "EVENTKOI-API-KEY": eventkoi_params.api_key,
            },
            body: JSON.stringify({
              event_id: eventId,
              timestamp: ts,
              overrides: newOverrides[ts],
            }),
          });
        })
      );

      // Patch recurrence_overrides in event context
      setEvent((prev) => ({
        ...prev,
        recurrence_overrides: {
          ...(prev.recurrence_overrides || {}),
          ...newOverrides,
        },
      }));

      showToast({ message: `Moved ${rows.length} instance(s) to trash.` });
      table.resetRowSelection();
      forceReloadTable();
    } catch (err) {
      console.error("Failed to trash instances:", err);
      showToastError("Failed to trash one or more instances.");
    }
  };

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
          const { instance_url, start_date, override } = row.original;
          const overriddenTitle = override?.title;
          const fallbackTitle = row.getValue("title");

          const iso = row.original.start_date;
          const date = iso.endsWith("Z") ? new Date(iso) : new Date(iso + "Z");
          const ts = Math.floor(date.getTime() / 1000);

          return (
            <div className="group flex items-center gap-2 text-foreground">
              {/* Title link */}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/events/${eventId}/instances/edit/${ts}`);
                }}
                className="font-medium hover:underline hover:decoration-dotted underline-offset-4"
              >
                {overriddenTitle || fallbackTitle}
              </a>

              {/* Edited badge (outside link) */}
              {override && (
                <Badge
                  variant="outline"
                  className="text-xs border-[#F6EFD3] text-foreground bg-[#FBF9ED] font-medium px-2 py-1"
                >
                  Edited
                </Badge>
              )}

              {/* External view icon */}
              {instance_url && (
                <a
                  href={instance_url}
                  className="invisible group-hover:visible min-w-5 w-5 h-5 items-center justify-center"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View instance"
                >
                  <Link2 className="w-full h-full" />
                </a>
              )}
            </div>
          );
        },
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "status",
        header: ({ column }) => <SortButton title="Status" column={column} />,
        cell: ({ row }) => {
          const status = row.getValue("status");
          return (
            <div className="flex items-center space-x-2">
              {statusIcons[status]}
              <div className="text-foreground">{getStatusLabel(status)}</div>
            </div>
          );
        },
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "start_date",
        header: ({ column }) => <SortButton title="Starts" column={column} />,
        cell: ({ row }) => {
          const raw = row.getValue("start_date");
          const isAllDay = row.original.all_day;
          return (
            <div className="text-foreground whitespace-pre-line">
              {formatWPtime(raw, {
                timezone,
                format: isAllDay ? "date" : "date-time",
              })}
            </div>
          );
        },
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "end_date",
        header: ({ column }) => <SortButton title="Ends" column={column} />,
        cell: ({ row }) => {
          const raw = row.getValue("end_date");
          const isAllDay = row.original.all_day;
          return (
            <div className="text-foreground whitespace-pre-line">
              {formatWPtime(raw, {
                timezone,
                format: isAllDay ? "date" : "date-time",
              })}
            </div>
          );
        },
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "modified_date",
        header: ({ column }) => (
          <SortButton title="Last modified" column={column} />
        ),
        cell: ({ row }) => {
          const raw = row.original.override?.modified_at;
          return (
            <div className="text-foreground whitespace-pre-line">
              {formatWPtime(raw, { timezone })}
            </div>
          );
        },
        sortingFn: "alphanumeric",
      },
    ],
    [navigate, eventId]
  );

  const statusFilters = [
    { key: "all", title: "All", hideCount: true, isSelected: true },
    { key: "trash", title: "Trash" },
  ];

  const base = eventId ? `events/${eventId}/instances` : "instances";

  useEffect(() => {
    if (!initialInstances) return;

    const trashOnly = searchParams.get("status") === "trash";
    const eventStatusParam = searchParams.get("event_status");

    const activeStatuses = eventStatusParam
      ? eventStatusParam
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : [];

    const filtered = initialInstances.filter((instance) => {
      const status = (instance.status || "").trim().toLowerCase();
      const isTrash = status === "trash";

      if (trashOnly) {
        return isTrash;
      }

      if (activeStatuses.length > 0) {
        return activeStatuses.includes(status);
      }

      return !isTrash;
    });

    setInstances(filtered);
  }, [initialInstances, searchParams]);

  return (
    <DataTable
      data={instances}
      columns={columns}
      empty={
        status === "trash"
          ? "No trashed instances found."
          : "No recurring instances found."
      }
      base={base}
      queryStatus={status}
      statusFilters={statusFilters}
      hideCategories
      fetchResults={() => {}}
      isLoading={isLoading}
      hideTableBorder={true}
      tableClassName="no-checkbox-padding rounded-none border border-transparent"
      defaultSort={[{ id: "start_date", desc: false }]}
      hideSearchBox={true}
      customTopLeft={(table) => {
        const selectedRows = table.getSelectedRowModel().rows;
        const selectedCount = selectedRows.length;
        const isTrashView = status === "trash";

        const handleClick = () => {
          if (isTrashView) {
            handleRestoreSelected(selectedRows, table);
          } else {
            handleTrashSelected(selectedRows, table);
          }
        };

        return (
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "gap-1 border border-input bg-muted",
              selectedCount === 0 &&
                "border-input bg-muted text-muted-foreground/50 pointer-events-none"
            )}
            disabled={selectedCount === 0}
            onClick={handleClick}
          >
            {isTrashView ? (
              <>
                <CircleCheck className="w-4 h-4" />
                Restore
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Move to trash
              </>
            )}
          </Button>
        );
      }}
    />
  );
}
