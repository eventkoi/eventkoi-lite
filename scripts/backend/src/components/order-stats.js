import { Stat } from "@/components/stat";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettings } from "@/hooks/SettingsContext";
import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";
import { formatCurrencyBreakdownParts } from "@/lib/utils";
import { Calendar, Info } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const TIME_RANGES = [
  { value: "all", label: __("All time", "eventkoi") },
  { value: "today", label: __("Today", "eventkoi") },
  { value: "7d", label: __("Last 7 days", "eventkoi") },
  { value: "30d", label: __("Last 30 days", "eventkoi") },
  { value: "mtd", label: __("Month to date", "eventkoi") },
  { value: "qtd", label: __("Quarter to date", "eventkoi") },
  { value: "last_quarter", label: __("Last quarter", "eventkoi") },
  { value: "ytd", label: __("Year to date", "eventkoi") },
  { value: "365d", label: __("Last 365 days", "eventkoi") },
  { value: "last_year", label: __("Last year", "eventkoi") },
];

function getDateRange(value) {
  const now = new Date();
  const startOfDay = (d) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const endOfDay = (d) => {
    const c = new Date(d);
    c.setHours(23, 59, 59, 999);
    return c;
  };
  const toISO = (d) => d.toISOString();

  switch (value) {
    case "today":
      return { from: toISO(startOfDay(now)), to: toISO(endOfDay(now)) };
    case "7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: toISO(startOfDay(d)), to: toISO(endOfDay(now)) };
    }
    case "30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: toISO(startOfDay(d)), to: toISO(endOfDay(now)) };
    }
    case "mtd": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toISO(startOfDay(d)), to: toISO(endOfDay(now)) };
    }
    case "qtd": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const d = new Date(now.getFullYear(), qMonth, 1);
      return { from: toISO(startOfDay(d)), to: toISO(endOfDay(now)) };
    }
    case "last_quarter": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth - 3, 1);
      const end = new Date(now.getFullYear(), qMonth, 0);
      return { from: toISO(startOfDay(start)), to: toISO(endOfDay(end)) };
    }
    case "ytd": {
      const d = new Date(now.getFullYear(), 0, 1);
      return { from: toISO(startOfDay(d)), to: toISO(endOfDay(now)) };
    }
    case "365d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 364);
      return { from: toISO(startOfDay(d)), to: toISO(endOfDay(now)) };
    }
    case "last_year": {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return { from: toISO(startOfDay(start)), to: toISO(endOfDay(end)) };
    }
    default:
      return { from: "", to: "" };
  }
}

export { TIME_RANGES, getDateRange };

export function OrderStats({ timeRange, onTimeRangeChange }) {
  const { settings } = useSettings();
  const [stats, setStats] = useState({
    total_orders: 0,
    total_earnings: 0,
    total_tickets: 0,
    total_refunds: 0,
    net_earnings_by_currency: {},
    refunds_by_currency: {},
  });

  const [loading, setLoading] = useState(true);
  const currency = String(settings?.currency || "USD").toUpperCase();
  const netParts = formatCurrencyBreakdownParts(
    stats.net_earnings_by_currency,
    currency,
    stats.total_earnings
  );
  const refundParts = formatCurrencyBreakdownParts(
    stats.refunds_by_currency,
    currency,
    stats.total_refunds
  );

  const dateRange = useMemo(() => getDateRange(timeRange), [timeRange]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.from) params.set("from", dateRange.from);
      if (dateRange.to) params.set("to", dateRange.to);
      const qs = params.toString();
      // Fetch combined ticket order stats from local database.
      const combined = await apiRequest({
        path: `${eventkoi_params.api}/tickets/combined-stats${qs ? `?${qs}` : ""}`,
        method: "GET",
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      setStats({
        total_orders: Number(combined?.total_orders || 0),
        total_earnings: Number(combined?.total_earnings || 0),
        total_tickets: Number(combined?.tickets_sold || combined?.total_tickets || 0),
        total_refunds: Number(combined?.refund_amount || combined?.total_refunds || 0),
        net_earnings_by_currency: combined?.net_earnings_by_currency || {},
        refunds_by_currency: combined?.refunds_by_currency || {},
      });
    } catch (err) {
      console.error("Stats fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const handler = () => {
      fetchStats();
    };
    window.addEventListener("eventkoi-orders-updated", handler);
    return () => {
      window.removeEventListener("eventkoi-orders-updated", handler);
    };
  }, [fetchStats]);

  return (
    <div className="rounded-lg border bg-card text-sm text-card-foreground shadow-sm w-full overflow-x-auto py-3 flex gap-4">
      <div className="min-w-[180px] flex items-center pl-4">
        <Select value={timeRange} onValueChange={onTimeRangeChange}>
          <SelectTrigger className="w-[200px] h-9 text-sm gap-2 [&>span]:line-clamp-none">
            <Calendar aria-hidden="true" className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 grow">
        <Stat
          line1={__("Total orders", "eventkoi")}
          line2={
            loading ? <Skeleton className="h-5 w-12" /> : stats.total_orders
          }
        />
        <Stat
          line1={__("Net earnings", "eventkoi")}
          line2={
            loading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  {netParts.map((part, index) => (
                    <span
                      key={`net-part-${part}-${index}`}
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
                        <Info aria-hidden="true" className="h-4 w-4" />
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
            loading ? <Skeleton className="h-5 w-12" /> : stats.total_tickets
          }
        />
        <Stat
          line1={__("Total refunds", "eventkoi")}
          line2={
            loading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                {refundParts.map((part, index) => (
                  <span
                    key={`refund-part-${part}-${index}`}
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
  );
}
