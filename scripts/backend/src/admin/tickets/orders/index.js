// src/admin/tickets/orders/index.js
import { DataTable } from "@/components/data-table";
import { Heading } from "@/components/heading";
import { OrderStats, getDateRange } from "@/components/order-stats";
import { StripeConnectNotice } from "@/components/stripe-connect-notice";
import { TestModeNotice } from "@/components/test-mode-notice";
import { SearchBox } from "@/components/search-box";
import { Button } from "@/components/ui/button";
import { createOrderColumns } from "@/lib/order-table-columns";
import { normalizeOrder, normalizeOrders } from "@/lib/orders";
import { callEdgeFunction } from "@/lib/remote";
import { getSupabase } from "@/lib/supabase";
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
  const [isExporting] = useState(false);
  const [timeRange, setTimeRange] = useState("all");
  const [searchParams] = useSearchParams();
  const queryStatus = searchParams.get("status") || "all";
  const dateRange = useMemo(() => getDateRange(timeRange), [timeRange]);
  const columns = useMemo(
    () => createOrderColumns({ includeEventColumn: true }),
    []
  );

  const enrichOrdersWithEventIds = useCallback(async (orders) => {
    const missing = orders.filter(
      (order) => !Array.isArray(order.event_ids) || order.event_ids.length === 0
    );

    if (!missing.length) {
      return orders;
    }

    // Cap enrichment to avoid flooding the edge with requests.
    const MAX_ENRICH = 20;
    const toEnrich = missing.slice(0, MAX_ENRICH);

    const resolvedById = new Map();

    // Process in batches of 5 concurrent requests.
    const BATCH_SIZE = 5;
    for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
      const batch = toEnrich.slice(i, i + BATCH_SIZE);
      const details = await Promise.all(
        batch.map(async (order) => {
          const id = order.id || order.order_id;
          if (!id) return null;
          try {
            const detail = await callEdgeFunction("get-order", {
              method: "POST",
              body: JSON.stringify({ id }),
            });
            const normalizedDetail = normalizeOrder(detail);
            return { id: String(id), detail: normalizedDetail };
          } catch {
            return null;
          }
        })
      );

      details.forEach((result) => {
        if (!result || !Array.isArray(result.detail?.event_ids)) return;
        if (result.detail.event_ids.length > 0) {
          resolvedById.set(result.id, {
            event_ids: result.detail.event_ids,
            event_names: result.detail.event_names || {},
          });
        }
      });
    }

    if (!resolvedById.size) {
      return orders;
    }

    return orders.map((order) => {
      const id = String(order.id || order.order_id || "");
      const resolved = resolvedById.get(id);
      if (!resolved) {
        return order;
      }
      return {
        ...order,
        event_ids: resolved.event_ids,
        event_id: resolved.event_ids[0] || order.event_id || null,
        event_names: resolved.event_names,
      };
    });
  }, []);

  const fetchResults = useCallback(async (options = {}) => {
    const { emitUpdateEvent = true, forceRefresh = false } = options;
    try {
      // all-orders proxies the edge list-orders call with server-side
      // caching and merges WC orders in one response.
      const refreshParam = forceRefresh ? "&force_refresh=1" : "";
      const json = await apiRequest({
        path: `${eventkoi_params.api}/tickets/all-orders?_=${Date.now()}${refreshParam}`,
        method: "GET",
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      const normalized = normalizeOrders(json);

      const enriched = await enrichOrdersWithEventIds(normalized);
      setData(enriched);
      if (emitUpdateEvent) {
        window.dispatchEvent(new CustomEvent("eventkoi-orders-updated"));
      }
    } catch (error) {
      console.error("Orders fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [enrichOrdersWithEventIds]);

  useEffect(() => {
    setData([]);
    setIsLoading(true);
    fetchResults({ emitUpdateEvent: false });
  }, [fetchResults]);

  useEffect(() => {
    let channel = null;
    let refreshTimer = null;
    let mounted = true;

    const scheduleRefresh = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      refreshTimer = setTimeout(() => {
        if (!mounted) return;
        fetchResults({ forceRefresh: true });
      }, 250);
    };

    (async () => {
      try {
        const supabase = await getSupabase();
        channel = supabase
          .channel("eventkoi-admin-orders")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "orders" },
            scheduleRefresh
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "order_items" },
            scheduleRefresh
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "refunds" },
            scheduleRefresh
          )
          .subscribe();
      } catch (error) {
        console.error("Orders realtime subscribe failed:", error);
      }
    })();

    return () => {
      mounted = false;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      if (channel) {
        getSupabase().then((supabase) => supabase.removeChannel(channel));
      }
    };
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

  return (
    <div className="flex flex-col gap-8">
      <div className="mx-auto flex w-full gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Heading>{__("Ticket sales", "eventkoi")}</Heading>
        </div>
      </div>
      <TestModeNotice />
      <StripeConnectNotice />
      <OrderStats timeRange={timeRange} onTimeRangeChange={setTimeRange} />
      <DataTable
        data={filteredData}
        columns={columns}
        empty={queryStatus === "archived" ? "No archived orders are found." : "No orders are found."}
        base="orders"
        statusBase="tickets"
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
            <Button variant="outline" disabled={isExporting}>
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
