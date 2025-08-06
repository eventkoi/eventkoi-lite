import { Stat } from "@/components/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { callEdgeFunction } from "@/lib/remote";
import { useEffect, useState } from "react";

export function OrderStats() {
  const [stats, setStats] = useState({
    total_orders: 0,
    total_earnings: 0,
    total_tickets: 0,
    total_refunds: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await callEdgeFunction("get-stats");

        setStats({
          total_orders: data.total_orders || 0,
          total_earnings: data.total_earnings || 0,
          total_tickets: data.tickets_sold || 0,
          total_refunds: data.refund_amount || 0,
        });
      } catch (err) {
        console.error("Stats fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="rounded-lg border bg-card text-sm text-card-foreground shadow-sm w-full overflow-x-auto py-3 flex gap-4">
      <div className="min-w-[180px]"></div>
      <div className="grid grid-cols-4 grow">
        <Stat
          line1="Total orders"
          line2={
            loading ? <Skeleton className="h-5 w-12" /> : stats.total_orders
          }
        />
        <Stat
          line1="Total earnings"
          line2={
            loading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              `$${(stats.total_earnings / 100).toFixed(2)}`
            )
          }
        />
        <Stat
          line1="Tickets sold"
          line2={
            loading ? <Skeleton className="h-5 w-12" /> : stats.total_tickets
          }
        />
        <Stat
          line1="Total refunds"
          line2={
            loading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              `$${(stats.total_refunds / 100).toFixed(2)}`
            )
          }
        />
      </div>
    </div>
  );
}
