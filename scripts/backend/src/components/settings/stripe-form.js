import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import apiRequest from "@wordpress/api-fetch";

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function StripeForm({ settings }) {
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const stripePromise = loadStripe(settings?.stripe?.publishable_key);

  const fetchClientSecret = useCallback(async () => {
    // Create a Checkout Session
    const response = await apiRequest({
      path: `${eventkoi_params.api}/stripe_test_checkout_session`,
      method: "post",
      headers: {
        "EVENTKOI-API-KEY": eventkoi_params.api_key,
      },
    });

    return response.clientSecret;
  }, []);

  const options = { fetchClientSecret };

  useEffect(() => {
    var stripe_id = searchParams.get("stripe_session_id");

    async function saveStripeSession() {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/manual_stripe_session`,
        method: "post",
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
        data: {
          stripe_id: stripe_id,
        },
      })
        .then((response) => {
          navigate("/tickets/orders");
        })
        .catch((error) => {});
    }

    if (stripe_id) {
      setProcessing(true);
      saveStripeSession();
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
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-40">
          Test payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] overflow-y-scroll max-h-screen">
        <DialogHeader>
          <DialogTitle></DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div id="checkout">
          <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
        <DialogFooter></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
