import { SortButton } from "@/components/sort-button";
import { RefundStatusIcon } from "@/components/icons/refund-status-icon";
import { Checkbox } from "@/components/ui/checkbox";
import { formatWPtime } from "@/lib/date-utils";
import { cn, formatCurrency } from "@/lib/utils";
import { SquareCheck, SquareDot, SquareX } from "lucide-react";

export const orderTableSearch = (row, columnId, filterValue) => {
  const searchableRowContent = `${
    row.original.order_id || row.original.id || ""
  } ${row.original.ticket_holder_name || row.original.customer_name || ""} ${
    row.original.customer_email || row.original.billing_email || ""
  }`;
  return searchableRowContent
    .toLowerCase()
    .includes(String(filterValue || "").toLowerCase());
};

export const getOrderStatusLabel = (statusRaw) => {
  const status = String(statusRaw || "").toLowerCase();
  if (status === "pending" || status === "pending_payment") return "Pending payment";
  if (status === "complete" || status === "completed" || status === "succeeded") return "Completed";
  if (status === "failed") return "Payment failed";
  if (status === "refunded") return "Refunded";
  if (status === "partially_refunded") return "Partially refunded";
  if (status === "cancelled") return "Cancelled";
  if (status === "archived") return "Archived";
  return statusRaw || "—";
};

export const getOrderStatusIcon = (statusRaw) => {
  const status = String(statusRaw || "").toLowerCase();
  if (status === "complete" || status === "completed" || status === "succeeded") {
    return { Icon: SquareCheck, className: "w-4 h-4 text-[#20CFA5]" };
  }
  if (status === "refunded" || status === "partially_refunded") {
    return { Icon: RefundStatusIcon, className: "w-4 h-4 text-muted-foreground" };
  }
  if (status === "failed" || status === "cancelled") {
    return { Icon: SquareX, className: "w-4 h-4 text-[#CC3325]" };
  }
  if (status === "archived") {
    return { Icon: SquareDot, className: "w-4 h-4 text-muted-foreground" };
  }
  return { Icon: SquareDot, className: "w-4 h-4 text-yellow-600" };
};

const getDisplayOrderId = (orderId) => {
  if (!orderId) return "";
  if (!orderId.includes("-")) return orderId;
  return orderId.split("-")[0];
};

export function createOrderColumns({ includeEventColumn = false } = {}) {
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
      accessorKey: "id",
      header: ({ column }) => <SortButton title="Order ID" column={column} />,
      cell: ({ row }) => {
        const orderId = String(row.original.id || row.original.order_id || "");
        if (!orderId) {
          return <div className="text-muted-foreground">—</div>;
        }
        const url = `#/tickets/orders/${encodeURIComponent(orderId)}`;

        return (
          <div className={cn("text-foreground")}>
            <a
              href={url}
              className="font-medium hover:underline hover:decoration-dotted underline-offset-4"
              title={orderId}
            >
              {getDisplayOrderId(orderId)}
            </a>
          </div>
        );
      },
      filterFn: orderTableSearch,
      sortingFn: "alphanumeric",
    },
  ];

  if (includeEventColumn) {
    columns.push({
      accessorKey: "event_ids",
      header: ({ column }) => <SortButton title="Event ID" column={column} />,
      cell: ({ row }) => {
        const eventIds = Array.isArray(row.original.event_ids)
          ? row.original.event_ids
          : row.original.event_id
          ? [row.original.event_id]
          : [];

        if (eventIds.length === 0) {
          return <div className="text-muted-foreground">—</div>;
        }

        return (
          <div className="flex flex-wrap gap-2">
            {eventIds.map((id) => (
              <a
                key={id}
                href={`#/events/${id}/sales-history`}
                className="text-foreground hover:underline hover:decoration-dotted underline-offset-4"
              >
                {id}
              </a>
            ))}
          </div>
        );
      },
      filterFn: orderTableSearch,
      sortingFn: "alphanumeric",
    });
  }

  columns.push(
    {
      accessorKey: "customer_name",
      header: ({ column }) => <SortButton title="Customer name" column={column} />,
      cell: ({ row }) => {
        const customerName =
          row.original.ticket_holder_name || row.original.customer_name || "";
        const customerEmail =
          row.original.customer_email || row.original.billing_email || "";

        return (
          <div className="flex items-center gap-2">
            <div className="min-w-0">
              {customerName ? (
                <div className="text-foreground truncate">{customerName}</div>
              ) : null}
              {customerEmail ? (
                <div
                  className="text-xs text-muted-foreground truncate"
                  title={customerEmail}
                >
                  {customerEmail}
                </div>
              ) : null}
            </div>
          </div>
        );
      },
      filterFn: orderTableSearch,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortButton title="Order status" column={column} />,
      cell: ({ row }) => {
        const status = row.original.is_archived
          ? "archived"
          : row.original.status || row.original.payment_status || "";
        const { Icon, className } = getOrderStatusIcon(status);
        return (
          <div className="flex items-center space-x-2">
            <Icon className={className} />
            <div className="text-foreground">{getOrderStatusLabel(status)}</div>
          </div>
        );
      },
      filterFn: orderTableSearch,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "amount_total",
      header: ({ column }) => <SortButton title="Order total" column={column} />,
      cell: ({ row }) => {
        const totalCents = Number(
          row.original.amount_total ??
            row.original.total_amount ??
            row.original.total ??
            0
        );
        return (
          <div className={cn("text-foreground")}>
            {formatCurrency(
              Number.isFinite(totalCents) ? totalCents : 0,
              row.original.currency || "USD"
            )}
          </div>
        );
      },
      filterFn: orderTableSearch,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <SortButton title="Ticket quantity" column={column} />
      ),
      cell: ({ row }) => (
        <div className={cn("text-foreground")}>{row.original.quantity || ""}</div>
      ),
      filterFn: orderTableSearch,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <SortButton title="Order date" column={column} />,
      cell: ({ row }) => (
        <div className="text-foreground whitespace-pre-line">
          {formatWPtime(row.original.created_at)}
        </div>
      ),
      filterFn: orderTableSearch,
      sortingFn: "alphanumeric",
    }
  );

  return columns;
}
