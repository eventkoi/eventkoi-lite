// components/order/PaymentMethod.jsx
import { getCountryName } from "@/lib/utils";
import { __ } from "@wordpress/i18n";
import { SquareArrowOutUpRight } from "lucide-react";

export function PaymentMethod({ order }) {
  const getPaymentDisplay = () => {
    const type = order.payment_method_type;
    const brand = order.payment_brand;
    const last4 = order.payment_last4;

    if (!type) return "";

    if (type === "card" && brand && last4) {
      return `${brand.charAt(0).toUpperCase() + brand.slice(1)} ${__(
        "ending in",
        "eventkoi"
      )} ${last4}`;
    }

    if (brand && last4) {
      return `${type} (${brand.toUpperCase()} ••••${last4})`;
    }

    return type;
  };

  return (
    <div className="rounded-xl border bg-white p-6">
      <h3 className="text-base font-medium mb-4">
        {__("Payment method", "eventkoi")}
      </h3>
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("Payment ID", "eventkoi")}
          </span>
          {order.stripe_payment_intent_id && (
            <a
              href={`https://dashboard.stripe.com/${
                order.is_test ? "test/" : ""
              }payments/${order.stripe_payment_intent_id}`}
              className="inline-flex items-center gap-1 underline text-foreground max-w-full overflow-hidden whitespace-nowrap truncate"
              title={order.stripe_payment_intent_id}
              target="_blank"
              rel="noreferrer"
            >
              <span className="truncate">{order.stripe_payment_intent_id}</span>
              <SquareArrowOutUpRight className="w-4 h-4 flex-shrink-0" />
            </a>
          )}
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("Type", "eventkoi")}
          </span>
          <span className="text-foreground">{getPaymentDisplay()}</span>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("Origin", "eventkoi")}
          </span>
          <span className="text-foreground">
            {order.stripe_payment_intent_id
              ? getCountryName(order?.payment_country)
              : ""}
          </span>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("IP address", "eventkoi")}
          </span>
          <span className="text-foreground">{order?.ip_address ?? ""}</span>
        </div>
      </div>
    </div>
  );
}
