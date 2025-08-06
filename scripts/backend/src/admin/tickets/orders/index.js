// src/admin/tickets/orders/index.js
import { DataTable } from "@/components/data-table";
import { Heading } from "@/components/heading";
import { OrderStats } from "@/components/order-stats";
import { SortButton } from "@/components/sort-button";
import { Checkbox } from "@/components/ui/checkbox";
import { callEdgeFunction } from "@/lib/remote";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";
import { SquareCheck, SquareDot, SquareX } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// Support multi-column search.
const multiColumnSearch = (row, columnId, filterValue) => {
  const searchableRowContent = `${row.original.billing_name}`;
  return searchableRowContent.toLowerCase().includes(filterValue.toLowerCase());
};

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
      const truncatedId = row.original.id.substring(0, 6); // Show first 6 characters
      const url = "#/tickets/orders/" + row.original.id;
      return (
        <div className={cn("text-foreground")}>
          <a
            href={url}
            className="font-medium hover:underline hover:decoration-dotted underline-offset-4"
            title={row.original.id} // Tooltip with full ID
          >
            {truncatedId}...
          </a>
        </div>
      );
    },
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "customer_name",
    header: ({ column }) => (
      <SortButton title="Customer name" column={column} />
    ),
    cell: ({ row }) => (
      <div className={cn("text-foreground")}>
        {row.original.customer_name || ""} {/* Use customer_name directly */}
      </div>
    ),
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortButton title="Order status" column={column} />,
    cell: ({ row }) => {
      const status = row.original.status;

      let statusLabel = status; // Default to the raw status

      if (status === "pending") {
        statusLabel = "Pending payment"; // Customize label for "pending"
      } else if (status === "complete") {
        statusLabel = "Completed"; // Customize label for "complete"
      } else if (status === "failed") {
        statusLabel = "Payment failed"; // Customize label for "failed"
      }

      return (
        <div className="flex items-center space-x-2">
          {status === "complete" && (
            <SquareCheck className="w-4 h-4 text-[#20CFA5]" />
          )}
          {status === "failed" && (
            <SquareX className="w-4 h-4 text-[#CC3325]" />
          )}
          {status === "pending" && (
            <SquareDot className="w-4 h-4 text-yellow-600" />
          )}
          <div className="text-foreground">{statusLabel}</div>{" "}
          {/* Display the custom status label */}
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
        ${(row.original.amount_total / 100).toFixed(2)}
      </div>
    ),
    filterFn: multiColumnSearch,
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
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <SortButton title="Order date" column={column} />,
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      const wpTz =
        eventkoi_params?.timezone_string?.trim() ||
        `Etc/GMT${-parseFloat(eventkoi_params?.timezone_offset / 3600) || 0}`;

      const formattedDate = formatInTimeZone(date, wpTz, "yyyy-MM-dd");
      const formattedTime = formatInTimeZone(date, wpTz, "hh:mm a");

      return (
        <div className="text-foreground whitespace-pre-line">
          <div>{formattedDate}</div>
          <div>{formattedTime}</div>
        </div>
      );
    },
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
];

export function Orders() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [searchParams] = useSearchParams();

  const fetchResults = async () => {
    try {
      const json = await callEdgeFunction("list-orders");
      setData(json || []);
    } catch (error) {
      console.error("Orders fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setData([]);
    setIsLoading(true);
    fetchResults();
  }, [searchParams]);

  return (
    <div className="flex flex-col gap-8">
      <div className="mx-auto flex w-full gap-2 justify-between">
        <Heading>Orders</Heading>
      </div>
      <OrderStats />
      <DataTable
        data={data}
        columns={columns}
        empty={"No orders are found."}
        base="orders"
        hideStatusFilters
        isLoading={isLoading}
        fetchResults={fetchResults}
        hideCategories
        hideDateRange
      />
    </div>
  );
}
