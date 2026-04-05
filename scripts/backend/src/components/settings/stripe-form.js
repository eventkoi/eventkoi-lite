import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { callEdgeFunction } from "@/lib/remote";
import { showToastError } from "@/lib/toast";

export function StripeForm({ settings, accountId, email }) {
  const [processing, setProcessing] = useState(false);
  const [searchParams] = useSearchParams();

  const startHostedCheckout = useCallback(async () => {
    setProcessing(true);
    try {
      const response = await callEdgeFunction("create-ticket-checkout-session", {
        method: "POST",
        body: JSON.stringify({
          account_id: accountId,
          return_url: `${eventkoi_params.site_url}/wp-admin/admin.php?page=eventkoi#/settings/payments?stripe_session_id={CHECKOUT_SESSION_ID}`,
          quantity: 1,
          unit_amount: 1500,
          event_id: 0,
          instance_ts: 0,
          event_instance_ts: 0,
          currency: (settings?.currency || "usd").toLowerCase(),
          email: email || eventkoi_params.admin_email,
          ticket_items: [
            {
              ticket_id: 1,
              name: "Test Ticket",
              quantity: 1,
              unit_amount: 1500,
              currency: (settings?.currency || "usd").toLowerCase(),
            },
          ],
        }),
      });

      const hostedUrl = response?.hosted_url || response?.checkout_url || response?.url;
      if (hostedUrl) {
        window.location.href = hostedUrl;
        return;
      }
      showToastError("Could not start hosted checkout. Missing checkout URL.");
    } catch (error) {
      console.error("Test hosted checkout failed:", error);
      const message =
        error?.body ||
        error?.message ||
        "Could not start hosted checkout. Check Stripe account/mode settings.";
      showToastError(message);
    } finally {
      setProcessing(false);
    }
  }, [accountId, email, settings?.currency]);

  useEffect(() => {
    const stripe_id = searchParams.get("stripe_session_id");

    if (stripe_id) {
      setProcessing(true);
      const hash = window.location.hash || "";
      const [hashPath] = hash.split("?");
      const newUrl = `${window.location.pathname}${window.location.search}${hashPath}`;

      window.history.replaceState(null, "", newUrl);
      window.location.reload();
    }
  }, [searchParams]);

  if (processing) {
    return (
      <Button variant="secondary" className="w-40" disabled>
        Processing...
      </Button>
    );
  }

  return (
    <Button variant="secondary" className="w-40" onClick={startHostedCheckout}>
      Test payment
    </Button>
  );
}
