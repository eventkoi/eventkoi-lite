import { SortButton } from "@/components/sort-button";
import { RefundStatusIcon } from "@/components/icons/refund-status-icon";
import { Checkbox } from "@/components/ui/checkbox";
import { formatWPtime } from "@/lib/date-utils";
import { cn, formatCurrency } from "@/lib/utils";
import { SquareCheck, SquareDot, SquareX } from "lucide-react";

const getOrderStatus = (row) => {
  if (row?.is_archived === true) {
    return "archived";
  }
  return String(row.payment_status || row.status || "").toLowerCase();
};

const getOrderStatusLabel = (status) => {
  if (status === "pending" || status === "pending_payment") return "Pending payment";
  if (status === "complete" || status === "completed" || status === "succeeded") return "Completed";
  if (status === "failed") return "Payment failed";
  if (status === "refunded") return "Refunded";
  if (status === "partially_refunded") return "Partially refunded";
  if (status === "cancelled") return "Cancelled";
  if (status === "archived") return "Archived";
  return status || "";
};

const getStatusIcon = (status) => {
  if (status === "complete" || status === "completed" || status === "succeeded") {
    return { Icon: SquareCheck, className: "text-[#20CFA5]" };
  }
  if (
    status === "refunded" ||
    status === "partially_refunded"
  ) {
    return { Icon: RefundStatusIcon, className: "text-muted-foreground" };
  }
  if (
    status === "failed" ||
    status === "cancelled"
  ) {
    return { Icon: SquareX, className: "text-[#CC3325]" };
  }
  if (status === "archived") {
    return { Icon: SquareDot, className: "text-muted-foreground" };
  }
  return { Icon: SquareDot, className: "text-yellow-600" };
};

const getOrderId = (row) => String(row.order_id || row.id || "");

const getDisplayOrderId = (orderId) => {
  if (!orderId) return "";
  if (!orderId.includes("-")) return orderId;
  return orderId.split("-")[0];
};

const getOrderTotalCents = (row) =>
  Number(row.total_amount ?? row.amount_total ?? row.total ?? 0);

export const multiColumnSearch = (row, columnId, filterValue) => {
  const searchableRowContent = `${row.original.order_id || row.original.id || ""} ${
    row.original.ticket_holder_name || row.original.customer_name || ""
  } ${row.original.customer_email || row.original.billing_email || ""}`;
  return searchableRowContent
    .toLowerCase()
    .includes(String(filterValue || "").toLowerCase());
};

export const createOrderColumns = ({ includeEventColumn = false } = {}) => {
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
      accessorKey: "order_id",
      header: ({ column }) => <SortButton title="Order ID" column={column} />,
      cell: ({ row }) => {
        const orderId = getOrderId(row.original);
        if (!orderId) {
          return <div className="text-foreground">—</div>;
        }

        const wcMatch = orderId.match(/^wc_(\d+)/);
        if (wcMatch) {
          return (
            <div className={cn("text-foreground")}>
              <a
                href={`${window.location.origin}/wp-admin/admin.php?page=wc-orders&action=edit&id=${wcMatch[1]}`}
                className="font-medium hover:underline hover:decoration-dotted underline-offset-4"
                title={`WooCommerce Order #${wcMatch[1]}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                #{wcMatch[1]}
              </a>
            </div>
          );
        }

        return (
          <div className={cn("text-foreground")}>
            <a
              href={`#/tickets/orders/${encodeURIComponent(orderId)}`}
              className="font-medium hover:underline hover:decoration-dotted underline-offset-4"
              title={orderId}
            >
              {getDisplayOrderId(orderId)}
            </a>
          </div>
        );
      },
      filterFn: multiColumnSearch,
      sortingFn: "alphanumeric",
    },
  ];

  if (includeEventColumn) {
    columns.push({
      accessorKey: "event_ids",
      header: ({ column }) => <SortButton title="Event name" column={column} />,
      cell: ({ row }) => {
        const eventIds = Array.isArray(row.original.event_ids)
          ? row.original.event_ids
          : row.original.event_id
          ? [row.original.event_id]
          : [];

        if (eventIds.length === 0) {
          return <div className="text-muted-foreground">—</div>;
        }

        const eventNames = row.original.event_names || {};

        return (
          <div className="flex flex-wrap gap-2">
            {eventIds.map((id) => (
              <a
                key={id}
                href={`#/events/${id}/sales-history`}
                className="text-foreground hover:underline hover:decoration-dotted underline-offset-4"
              >
                {eventNames[id] || id}
              </a>
            ))}
          </div>
        );
      },
      filterFn: multiColumnSearch,
      sortingFn: "alphanumeric",
    });
  }

  columns.push(
    {
      accessorKey: "customer_name",
      header: ({ column }) => <SortButton title="Customer name" column={column} />,
      cell: ({ row }) => (
        <div className={cn("text-foreground")}>
          {row.original.ticket_holder_name || row.original.customer_name || ""}
        </div>
      ),
      filterFn: multiColumnSearch,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "payment_status",
      header: ({ column }) => <SortButton title="Order status" column={column} />,
      cell: ({ row }) => {
        const status = getOrderStatus(row.original);
        const { Icon, className } = getStatusIcon(status);
        return (
          <div className="flex items-center space-x-2">
            <Icon className={`h-4 w-4 ${className}`} />
            <div className="text-foreground">{getOrderStatusLabel(status)}</div>
          </div>
        );
      },
      filterFn: multiColumnSearch,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "amount_total",
      header: ({ column }) => <SortButton title="Order total" column={column} />,
      cell: ({ row }) => (
        <div className={cn("text-foreground")}>
          {formatCurrency(
            Number.isFinite(getOrderTotalCents(row.original))
              ? getOrderTotalCents(row.original)
              : 0,
            row.original.currency || "USD"
          )}
        </div>
      ),
      filterFn: multiColumnSearch,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => <SortButton title="Ticket quantity" column={column} />,
      cell: ({ row }) => (
        <div className={cn("text-foreground")}>{row.original.quantity || 0}</div>
      ),
      filterFn: multiColumnSearch,
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
      filterFn: multiColumnSearch,
      sortingFn: "alphanumeric",
    }
  );

  return columns;
};
