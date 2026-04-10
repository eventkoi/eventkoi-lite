// src/admin/tickets/orders/index.js
import { DataTable } from "@/components/data-table";
import { Heading } from "@/components/heading";
import { OrderStats, getDateRange } from "@/components/order-stats";
import { SearchBox } from "@/components/search-box";
import { Button } from "@/components/ui/button";
import { createOrderColumns } from "@/lib/order-table-columns";
import { normalizeOrders } from "@/lib/orders";
import { formatCurrency } from "@/lib/utils";
import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";
import { ArrowDownToLine } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const ORDER_STATUS_FILTERS = [
  { key: "all", title: "All" },
  { key: "completed", title: "Completed" },
  { key: "refunded", title: "Refunded" },
  { key: "pending", title: "Pending" },
  { key: "archived", title: "Archived" },
];

const normalizeOrderStatus = (row) =>
  String(row?.payment_status || row?.status || "").trim().toLowerCase();

const isCompletedStatus = (status) =>
  status === "complete" || status === "completed" || status === "succeeded";

const isRefundedStatus = (status) =>
  status === "refunded" || status === "partially_refunded";

const isPendingStatus = (status) =>
  status === "pending" || status === "pending_payment";

const isArchivedOrder = (row) => row?.is_archived === true;

const matchesOrderStatusFilter = (row, statusFilter) => {
  const status = normalizeOrderStatus(row);
  const isArchived = isArchivedOrder(row);

  if (statusFilter === "archived") {
    return isArchived;
  }
  if (statusFilter === "completed") {
    return !isArchived && isCompletedStatus(status);
  }
  if (statusFilter === "refunded") {
    return !isArchived && isRefundedStatus(status);
  }
  if (statusFilter === "pending") {
    return !isArchived && isPendingStatus(status);
  }
  return !isArchived;
};

const buildOrderStatusCounts = (rows) =>
  rows.reduce(
    (acc, row) => {
      const status = normalizeOrderStatus(row);
      const isArchived = isArchivedOrder(row);

      if (isArchived) {
        acc.archived += 1;
        return acc;
      }

      acc.all += 1;

      if (isCompletedStatus(status)) {
        acc.completed += 1;
      } else if (isRefundedStatus(status)) {
        acc.refunded += 1;
      } else if (isPendingStatus(status)) {
        acc.pending += 1;
      }

      return acc;
    },
    {
      all: 0,
      completed: 0,
      refunded: 0,
      pending: 0,
      archived: 0,
    }
  );

export function Orders() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [timeRange, setTimeRange] = useState("all");
  const [searchParams] = useSearchParams();
  const queryStatus = searchParams.get("status") || "all";
  const dateRange = useMemo(() => getDateRange(timeRange), [timeRange]);
  const columns = useMemo(
    () => createOrderColumns({ includeEventColumn: true }),
    []
  );

  const fetchResults = useCallback(async (options = {}) => {
    const { emitUpdateEvent = true, forceRefresh = false } = options;
    try {
      const refreshParam = forceRefresh ? "&force_refresh=1" : "";
      const json = await apiRequest({
        path: `${eventkoi_params.api}/tickets/all-orders?_=${Date.now()}${refreshParam}`,
        method: "GET",
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      const normalized = normalizeOrders(json);
      setData(normalized);
      if (emitUpdateEvent) {
        window.dispatchEvent(new CustomEvent("eventkoi-orders-updated"));
      }
    } catch (error) {
      console.error("Orders fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setData([]);
    setIsLoading(true);
    fetchResults({ emitUpdateEvent: false });
  }, [fetchResults]);

  const timeFilteredData = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return data;
    const from = dateRange.from ? new Date(dateRange.from).getTime() : 0;
    const to = dateRange.to ? new Date(dateRange.to).getTime() : Infinity;
    return data.filter((row) => {
      const created = new Date(row.created_at).getTime();
      return created >= from && created <= to;
    });
  }, [data, dateRange]);

  const statusCounts = useMemo(() => buildOrderStatusCounts(timeFilteredData), [timeFilteredData]);
  const filteredData = useMemo(
    () => timeFilteredData.filter((row) => matchesOrderStatusFilter(row, queryStatus)),
    [timeFilteredData, queryStatus]
  );

  const exportOrdersCsv = (table) => {
    setIsExporting(true);
    try {
      const rows = table.getFilteredRowModel().rows || [];
      const headers = [
        "Order ID",
        "Event",
        "Customer name",
        "Customer email",
        "Order status",
        "Quantity",
        "Amount",
        "Currency",
        "Date",
      ];

      const escapeCsv = (value) => {
        const text = String(value ?? "");
        if (text.includes(",") || text.includes('"') || text.includes("\n")) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      };

      const csvRows = rows.map((row) => {
        const o = row.original;
        const eventNames = o.event_names || {};
        const eventIds = Array.isArray(o.event_ids) ? o.event_ids : [];
        const eventLabel = eventIds.map((id) => eventNames[id] || id).join("; ");
        const totalCents = Number(o.total_amount ?? o.amount_total ?? o.total ?? 0);
        const cur = (o.currency || "usd").toUpperCase();

        return [
          o.order_id || o.id || "",
          eventLabel,
          o.ticket_holder_name || o.customer_name || "",
          o.customer_email || o.billing_email || "",
          o.payment_status || o.status || "",
          Number(o.quantity || 0),
          formatCurrency(totalCents, cur),
          cur,
          o.created_at || "",
        ]
          .map(escapeCsv)
          .join(",");
      });

      const blob = new Blob([[headers.join(","), ...csvRows].join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "eventkoi-orders.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export orders CSV failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="mx-auto flex w-full gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Heading>{__("Ticket sales", "eventkoi")}</Heading>
        </div>
      </div>
      <OrderStats timeRange={timeRange} onTimeRangeChange={setTimeRange} />
      <DataTable
        data={filteredData}
        columns={columns}
        empty={queryStatus === "archived" ? "No archived orders are found." : "No orders are found."}
        base="tickets"
        statusFilters={ORDER_STATUS_FILTERS}
        isLoading={isLoading}
        fetchResults={fetchResults}
        queryStatus={queryStatus}
        statusCounts={statusCounts}
        hideFiltersControl
        defaultSort={[{ id: "created_at", desc: true }]}
        customTopRight={(table) => (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <SearchBox table={table} />
            <Button variant="outline" disabled={isExporting} onClick={() => exportOrdersCsv(table)}>
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              {isExporting
                ? __("Exporting...", "eventkoi")
                : __("Export", "eventkoi")}
            </Button>
          </div>
        )}
        hideCategories
        hideDateRange
      />
    </div>
  );
}
