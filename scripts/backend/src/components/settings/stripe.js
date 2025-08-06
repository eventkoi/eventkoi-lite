import apiFetch from "@wordpress/api-fetch";
import { formatInTimeZone } from "date-fns-tz";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useStripeAccount } from "@/hooks/useStripeAccount"; // shared hook
import { fetchPluginConfig } from "@/lib/config";
import { callEdgeFunction } from "@/lib/remote";

export function SettingsStripe({ settings }) {
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const configRef = useRef(null);
  const { data: account, loading } = useStripeAccount();

  const wpTz =
    eventkoi_params?.timezone_string?.trim() ||
    `Etc/GMT${-parseFloat(eventkoi_params?.timezone_offset / 3600) || 0}`;

  const isConnected = account?.connected;
  const connectedEmail = account?.email || null;
  const connectedAt = account?.connected_at || null;
  const connectedId = account?.account_id || null;
  const isTestMode = account?.is_test ?? null;

  useEffect(() => {
    const init = async () => {
      const config = await fetchPluginConfig();
      configRef.current = config;

      const fullHash = window.location.hash;
      const [base, query] = fullHash.split("?");
      const params = new URLSearchParams(query);

      const stripeStatus = params.get("stripe");
      const checkoutStatus = params.get("checkout_status");

      if (stripeStatus === "connected") {
        setStatusMessage("Stripe connected successfully!");
        setStatusType("success");
      } else if (stripeStatus === "cancelled") {
        setStatusMessage("Stripe connection was cancelled.");
        setStatusType("error");
      } else if (stripeStatus === "error") {
        setStatusMessage("Something went wrong connecting Stripe.");
        setStatusType("error");
      } else if (stripeStatus === "db_error") {
        setStatusMessage("Could not save Stripe account. Please try again.");
        setStatusType("error");
      }

      if (checkoutStatus === "success") {
        setStatusMessage("Test checkout was successful!");
        setStatusType("success");
      } else if (checkoutStatus === "cancelled") {
        setStatusMessage("Test checkout was cancelled.");
        setStatusType("error");
      }

      if (stripeStatus || checkoutStatus) {
        setTimeout(() => {
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}${base}`
          );
        }, 100);
      }
    };

    init();
  }, []);

  const handleConnect = async () => {
    try {
      const config = configRef.current;
      if (!config) throw new Error("Missing config");

      const stripeClientId = config.stripe_client_id;
      const supabaseEdgeUrl = config.supabase_edge;

      const { success, data } = await apiFetch({
        url: `${eventkoi_params.ajax_url}?action=eventkoi_sign_stripe_state`,
        method: "GET",
      });

      if (!success || !data?.encoded_state) {
        throw new Error("Failed to generate secure state.");
      }

      const redirectUri = encodeURIComponent(
        `${supabaseEdgeUrl}/stripe-oauth-callback`
      );

      const connectUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${stripeClientId}&scope=read_write&redirect_uri=${redirectUri}&state=${data.encoded_state}&prompt=consent`;

      window.location.href = connectUrl;
    } catch (err) {
      console.error("Error building Stripe Connect URL:", err);
      setStatusMessage("Could not initiate Stripe Connect.");
      setStatusType("error");
    }
  };

  const handleDisconnect = async () => {
    try {
      await callEdgeFunction("soft-disconnect-account", { method: "POST" });
      setStatusMessage("Stripe disconnected.");
      setStatusType("error");
      window.location.reload(); // refresh to reflect disconnected state
    } catch (err) {
      console.error("Failed to disconnect Stripe:", err);
      setStatusMessage("Could not disconnect. Please try again.");
      setStatusType("error");
    }
  };

  const handleTestCheckout = async () => {
    setTestLoading(true);
    setStatusMessage(null);
    setStatusType(null);

    const config = configRef.current;
    if (!config) {
      setTestLoading(false);
      setStatusMessage("Missing config.");
      setStatusType("error");
      return;
    }

    const quantity = Math.floor(Math.random() * 10) + 1;
    const unit_amount = (Math.floor(Math.random() * 20) + 1) * 100;

    try {
      const data = await callEdgeFunction("create-test-checkout-session", {
        method: "POST",
        body: JSON.stringify({
          account_id: connectedId,
          return_url: `${eventkoi_params.site_url}/wp-admin/admin.php?page=eventkoi#/settings/integrations`,
          quantity,
          unit_amount,
          event_id: 0,
          email: eventkoi_params.admin_email,
        }),
      });

      if (!data?.url) {
        console.error("❌ Test checkout failed:", data);
        setStatusMessage(data?.error || "Could not start test checkout.");
        setStatusType("error");
      } else {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("❌ Unexpected test checkout error:", err);
      setStatusMessage("Unexpected error. Please check console.");
      setStatusType("error");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Box>
      <div className="grid w-full">
        <Panel variant="header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heading level={3}>Stripe payments</Heading>
              {!loading && isTestMode && (
                <Badge
                  variant="outline"
                  className="text-yellow-700 bg-yellow-50 border-yellow-300"
                >
                  Test Mode
                </Badge>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-5 w-24 rounded-full" />
            ) : isConnected ? (
              <Badge
                variant="outline"
                className="text-green-700 border-green-300 bg-green-50"
              >
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-gray-600">
                Not connected
              </Badge>
            )}
          </div>
        </Panel>

        <Separator />
        <Panel className="gap-6">
          {statusMessage && (
            <div
              className={`rounded-md px-4 py-3 text-sm border ${
                statusType === "success"
                  ? "bg-green-50 text-green-800 border-green-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              {statusMessage}
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : isConnected ? (
            <div className="rounded-md border border-muted px-4 py-3 bg-muted/50 text-sm">
              <div className="grid grid-cols-[150px_1fr] gap-2 items-center">
                <span className="text-muted-foreground font-medium">
                  Stripe account
                </span>
                <span className="break-all">{connectedId}</span>
                <span className="text-muted-foreground font-medium">Email</span>
                <span>{connectedEmail || "unknown"}</span>
                {connectedAt && (
                  <>
                    <span className="text-muted-foreground font-medium">
                      Last connected
                    </span>
                    <span>
                      {formatInTimeZone(
                        connectedAt,
                        wpTz,
                        "d MMMM yyyy, h:mm a"
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p>
              Connect your Stripe account to enable ticket payments. We’ll take
              care of payment routing and fees.
            </p>
          )}

          {!loading && (
            <div className="flex items-center gap-4">
              {isConnected ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    className="w-48"
                  >
                    Disconnect Stripe
                  </Button>
                  <Button
                    variant="link"
                    onClick={handleTestCheckout}
                    disabled={testLoading}
                    className="inline-flex items-center gap-2"
                  >
                    {testLoading && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {testLoading ? "Running checkout…" : "Run test checkout"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  onClick={handleConnect}
                  className="w-48"
                >
                  Connect with Stripe
                </Button>
              )}
            </div>
          )}
        </Panel>
      </div>
    </Box>
  );
}
