// components/order/OrderSummary.jsx
import { formatCurrency } from "@/lib/utils";
import { __, sprintf } from "@wordpress/i18n";

export function OrderSummary({ order }) {
  const normalizedStatus = String(order?.status || "").trim().toLowerCase();
  const showPaymentBreakdown = [
    "complete",
    "completed",
    "succeeded",
    "refunded",
    "partially_refunded",
  ].includes(normalizedStatus);
  const stripContextSuffix = (rawName) => {
    const name = String(rawName || "").trim();
    if (!name) return "";
    const contexts = [
      String(order?.event_instance_title || "").trim(),
      String(order?.event_title || "").trim(),
      String(order?.metadata?.event_instance_title || "").trim(),
      String(order?.metadata?.event_title || "").trim(),
    ].filter(Boolean);
    for (const context of contexts) {
      const suffix = ` - ${context}`;
      if (name.endsWith(suffix)) {
        return name.slice(0, -suffix.length).trim();
      }
    }
    return name;
  };
  const rawItems = Array.isArray(order?.items) ? order.items : [];
  const defaultEventTitle =
    String(
      order?.event_instance_title ||
        order?.metadata?.event_instance_title ||
        order?.event_title ||
        order?.metadata?.event_title ||
        ""
    ).trim();
  const defaultEventId = Number(
    order?.event_id || order?.metadata?.event_id || 0
  );
  const normalizedItems = rawItems.map((item, index) => {
    const ticketId = Number(item?.ticket_id || 0) || 0;
    const quantity = Number(item?.quantity || 0) || 0;
    const unitAmount = Number(item?.price || item?.unit_amount || 0) || 0;
    const fallbackName =
      ticketId > 0
        ? sprintf(
            /* translators: %d: ticket id */
            __("Ticket #%d", "eventkoi"),
            ticketId
          )
        : sprintf(
            /* translators: %d: line item number */
            __("Ticket line %d", "eventkoi"),
            index + 1
          );
    const rawName = item?.ticket_name || item?.name || "";
    const cleanedName = stripContextSuffix(rawName);
    const rawDescription = item?.ticket_description || item?.description || "";
    const eventTitle = String(
      item?.event_instance_title ||
        item?.event_title ||
        defaultEventTitle
    ).trim();
    const eventId = Number(item?.event_id || defaultEventId || 0);
    return {
      key: String(item?.id || `${ticketId}-${index}`),
      ticketId,
      quantity,
      unitAmount,
      amount: unitAmount * quantity,
      name: cleanedName || fallbackName,
      description: String(rawDescription || "").trim(),
      eventTitle,
      eventId,
    };
  });
  const summaryItems =
    normalizedItems.length > 0
      ? normalizedItems
      : [
          {
            key: "fallback-single-line",
            ticketId: Number(order?.ticket_id || 0) || 0,
            quantity: Number(order?.quantity || 0) || 0,
            unitAmount: Number(order?.item_price || 0) || 0,
            amount: Number(order?.amount_total || order?.total_amount || 0) || 0,
            name:
              stripContextSuffix(order?.ticket_name || "") ||
              (Number(order?.ticket_id || 0) > 0
                ? sprintf(
                    /* translators: %d: ticket id */
                    __("Ticket #%d", "eventkoi"),
                    Number(order?.ticket_id || 0)
                  )
                : __("Ticket", "eventkoi")),
            description: String(order?.ticket_description || "").trim(),
            eventTitle: defaultEventTitle,
            eventId: defaultEventId,
          },
        ];

  const totalAmountCents = Number(order?.amount_total ?? order?.total_amount ?? 0) || 0;
  const refundAmountCents = Number(order?.refund_amount ?? 0) || 0;
  const platformFeeCents =
    Number(
      order?.platform_fee_amount ??
        order?.platform_fee_cents ??
        order?.metadata?.platform_fee_cents ??
        0
    ) || 0;
  const stripeFeeCents =
    Number(
      order?.stripe_fee_amount ??
        order?.stripe_fee_cents ??
        order?.metadata?.stripe_fee_cents ??
        0
    ) || 0;
  const netAmountCents = totalAmountCents - refundAmountCents - stripeFeeCents;
  const payoutAfterPlatformFeeCents = netAmountCents - platformFeeCents;
  const formatCurrencyExact = (amount, currency) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: String(currency || "USD"),
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format((Number(amount || 0) || 0) / 100);
    } catch {
      return formatCurrency(amount, currency);
    }
  };
  const formatCurrencyWithCode = (amount, currency) => {
    const code = String(currency || "USD").toUpperCase();
    return `${formatCurrencyExact(amount, currency)} ${code}`;
  };
  const formatDeductionCurrencyWithCode = (amount, currency) => {
    const code = String(currency || "USD").toUpperCase();
    const absolute = Math.abs(Number(amount || 0));
    return `- ${formatCurrencyExact(absolute, currency)} ${code}`;
  };
  const formatSignedCurrencyWithCode = (amount, currency) => {
    const code = String(currency || "USD").toUpperCase();
    const numeric = Number(amount || 0);
    const absolute = Math.abs(numeric);
    const formatted = `${formatCurrencyExact(absolute, currency)} ${code}`;
    return numeric < 0 ? `- ${formatted}` : formatted;
  };

  return (
    <div className="rounded-xl border bg-white p-6">
      <h3 className="text-lg font-medium mb-4">
        {__("Order summary", "eventkoi")}
      </h3>
      <div role="row" aria-hidden="true" className="grid grid-cols-[3fr_1fr_1fr_1fr] py-3 text-xs font-medium text-muted-foreground border-b">
        <div>{__("Ticket", "eventkoi")}</div>
        <div className="text-center">{__("Price", "eventkoi")}</div>
        <div className="text-center">{__("Quantity", "eventkoi")}</div>
        <div className="text-right">{__("Amount", "eventkoi")}</div>
      </div>
      {summaryItems.map((item, index) => (
        <div
          key={item.key}
          className={`grid grid-cols-[3fr_1fr_1fr_1fr] py-5 text-sm ${
            index === summaryItems.length - 1 ? "border-b" : "border-b border-border/60"
          }`}
        >
          <div>
            <div className="font-medium text-foreground">{item.name}</div>
            {item.description ? (
              <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
            ) : null}
            {item.eventTitle ? (
              item.eventId > 0 ? (
                <a
                  href={`#/events/${item.eventId}/main`}
                  className="mt-1 inline-block text-sm text-foreground underline underline-offset-2 hover:no-underline"
                >
                  {item.eventTitle}
                </a>
              ) : (
                <div className="mt-1 text-sm text-foreground">{item.eventTitle}</div>
              )
            ) : null}
          </div>
          <div className="text-center">
            {formatCurrency(item.unitAmount, order.currency)}
          </div>
          <div className="text-center">{item.quantity}</div>
          <div className="text-right">
            {formatCurrency(item.amount, order.currency)}
          </div>
        </div>
      ))}
      <div className="flex justify-end pt-4 text-sm font-medium">
        <span>{__("Total", "eventkoi")}</span>
        <span className="ml-2">
          {formatCurrency(totalAmountCents, order.currency)}
        </span>
      </div>
      {showPaymentBreakdown ? (
        <div className="mt-3 border-t pt-3 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {__("Payment amount", "eventkoi")}
            </span>
            <span className="text-foreground">
              {formatCurrencyWithCode(totalAmountCents, order.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {__("Stripe fee", "eventkoi")}
            </span>
            <span className="text-foreground">
              {formatDeductionCurrencyWithCode(stripeFeeCents, order.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {__("Platform fee", "eventkoi")}
            </span>
            <span className="text-foreground">
              {formatDeductionCurrencyWithCode(platformFeeCents, order.currency)}
            </span>
          </div>
          {refundAmountCents > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{__("Refunds", "eventkoi")}</span>
              <span className="text-foreground">
                {formatDeductionCurrencyWithCode(refundAmountCents, order.currency)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t pt-3 mt-2 font-medium">
            <span>{__("Net amount", "eventkoi")}</span>
            <span>{formatSignedCurrencyWithCode(netAmountCents, order.currency)}</span>
          </div>
          <div className="flex items-center justify-between pt-1 font-medium">
            <span>{__("Net amount after platform fee", "eventkoi")}</span>
            <span>
              {formatSignedCurrencyWithCode(
                payoutAfterPlatformFeeCents,
                order.currency
              )}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
