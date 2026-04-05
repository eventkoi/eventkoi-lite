import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";
import { CircleCheck, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useSettings } from "@/hooks/SettingsContext";
import { useStripeAccount } from "@/hooks/useStripeAccount";
import { fetchPluginConfig } from "@/lib/config";
import { showToast, showToastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

function StripeLogo({ className = "" }) {
  return (
    <svg
      viewBox="0 0 60 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M60 12.8978C60 8.62471 57.9557 5.25 54.1335 5.25C50.2966 5.25 47.9023 8.62471 47.9023 12.8684C47.9023 17.8655 50.6905 20.4427 54.7482 20.4427C56.7334 20.4427 58.2468 19.9856 59.3959 19.3507V16.1538C58.2468 16.7151 56.9205 17.0544 55.2594 17.0544C53.627 17.0544 52.1874 16.4636 52.0103 14.5038H59.9704C59.9704 14.2822 60 13.3873 60 12.8978ZM51.966 11.5152C51.966 9.63768 53.0856 8.86471 54.1188 8.86471C55.1224 8.86471 56.1852 9.63768 56.1852 11.5152H51.966ZM41.4672 5.25C39.8201 5.25 38.7596 6.0377 38.1779 6.58521L37.9417 5.52823H34.4987V24.75L38.3503 23.9329L38.3651 19.3801C38.962 19.8078 39.833 20.4427 41.4376 20.4427C44.6894 20.4427 47.6399 17.9832 47.6399 12.7653C47.6251 7.99037 44.6451 5.25 41.4672 5.25ZM40.5962 16.8917C39.4914 16.8917 38.8358 16.5083 38.3651 16.0365L38.3503 9.86838C38.8506 9.3503 39.5209 8.98154 40.5962 8.98154C42.2869 8.98154 43.4656 10.8591 43.4656 12.9272C43.4656 15.0394 42.3017 16.8917 40.5962 16.8917ZM28.9192 4.19891L32.7856 3.36713V0L28.9192 0.816989V4.19891ZM28.9192 5.54293H32.7856V20.15H28.9192V5.54293ZM24.8171 6.74459L24.611 5.54293H21.2271V20.15H25.0787V9.92162C25.9497 8.80493 27.3893 9.01179 27.838 9.17454V5.54293C27.3745 5.36547 25.6882 5.05558 24.8171 6.74459ZM17.0637 1.63398L13.2861 2.43636L13.2713 16.301C13.2713 18.6723 15.0802 20.4574 17.4597 20.4574C18.7712 20.4574 19.7305 20.2211 20.2603 19.9409V16.6117C19.7452 16.8185 17.049 17.5768 17.049 15.2055V9.12925H20.2603V5.54293H17.049L17.0637 1.63398ZM5.34588 9.86838C5.34588 9.23284 5.87339 8.99625 6.74445 8.99625C8.04075 8.99625 9.67319 9.39442 10.9695 10.0888V6.42153C9.55519 5.84604 8.15561 5.57674 6.74445 5.57674C2.90782 5.57674 0.392578 7.55421 0.392578 10.7364C0.392578 15.8072 7.46765 15.0489 7.46765 17.2493C7.46765 18.0076 6.81152 18.2442 5.89633 18.2442C4.47203 18.2442 2.67843 17.6834 1.23942 16.9038V20.6299C2.83246 21.3096 4.44022 21.5936 5.89633 21.5936C9.83222 21.5936 12.5022 19.6749 12.5022 16.4636C12.4874 10.9916 5.34588 11.9012 5.34588 9.86838Z"
        fill="#635BFF"
      />
    </svg>
  );
}

function WooLogo({ className = "" }) {
  return (
    <svg
      viewBox="0 0 95 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12.0825 24.9194C14.8471 24.9194 17.0657 23.5541 18.7381 20.414L22.4584 13.4512V19.3559C22.4584 22.8373 24.7111 24.9194 28.1925 24.9194C30.923 24.9194 32.9368 23.7248 34.8822 20.414L43.4492 5.94232C45.3264 2.7681 43.9953 0.378906 39.8654 0.378906C37.6469 0.378906 36.2134 1.09566 34.9164 3.51899L29.0117 14.6117V4.74772C29.0117 1.81242 27.6123 0.378906 25.0183 0.378906C22.9704 0.378906 21.3321 1.26632 20.0692 3.72378L14.5058 14.6117V4.85011C14.5058 1.71003 13.2088 0.378906 10.0687 0.378906H3.65205C1.22873 0.378906 0 1.50524 0 3.58725C0 5.66927 1.29699 6.86386 3.65205 6.86386H6.28017V19.3218C6.28017 22.8373 8.63523 24.9194 12.0825 24.9194Z"
        fill="#7F54B3"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M55.9772 0.378906C48.9803 0.378906 43.6217 5.601 43.6217 12.6662C43.6217 19.7314 49.0144 24.9194 55.9772 24.9194C62.94 24.9194 68.2645 19.6973 68.2986 12.6662C68.2986 5.601 62.94 0.378906 55.9772 0.378906ZM55.9772 17.3763C53.3491 17.3763 51.5401 15.3967 51.5401 12.6662C51.5401 9.93569 53.3491 7.92194 55.9772 7.92194C58.6053 7.92194 60.4143 9.93569 60.4143 12.6662C60.4143 15.3967 58.6395 17.3763 55.9772 17.3763Z"
        fill="#7F54B3"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M70.0369 12.6662C70.0369 5.601 75.3955 0.378906 82.3583 0.378906C89.3211 0.378906 94.6797 5.63514 94.6797 12.6662C94.6797 19.6973 89.3211 24.9194 82.3583 24.9194C75.3955 24.9194 70.0369 19.7314 70.0369 12.6662ZM77.9554 12.6662C77.9554 15.3967 79.6961 17.3763 82.3583 17.3763C84.9864 17.3763 86.7954 15.3967 86.7954 12.6662C86.7954 9.93569 84.9864 7.92194 82.3583 7.92194C79.7302 7.92194 77.9554 9.93569 77.9554 12.6662Z"
        fill="#7F54B3"
      />
    </svg>
  );
}

export function SetupTicketCheckoutStep() {
  const wooActive = !!window?.eventkoi_params?.woocommerce_active;
  const { settings, setSettings } = useSettings();
  const savedMethod = settings?.ticket_checkout_method;
  const [picked, setPicked] = useState(null);
  const method = picked ?? (savedMethod !== "stripe" ? savedMethod : null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const configRef = useRef(null);
  const pollRef = useRef(null);
  const { data: account, loading: accountLoading, refetch } = useStripeAccount();

  const isStripeConnected = account?.connected === true;

  useEffect(() => {
    fetchPluginConfig().then((config) => {
      configRef.current = config;
    });
  }, []);

  // Stop polling once connected.
  useEffect(() => {
    if (isStripeConnected && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      setIsPolling(false);
      setIsConnecting(false);
    }
  }, [isStripeConnected]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleChange = async (value) => {
    if (value === method || isSaving) return;

    setPicked(value);
    setSettings((prev) => ({
      ...prev,
      ticket_checkout_method: value,
    }));

    try {
      setIsSaving(true);
      const response = await apiRequest({
        path: `${eventkoi_params.api}/settings`,
        method: "post",
        data: { ticket_checkout_method: value },
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });
      if (response?.settings) {
        setSettings(response.settings);
      }
      showToast({
        ...response,
        message: __("Payment method updated.", "eventkoi"),
      });
    } catch (error) {
      showToastError(
        error?.message ?? __("Failed to update payment method.", "eventkoi")
      );
      setPicked(method);
      setSettings((prev) => ({
        ...prev,
        ticket_checkout_method: method || "stripe",
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStripeConnect = async () => {
    try {
      setIsConnecting(true);
      const config = configRef.current;
      if (!config) throw new Error("Missing config");

      const stripeClientId = config.stripe_client_id;
      const supabaseEdgeUrl = config.supabase_edge;

      const { success, data } = await apiRequest({
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

      const stripeTab = window.open(connectUrl, "_blank");

      // Poll for connection status every 3 seconds.
      // Stop when connected OR when the user closes the Stripe tab without connecting.
      setIsPolling(true);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        const tabClosed = !stripeTab || stripeTab.closed;

        if (tabClosed) {
          // Tab was closed — do one final check, then stop polling.
          await refetch();
          clearInterval(pollRef.current);
          pollRef.current = null;
          setIsPolling(false);
          setIsConnecting(false);
          return;
        }

        refetch();
      }, 3000);
    } catch (err) {
      console.error("Error building Stripe Connect URL:", err);
      showToastError(__("Could not initiate Stripe Connect.", "eventkoi"));
      setIsConnecting(false);
    }
  };

  const isSelected = (value) => method === value;

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h3 className="font-medium text-[24px] leading-7 text-black m-0">
          {__("Setup ticket payments", "eventkoi")}
        </h3>
        <div className="text-muted-foreground leading-5 text-[14px]">
          {__(
            "Choose how attendees pay for event tickets.",
            "eventkoi"
          )}
        </div>
      </div>

      <div className="grid gap-3">
        {/* Stripe card */}
        <button
          type="button"
          disabled={isSaving}
          onClick={() => handleChange("stripe")}
          className={cn(
            "flex items-start gap-4 p-4 bg-white border border-solid rounded-xl transition-all text-left w-full shadow-none outline-none",
            isSelected("stripe")
              ? "border-[#161616] shadow-[inset_0_0_0_1px_#161616]"
              : "border-[#e5e5e5] hover:border-[#c0c0c0] cursor-pointer"
          )}
        >
          <div className="flex-shrink-0 mt-0.5 w-5 h-5">
            {isSelected("stripe") ? (
              <CircleCheck className="w-5 h-5 text-[#161616]" aria-hidden="true" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <StripeLogo className="h-[18px] w-auto" />
            </div>
            <p className="text-[13px] text-muted-foreground m-0 leading-5">
              {__("Accept credit cards, Apple Pay, and Google Pay directly on your event pages.", "eventkoi")}
            </p>
          </div>
        </button>

        {/* Stripe connect section — shown when Stripe is selected */}
        {isSelected("stripe") && (
          <div className="ml-9 rounded-lg border border-border bg-[#fafafa] px-4 py-3">
            {accountLoading || isPolling ? (
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                {isPolling
                  ? __("Complete the setup in the Stripe tab, then return here…", "eventkoi")
                  : __("Checking connection…", "eventkoi")}
              </div>
            ) : isStripeConnected ? (
              <div className="flex items-center gap-2 text-[13px] text-green-700">
                <CircleCheck className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="font-medium">
                  {__("Stripe account connected", "eventkoi")}
                </span>
                {account?.email && (
                  <span className="text-muted-foreground font-normal">
                    ({account.email})
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-muted-foreground">
                  {__("Connect your Stripe account to start accepting payments.", "eventkoi")}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStripeConnect();
                  }}
                  disabled={isConnecting}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors flex-shrink-0",
                    "bg-[#635BFF] text-white hover:bg-[#5851ea] border-none cursor-pointer",
                    isConnecting && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {isConnecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {isConnecting
                    ? __("Connecting…", "eventkoi")
                    : __("Connect with Stripe", "eventkoi")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* WooCommerce card */}
        <button
          type="button"
          disabled={!wooActive || isSaving}
          onClick={() => handleChange("woocommerce")}
          className={cn(
            "flex items-start gap-4 p-4 bg-white border border-solid rounded-xl transition-all text-left w-full shadow-none outline-none",
            isSelected("woocommerce")
              ? "border-[#161616] shadow-[inset_0_0_0_1px_#161616]"
              : !wooActive
                ? "border-[#e5e5e5] opacity-50 cursor-not-allowed"
                : "border-[#e5e5e5] hover:border-[#c0c0c0] cursor-pointer"
          )}
        >
          <div className="flex-shrink-0 mt-0.5 w-5 h-5">
            {isSelected("woocommerce") ? (
              <CircleCheck className="w-5 h-5 text-[#161616]" aria-hidden="true" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <WooLogo className="h-[18px] w-auto" />
            </div>
            <p className="text-[13px] text-muted-foreground m-0 leading-5">
              {wooActive
                ? __("Use any payment gateway configured in WooCommerce — PayPal, bank transfer, COD, and more.", "eventkoi")
                : __("Activate the WooCommerce plugin in order to select this option.", "eventkoi")}
            </p>
          </div>
        </button>
      </div>

    </div>
  );
}
