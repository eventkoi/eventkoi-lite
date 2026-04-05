import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useStripeAccount } from "@/hooks/useStripeAccount";
import { __ } from "@wordpress/i18n";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const NOTICE_STORAGE_KEY = "eventkoi_dismiss_stripe_notice";

export function StripeConnectNotice() {
  const { data: account, loading, error } = useStripeAccount();
  const [dismissed, setDismissed] = useState(false);

  const checkoutMethod = window?.eventkoi_params?.ticket_checkout_method || "stripe";
  const shouldShow = checkoutMethod === "stripe" && !loading && (!account?.connected || error) && !dismissed;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(NOTICE_STORAGE_KEY);
    if (stored === "1") {
      setDismissed(true);
    }
  }, []);

  const dismissNotice = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(NOTICE_STORAGE_KEY, "1");
    }
  };

  if (!shouldShow) return null;

  return (
    <Alert className="bg-amber-50 border-amber-200 text-sm relative">
      <button
        type="button"
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-amber-900/70 transition-colors hover:text-amber-900 hover:bg-amber-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        onClick={dismissNotice}
        aria-label={__("Dismiss notice", "eventkoi")}
      >
        <X className="h-4 w-4" />
      </button>
      <AlertDescription className="text-amber-900/90 text-xs">
        <p className="text-sm">
          <span className="font-medium">
            {__("Connect your Stripe account", "eventkoi")}
          </span>{" "}
          {__(
            "to enable ticket sales.",
            "eventkoi"
          )}
        </p>
        <div className="mt-3">
          <Button asChild size="sm">
            <Link to="/settings/payments">
              {__("Connect Stripe", "eventkoi")}
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
