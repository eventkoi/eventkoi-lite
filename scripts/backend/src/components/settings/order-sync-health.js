import { useState } from "react";

import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { callEdgeFunction } from "@/lib/remote";
import { __ } from "@wordpress/i18n";
import { Loader2 } from "lucide-react";

const FIELD_LABELS = {
  event_id: "event_id",
  event_instance_ts: "event_instance_ts",
  ticket_ids: "ticket_ids",
  platform_fee: "platform_fee",
  wp_user_id: "wp_user_id",
  checkout_name: "checkout_name",
};

export function OrderSyncHealth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const runCheck = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await callEdgeFunction("get-order-sync-health?limit=100", {
        method: "GET",
      });
      setResult(data);
    } catch (err) {
      const message =
        err?.message || __("Failed to run order sync health check.", "eventkoi");
      setError(String(message));
    } finally {
      setLoading(false);
    }
  };

  const checkedOrders = Number(result?.checked_orders || 0);
  const unhealthyOrders = Number(result?.unhealthy_orders || 0);
  const healthyOrders = Number(result?.healthy_orders || 0);
  const missingCounts = result?.missing_counts || {};
  const sampleRows = Array.isArray(result?.sample_unhealthy_orders)
    ? result.sample_unhealthy_orders
    : [];

  return (
    <Box>
      <div className="grid w-full">
        <Panel variant="header">
          <div className="flex items-center justify-between gap-3">
            <Heading level={3}>{__("Order sync health", "eventkoi")}</Heading>
            <Button
              type="button"
              variant="outline"
              onClick={runCheck}
              disabled={loading}
              className="min-w-[140px]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {__("Running...", "eventkoi")}
                </span>
              ) : (
                __("Run health check", "eventkoi")
              )}
            </Button>
          </div>
        </Panel>

        <Separator />

        <Panel className="gap-4">
          <p className="text-sm text-muted-foreground">
            {__(
              "Checks recent paid orders for required links: event, instance, tickets, platform fee, WP user, and checkout name.",
              "eventkoi",
            )}
          </p>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {result ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {`${__("Checked", "eventkoi")}: ${checkedOrders}`}
                </Badge>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  {`${__("Healthy", "eventkoi")}: ${healthyOrders}`}
                </Badge>
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                  {`${__("Unhealthy", "eventkoi")}: ${unhealthyOrders}`}
                </Badge>
              </div>

              <div className="rounded-md border border-border bg-muted/40 px-4 py-3">
                <div className="text-sm font-medium text-foreground">
                  {__("Missing field totals", "eventkoi")}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.keys(FIELD_LABELS).map((key) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-sm border border-border bg-background px-3 py-2 text-xs"
                    >
                      <span className="font-mono text-foreground">
                        {FIELD_LABELS[key]}
                      </span>
                      <span className="font-semibold text-foreground">
                        {Number(missingCounts?.[key] || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {sampleRows.length > 0 ? (
                <div className="rounded-md border border-border bg-background">
                  <div className="border-b border-border px-4 py-3 text-sm font-medium text-foreground">
                    {__("Sample unhealthy orders", "eventkoi")}
                  </div>
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-muted/60 text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 font-medium">Order ID</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                          <th className="px-4 py-2 font-medium">Missing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sampleRows.map((row) => (
                          <tr key={String(row.id)} className="border-t border-border">
                            <td className="px-4 py-2 font-mono text-foreground">
                              {String(row.id || "").slice(0, 8)}...
                            </td>
                            <td className="px-4 py-2 text-foreground">
                              {String(row.status || "")}
                            </td>
                            <td className="px-4 py-2 text-foreground">
                              {Array.isArray(row.missing_fields)
                                ? row.missing_fields.join(", ")
                                : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </Panel>
      </div>
    </Box>
  );
}
