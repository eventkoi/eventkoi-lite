import { useEventEditContext } from "@/hooks/EventEditContext";
import { useSettings } from "@/hooks/SettingsContext";
import { Heading } from "@/components/heading";
import { Stat } from "@/components/stat";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTable } from "@/components/data-table";
import { SearchBox } from "@/components/search-box";
import { Button } from "@/components/ui/button";
import { createOrderColumns } from "@/lib/order-table-columns";
import { normalizeOrders } from "@/lib/orders";
import { callEdgeFunction } from "@/lib/remote";
import { getSupabase } from "@/lib/supabase";
import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, Info } from "lucide-react";
import { TestModeNotice } from "@/components/test-mode-notice";
import { formatCurrencyBreakdownParts } from "@/lib/utils";
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

export function EventEditSalesHistory() {
  const { event } = useEventEditContext();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState({
    total_orders: 0,
    total_earnings: 0,
    tickets_sold: 0,
    refund_amount: 0,
    net_earnings_by_currency: {},
    refunds_by_currency: {},
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const currency = String(settings?.currency || "USD").toUpperCase();
  const netParts = formatCurrencyBreakdownParts(
    stats.net_earnings_by_currency,
    currency,
    Number(stats.total_earnings || 0)
  );
  const refundParts = formatCurrencyBreakdownParts(
    stats.refunds_by_currency,
    currency,
    Number(stats.refund_amount || 0)
  );
  const queryStatus = searchParams.get("status") || "all";

  const fetchResults = useCallback(async (options = {}) => {
    const { forceRefresh = false } = options;

    if (!event?.id) {
      setData([]);
      setIsLoading(false);
      setStats({
        total_orders: 0,
        total_earnings: 0,
        tickets_sold: 0,
        refund_amount: 0,
        net_earnings_by_currency: {},
        refunds_by_currency: {},
      });
      setStatsLoading(false);
      return;
    }

    setIsLoading(true);
    setStatsLoading(true);

    const refreshParam = forceRefresh ? "&force_refresh=1" : "";

    try {
      // All three calls run in parallel for fastest load.
      // combined-stats proxies the edge get-stats call with server-side caching
      // and merges WC stats, eliminating two slow browser→Supabase round-trips.
      const [ordersResponse, combinedStats, localOrders] = await Promise.all([
        callEdgeFunction(`list-orders?event_id=${event.id}&include_archived=1`),
        apiRequest({
          path: `${eventkoi_params.api}/tickets/combined-stats?event_id=${event.id}${refreshParam}`,
          method: "GET",
          headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
        }),
        apiRequest({
          path: `${eventkoi_params.api}/tickets/orders?event_id=${event.id}${refreshParam}`,
          method: "GET",
          headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
        }).catch(() => []),
      ]);

      const normalizedOrders = normalizeOrders(ordersResponse);

      // Merge local WC orders — they only exist in the local DB,
      // not in Supabase, so the edge function won't return them.
      if (Array.isArray(localOrders)) {
        const edgeIds = new Set(normalizedOrders.map((o) => o.order_id || o.id));
        const wcOrders = localOrders.filter(
          (o) => String(o.order_id || "").startsWith("wc_") && !edgeIds.has(o.order_id)
        );
        if (wcOrders.length > 0) {
          normalizedOrders.push(...normalizeOrders(wcOrders));
        }
      }

      setData(normalizedOrders);
      setStats({
        total_orders: Number(combinedStats?.total_orders || 0),
        total_earnings: Number(combinedStats?.total_earnings || 0),
        tickets_sold: Number(combinedStats?.tickets_sold || 0),
        refund_amount: Number(combinedStats?.refund_amount || 0),
        net_earnings_by_currency: combinedStats?.net_earnings_by_currency || {},
        refunds_by_currency: combinedStats?.refunds_by_currency || {},
      });
    } catch (error) {
      console.error("Fetch error:", error);
      setData([]);
      setStats({
        total_orders: 0,
        total_earnings: 0,
        tickets_sold: 0,
        refund_amount: 0,
        net_earnings_by_currency: {},
        refunds_by_currency: {},
      });
    } finally {
      setIsLoading(false);
      setStatsLoading(false);
    }
  }, [event?.id]);

  const columns = useMemo(() => createOrderColumns(), []);
  const statusCounts = useMemo(() => buildOrderStatusCounts(data), [data]);
  const filteredData = useMemo(
    () => data.filter((row) => matchesOrderStatusFilter(row, queryStatus)),
    [data, queryStatus]
  );

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    if (!event?.id) {
      return undefined;
    }

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
          .channel(`eventkoi-event-sales-${event.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "order_items",
              filter: `event_id=eq.${event.id}`,
            },
            scheduleRefresh
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "orders" },
            scheduleRefresh
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "refunds" },
            scheduleRefresh
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "platform_fees" },
            scheduleRefresh
          )
          .subscribe();
      } catch (error) {
        console.error("Event sales realtime subscribe failed:", error);
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
  }, [event?.id, fetchResults]);

  const base = event?.id ? `events/${event.id}/sales-history` : "events";

  return (
    <div className="flex flex-col w-full gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Heading>{__("Sales history", "eventkoi")}</Heading>
        </div>
      </div>

      <TestModeNotice />

      <div className="rounded-lg border bg-card text-sm text-card-foreground shadow-sm w-full overflow-x-auto py-3 flex gap-4">
        <div className="min-w-[16px]"></div>
        <div className="grid grid-cols-4 grow gap-4">
          <Stat
            className="border-l-0 pl-0"
            line1={__("Total orders", "eventkoi")}
            line2={
              statsLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                stats.total_orders
              )
            }
          />
          <Stat
            line1={__("Net earnings", "eventkoi")}
            line2={
              statsLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    {netParts.map((part, index) => (
                      <span
                        key={`event-net-part-${part}-${index}`}
                        className={
                          index > 0 ? "text-xs font-normal leading-none" : "leading-none"
                        }
                      >
                        {index > 0 ? " + " : ""}
                        {part}
                      </span>
                    ))}
                  </span>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Net earnings info"
                          className="inline-flex items-center text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0 p-0"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        className="bg-zinc-900 text-white px-3 py-1.5 text-sm rounded-md shadow-none border-none"
                        side="top"
                        sideOffset={8}
                      >
                        {__("Net earnings are calculated after platform and Stripe processing fees.", "eventkoi")}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
              )
            }
          />
          <Stat
            line1={__("Tickets sold", "eventkoi")}
            line2={
              statsLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                stats.tickets_sold
              )
            }
          />
          <Stat
            line1={__("Total refunds", "eventkoi")}
            line2={
              statsLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  {refundParts.map((part, index) => (
                    <span
                      key={`event-refund-part-${part}-${index}`}
                      className={
                        index > 0 ? "text-xs font-normal leading-none" : "leading-none"
                      }
                    >
                      {index > 0 ? " + " : ""}
                      {part}
                    </span>
                  ))}
                </span>
              )
            }
          />
        </div>
      </div>

      <DataTable
        data={filteredData}
        columns={columns}
        empty={
          queryStatus === "archived"
            ? __("No archived orders found.", "eventkoi")
            : __("No orders found.", "eventkoi")
        }
        base={base}
        tableLayout="fixed"
        hideDateRange
        hideCategories
        isLoading={isLoading}
        fetchResults={fetchResults}
        hideFiltersControl
        statusFilters={ORDER_STATUS_FILTERS}
        queryStatus={queryStatus}
        statusCounts={statusCounts}
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
      />
    </div>
  );
}
