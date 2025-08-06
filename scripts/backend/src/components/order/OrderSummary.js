// components/order/OrderSummary.jsx
import { formatCurrency } from "@/lib/utils";
import { __ } from "@wordpress/i18n";

export function OrderSummary({ order }) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h3 className="text-lg font-medium mb-4">
        {__("Order summary", "eventkoi")}
      </h3>
      <div className="grid grid-cols-[3fr_1fr_1fr_1fr] text-xs font-medium uppercase text-muted-foreground border-b pb-2">
        <div>{__("Ticket", "eventkoi")}</div>
        <div className="text-center">{__("Price", "eventkoi")}</div>
        <div className="text-center">{__("Quantity", "eventkoi")}</div>
        <div className="text-right">{__("Amount", "eventkoi")}</div>
      </div>
      <div className="grid grid-cols-[3fr_1fr_1fr_1fr] py-5 text-sm border-b">
        <div>{order.ticket_id == 0 && "Test ticket"}</div>
        <div className="text-center">
          {formatCurrency(order.item_price, order.currency)}
        </div>
        <div className="text-center">{order?.quantity}</div>
        <div className="text-right">
          {formatCurrency(order.amount_total, order.currency)}
        </div>
      </div>
      <div className="flex justify-end pt-4 text-sm font-medium">
        <span>{__("Total", "eventkoi")}</span>
        <span className="ml-2">
          {formatCurrency(order.amount_total, order.currency)}
        </span>
      </div>
    </div>
  );
}
