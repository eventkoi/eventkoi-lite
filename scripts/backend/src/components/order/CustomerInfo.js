// components/order/CustomerInfo.jsx
import { getCountryName } from "@/lib/utils";
import { __ } from "@wordpress/i18n";
import { Mail } from "lucide-react";

export function CustomerInfo({ order }) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h3 className="text-base font-medium mb-4">
        {__("Customer", "eventkoi")}
      </h3>
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("Name", "eventkoi")}
          </span>
          <span className="text-foreground font-medium">
            {order.customer_name}
          </span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("Email", "eventkoi")}
          </span>
          {order.customer_email && (
            <a
              href={`mailto:${order.customer_email}`}
              title={order.customer_email}
              className="flex items-center gap-2 text-foreground underline max-w-full overflow-hidden whitespace-nowrap truncate"
            >
              <span className="truncate">{order.customer_email}</span>
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </a>
          )}
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("Billing address", "eventkoi")}
          </span>
          {order.customer_address && (
            <span className="text-foreground">
              {[
                order.customer_address.line1,
                order.customer_address.line2,
                order.customer_address.city,
                order.customer_address.state,
                order.customer_address.postal_code,
                getCountryName(order.customer_address.country),
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
