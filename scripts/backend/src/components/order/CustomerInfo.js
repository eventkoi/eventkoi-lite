// components/order/CustomerInfo.jsx
import { formatAnswer } from "@/components/order/AnswerInput";
import { CustomerEditDialog } from "@/components/order/CustomerEditDialog";
import { Button } from "@/components/ui/button";
import { getCountryName } from "@/lib/utils";
import { __ } from "@wordpress/i18n";
import { Mail } from "lucide-react";
import { useState } from "react";

export function CustomerInfo({ order, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const wpUserId = Number(order?.wp_user_id || 0) || 0;
  const wpUserLabel = String(order?.wp_user_label || "").trim();
  const displayCustomerName = String(
    order?.ticket_holder_name || order?.customer_name || ""
  ).trim();

  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-base font-medium m-0">
          {__("Customer", "eventkoi-lite")}
        </h3>
        {onUpdated && !order?.is_archived && (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 font-normal"
            onClick={() => setEditing(true)}
          >
            {__("Edit", "eventkoi-lite")}
          </Button>
        )}
      </div>
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("Name", "eventkoi-lite")}
          </span>
          <span className="text-foreground font-medium">
            {displayCustomerName || ""}
          </span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("Email", "eventkoi-lite")}
          </span>
          {order.customer_email && (
            <a
              href={`mailto:${order.customer_email}`}
              title={order.customer_email}
              className="flex items-center gap-2 text-foreground underline max-w-full overflow-hidden whitespace-nowrap truncate"
            >
              <span className="truncate">{order.customer_email}</span>
              <Mail aria-hidden="true" className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </a>
          )}
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("Billing address", "eventkoi-lite")}
          </span>
          {order.customer_address ? (
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
          ) : (
            <span className="text-foreground"></span>
          )}
        </div>
        {(order.checkout_fields || []).map((field) => (
          <div key={field.key} className="grid grid-cols-[auto_1fr] gap-2">
            <span className="text-muted-foreground w-32 truncate" title={field.label}>
              {field.label}
            </span>
            <span className="text-foreground break-words">
              {formatAnswer(field.value)}
            </span>
          </div>
        ))}
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("WP user", "eventkoi-lite")}
          </span>
          {wpUserId > 0 ? (
            <a
              href={`user-edit.php?user_id=${wpUserId}`}
              className="text-foreground underline hover:decoration-dotted underline-offset-4"
            >
              {wpUserLabel || `User #${wpUserId}`}
            </a>
          ) : (
            <span className="text-foreground"></span>
          )}
        </div>
      </div>
      {onUpdated && (
        <CustomerEditDialog
          order={order}
          open={editing}
          onOpenChange={setEditing}
          onSaved={onUpdated}
        />
      )}
    </div>
  );
}
