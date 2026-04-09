import apiFetch from "@wordpress/api-fetch";
import { formatInTimeZone } from "date-fns-tz";
import { useEffect, useRef, useState } from "react";

// Module-level flag so the one-time currency self-heal does not re-fire when
// SettingsStripe remounts (which happens every time the user toggles to Stripe
// in the checkout-method picker). Re-firing races with the checkout-method
// POST and corrupts the optimistic state.
let didSelfHealCurrency = false;

import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { StripeForm } from "@/components/settings/stripe-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useStripeAccount } from "@/hooks/useStripeAccount"; // shared hook
import { fetchPluginConfig } from "@/lib/config";
import { callEdgeFunction } from "@/lib/remote";

export function SettingsStripe({ settings, setSettings }) {
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState(null);

  const configRef = useRef(null);
  const { data: account, loading } = useStripeAccount();

  const wpTz =
    eventkoi_params?.timezone_string?.trim() ||
    `Etc/GMT${-parseFloat(eventkoi_params?.timezone_offset / 3600) || 0}`;

  const isConnected = account?.connected;
  const needsReconnect = account?.needs_reconnect === true;
  const connectedEmail = account?.email || null;
  const connectedAt = account?.connected_at || null;
  const connectedId = account?.account_id || null;
  const isTestMode = account?.is_test ?? null;
  const accountCurrency = account?.default_currency || null;
  const accountCountry = account?.country || null;

  const fetchFreshConfig = async () => {
    const url = `${eventkoi_params.supabase_config_url}?t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load config");
    }
    return res.json();
  };

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

        let freshConfig = config;

        try {
          freshConfig = await fetchFreshConfig();
          configRef.current = freshConfig;
        } catch (err) {
          console.error("Failed to refresh config after connect:", err);
        }

        let freshAccount = null;
        try {
          freshAccount = await callEdgeFunction("get-account");
        } catch (err) {
          console.error("Failed to fetch account after connect:", err);
        }

        const settingsPayload = {};
        if (
          freshConfig?.stripe_publishable_key &&
          !settings?.stripe?.publishable_key
        ) {
          settingsPayload.stripe = {
            publishable_key: freshConfig.stripe_publishable_key,
          };
          settingsPayload.mode = freshConfig.is_live ? "live" : "test";
        }
        if (freshAccount?.default_currency) {
          settingsPayload.currency = String(
            freshAccount.default_currency
          ).toUpperCase();
        }

        if (Object.keys(settingsPayload).length > 0) {
          try {
            const response = await apiFetch({
              path: `${eventkoi_params.api}/settings`,
              method: "POST",
              data: settingsPayload,
              headers: {
                "EVENTKOI-API-KEY": eventkoi_params.api_key,
              },
            });

            if (typeof setSettings === "function") {
              setSettings((prev) => {
                const merged = { ...prev };
                Object.keys(settingsPayload).forEach((key) => {
                  merged[key] =
                    response?.settings?.[key] ?? settingsPayload[key];
                });
                return merged;
              });
            }
          } catch (err) {
            console.error("Failed to sync Stripe settings after connect:", err);
          }
        }
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

  // Self-heal: when an already-connected account exposes a default currency
  // that doesn't match the saved one, sync it once. Handles installs that
  // connected before the auto-sync was wired up. Guarded by a module-level
  // flag so it never re-fires across remounts.
  useEffect(() => {
    if (didSelfHealCurrency) return;
    if (!account?.connected) return;
    if (!account?.default_currency) return;
    // Skip while a checkout-method switch is mid-flight: settings hasn't
    // been persisted yet, and a concurrent POST would race that update.
    if (settings?.ticket_checkout_method !== "stripe") return;

    const stripeCurrency = String(account.default_currency).toUpperCase();
    const savedCurrency = String(settings?.currency || "").toUpperCase();
    if (!savedCurrency || savedCurrency === stripeCurrency) {
      didSelfHealCurrency = true;
      return;
    }

    didSelfHealCurrency = true;
    (async () => {
      try {
        const response = await apiFetch({
          path: `${eventkoi_params.api}/settings`,
          method: "POST",
          data: { currency: stripeCurrency },
          headers: {
            "EVENTKOI-API-KEY": eventkoi_params.api_key,
          },
        });
        if (typeof setSettings === "function") {
          const nextCurrency =
            response?.settings?.currency ?? stripeCurrency;
          setSettings((prev) => ({ ...prev, currency: nextCurrency }));
        }
      } catch (err) {
        console.error("Failed to sync currency from Stripe account:", err);
      }
    })();
  }, [account, settings?.currency, settings?.ticket_checkout_method, setSettings]);

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
            ) : needsReconnect ? (
              <Badge
                variant="outline"
                className="text-amber-700 border-amber-300 bg-amber-50"
              >
                Reconnect needed
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
          ) : isConnected || needsReconnect ? (
            <div className="rounded-md border border-muted px-4 py-3 bg-muted/50 text-sm">
              <div className="grid grid-cols-[150px_1fr] gap-2 items-center">
                <span className="text-muted-foreground font-medium">
                  Stripe account
                </span>
                <span className="break-all">{connectedId}</span>
                <span className="text-muted-foreground font-medium">Email</span>
                <span>{connectedEmail || "unknown"}</span>
                {accountCountry && (
                  <>
                    <span className="text-muted-foreground font-medium">
                      Country
                    </span>
                    <span>{accountCountry}</span>
                  </>
                )}
                {accountCurrency && (
                  <>
                    <span className="text-muted-foreground font-medium">
                      Account currency
                    </span>
                    <span>{accountCurrency}</span>
                  </>
                )}
                {connectedAt && (
                  <>
                    <span className="text-muted-foreground font-medium">
                      Last connected
                    </span>
                    <span>
                      {formatInTimeZone(
                        connectedAt,
                        wpTz,
                        eventkoi_params?.time_format === "24"
                          ? "d MMMM yyyy, HH:mm"
                          : "d MMMM yyyy, h:mm a"
                      )}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground font-medium">Mode</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">
                    {isTestMode ? "Test" : "Live"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isTestMode
                      ? "— no real charges. Mode is set by the EventKoi platform."
                      : "— processing real payments. Mode is set by the EventKoi platform."}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <p>
              Connect your Stripe account to enable ticket payments.
            </p>
          )}

          {!loading && needsReconnect && (
            <div className="rounded-md px-4 py-3 text-sm border bg-amber-50 text-amber-800 border-amber-200">
              Your Stripe account needs to be reconnected for{" "}
              {isTestMode ? "test" : "live"} mode. Click{" "}
              <strong>Connect with Stripe</strong> below to reconnect.
            </div>
          )}

          {!loading && (
            <div className="flex items-center gap-4">
              {isConnected ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    className="w-48 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    Disconnect Stripe
                  </Button>
                  <StripeForm
                    settings={settings}
                    accountId={connectedId}
                    email={eventkoi_params.admin_email}
                  />
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
