import { NotFound } from "@/components/empty-state/NotFound";
import { CopyableOrderId } from "@/components/order/CopyableOrderId";
import { OrderHeader } from "@/components/order/order-header";
import { OrderSkeleton } from "@/components/order/OrderSkeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrapper } from "@/components/wrapper";
import { useOrder } from "@/hooks/useOrder";
import { formatCurrency } from "@/lib/utils";
import { showStaticToast, showToastError } from "@/lib/toast";
import { __, sprintf } from "@wordpress/i18n";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { callLocalApi } from "@/lib/remote";
import { normalizeOrder } from "@/lib/orders";

function normalizeLineItems(order) {
  const eventTitleRaw = String(
    order?.event_instance_title ||
      order?.event_title ||
      order?.metadata?.event_instance_title ||
      order?.metadata?.event_title ||
      ""
  ).trim();

  const stripDuplicatedEventTitle = (name) => {
    const ticketName = String(name || "").trim();
    if (!ticketName || !eventTitleRaw) return ticketName;

    const suffix = ` - ${eventTitleRaw}`;
    if (
      ticketName.toLowerCase().endsWith(suffix.toLowerCase()) &&
      ticketName.length > suffix.length
    ) {
      return ticketName.slice(0, -suffix.length).trim();
    }

    return ticketName;
  };

  const rawItems = Array.isArray(order?.items) ? order.items : [];

  const normalized = rawItems.map((item, index) => {
    const ticketId = Number(item?.ticket_id || 0) || 0;
    const quantity = Math.max(0, Number(item?.quantity || 0) || 0);
    const unitAmount = Number(item?.price || item?.unit_amount || 0) || 0;
    const name =
      String(item?.ticket_name || item?.name || "").trim() ||
      (ticketId > 0
        ? sprintf(
            /* translators: %d: ticket id */
            __("Ticket #%d", "eventkoi-lite"),
            ticketId
          )
        : sprintf(
            /* translators: %d: line item number */
            __("Ticket line %d", "eventkoi-lite"),
            index + 1
          ));

    return {
      id: String(item?.id || `${ticketId}-${index}`),
      ticket_id: ticketId,
      name: stripDuplicatedEventTitle(name),
      description: String(item?.ticket_description || item?.description || "").trim(),
      unitAmount,
      quantity,
    };
  });

  if (normalized.length > 0) {
    return normalized;
  }

  const fallbackQty = Math.max(0, Number(order?.quantity || 0) || 0);
  const fallbackUnit = Number(order?.item_price || 0) || 0;
  if (fallbackQty > 0 || fallbackUnit > 0) {
    return [
      {
        id: "fallback",
        ticket_id: Number(order?.ticket_id || 0) || 0,
        name:
          stripDuplicatedEventTitle(String(order?.ticket_name || "").trim()) ||
          __("Ticket", "eventkoi-lite"),
        description: String(order?.ticket_description || "").trim(),
        unitAmount: fallbackUnit,
        quantity: fallbackQty,
      },
    ];
  }

  return [];
}

export function OrderRefundView() {
  const { id } = useParams();
  const { order, setOrder, loading, setLoading, error } = useOrder(id);
  const items = useMemo(() => normalizeLineItems(order), [order]);
  const [selectedById, setSelectedById] = useState({});
  const [refundQtyById, setRefundQtyById] = useState({});
  const [restockTickets, setRestockTickets] = useState(false);
  const [sendConfirmation, setSendConfirmation] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const initializedSelection = useMemo(() => {
    const state = {};
    items.forEach((item) => {
      state[item.id] = true;
    });
    return state;
  }, [items]);

  const initializedQty = useMemo(() => {
    const state = {};
    items.forEach((item) => {
      state[item.id] = item.quantity;
    });
    return state;
  }, [items]);

  const selectedState =
    Object.keys(selectedById).length > 0 ? selectedById : initializedSelection;
  const qtyState = Object.keys(refundQtyById).length > 0 ? refundQtyById : initializedQty;

  const selectedItems = items.filter((item) => selectedState[item.id]);

  const totalRefundCents = selectedItems.reduce((sum, item) => {
    const raw = Number(qtyState[item.id] ?? item.quantity) || 0;
    const qty = Math.max(0, Math.min(item.quantity, Math.floor(raw)));
    return sum + qty * item.unitAmount;
  }, 0);

  const availableRefundCents = Number(order?.amount_total || order?.total_amount || 0) || 0;
  const paymentIntentId = order?.stripe_payment_intent_id || "";

  const eventTitle = String(
    order?.event_instance_title ||
      order?.event_title ||
      order?.metadata?.event_instance_title ||
      order?.metadata?.event_title ||
      ""
  ).trim();
  const eventId = Number(
    order?.event_id ||
      (Array.isArray(order?.event_ids) ? order.event_ids[0] : 0) ||
      order?.metadata?.event_id ||
      0
  );
  const eventLink = eventId > 0 ? `/events/${eventId}/main` : "";

  const updateSelected = (itemId, checked) => {
    setSelectedById((prev) => ({ ...prev, [itemId]: !!checked }));
  };

  const updateRefundQty = (itemId, max, next) => {
    const parsed = Number.parseInt(String(next), 10);
    const safe = Number.isFinite(parsed) ? parsed : 0;
    const clamped = Math.max(0, Math.min(max, safe));
    setRefundQtyById((prev) => ({ ...prev, [itemId]: clamped }));
  };

  const handleRefund = () => {
    if (!selectedItems.length) {
      showToastError(__("Select at least one line item to refund.", "eventkoi-lite"));
      return;
    }

    if (totalRefundCents <= 0) {
      showToastError(__("Refund amount must be greater than zero.", "eventkoi-lite"));
      return;
    }

    setConfirmOpen(true);
  };

  const confirmRefund = async () => {
    if (!selectedItems.length || totalRefundCents <= 0) return;
    if (submitting) return;

    try {
      setSubmitting(true);
      setConfirmOpen(false);
      const payloadItems = selectedItems
        .map((item) => {
          const qtyRaw = Number(qtyState[item.id] ?? item.quantity) || 0;
          const qty = Math.max(0, Math.min(item.quantity, Math.floor(qtyRaw)));
          const ticketId = Number(item?.ticket_id || item?.id || 0) || 0;
          return {
            ticket_id: ticketId,
            quantity: qty,
          };
        })
        .filter((row) => row.ticket_id > 0 && row.quantity > 0);

      if (!payloadItems.length) {
        showToastError(__("No valid ticket lines selected for refund.", "eventkoi-lite"));
        return;
      }

      const currentUser = window.eventkoi_params?.current_user || {};

      await callLocalApi("tickets/orders/refund", {
        method: "POST",
        data: {
          order_id: order?.id || id,
          items: payloadItems,
          restock_tickets: restockTickets,
          send_confirmation: sendConfirmation,
          note: note || "",
          refunded_by: {
            wp_user_id: currentUser.id || 0,
            wp_user_name: currentUser.display_name || "",
          },
        },
      });

      if (sendConfirmation) {
        const refundAmountMajor = totalRefundCents / 100;
        const refundItemsWithNames = payloadItems.map((pi) => {
          const match = items.find(
            (it) => Number(it.ticket_id) === pi.ticket_id
          );
          return {
            ...pi,
            ticket_name: match?.name || "",
          };
        });

        try {
          await callLocalApi("tickets/orders/send-refund-confirmation", {
            method: "POST",
            data: {
              order_id: order?.id || id,
              refund_amount: refundAmountMajor,
              refund_items: refundItemsWithNames,
            },
          });
        } catch (emailErr) {
          console.error("Refund email failed:", emailErr);
        }
      }

      const orders = await callLocalApi("tickets/all-orders");
      const match = Array.isArray(orders)
        ? orders.find((o) => o.id === (order?.id || id) || o.order_id === (order?.id || id))
        : null;
      setOrder(match ? normalizeOrder(match) : order);
      showStaticToast(__("Refund completed successfully.", "eventkoi-lite"));
    } catch (err) {
      console.error("Refund failed:", err);
      const raw =
        (err && err.body) ||
        (err && err.message) ||
        __("Failed to process refund.", "eventkoi-lite");
      let message = __("Failed to process refund.", "eventkoi-lite");
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error) {
          message = parsed.error;
        } else if (parsed?.message) {
          message = parsed.message;
        }
      } catch {
        message = String(raw || message);
      }
      showToastError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <OrderHeader
          loading={true}
          setLoading={setLoading}
          order={order}
          setOrder={setOrder}
        />
        <OrderSkeleton />
      </>
    );
  }

  if (!order && error) {
    return <NotFound type="order" />;
  }

  return (
    <>
      <OrderHeader
        loading={loading}
        setLoading={setLoading}
        order={order}
        setOrder={setOrder}
      />

      <Wrapper>
        <div className="mb-6">
          <div className="flex items-center gap-2 text-2xl font-medium">
            {order?.is_test && (
              <Badge
                variant="outline"
                className="border-warning/80 text-foreground bg-warning/10"
              >
                {__("Test", "eventkoi-lite")}
              </Badge>
            )}
            <div className="flex items-center gap-4 text-2xl font-medium">
              {__("Refund order", "eventkoi-lite")}
              <CopyableOrderId id={order?.id || id} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          <div className="md:col-span-2 rounded-2xl border bg-white shadow-sm">
            <div className="px-5 py-5">
              <h2 className="text-lg font-medium text-foreground">
                {__("Select order to refund", "eventkoi-lite")}
              </h2>
            </div>

            <div>
              <div className="grid grid-cols-[3fr_1fr_1fr_1fr] px-5 py-3 text-xs font-medium text-muted-foreground">
                <div>{__("Ticket", "eventkoi-lite")}</div>
                <div className="text-center">{__("Price", "eventkoi-lite")}</div>
                <div className="text-center">{__("Quantity", "eventkoi-lite")}</div>
                <div className="text-right">{__("Refund amount", "eventkoi-lite")}</div>
              </div>

              {items.map((item) => {
                const maxQty = item.quantity;
                const qty = Math.max(
                  0,
                  Math.min(maxQty, Number(qtyState[item.id] ?? maxQty) || 0)
                );
                const checked = !!selectedState[item.id];
                const lineAmount = qty * item.unitAmount;

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[3fr_1fr_1fr_1fr] px-5 py-3 border-t items-center"
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => updateSelected(item.id, next)}
                        className="mt-0.5"
                        aria-label={sprintf(
                          /* translators: %s: ticket name */
                          __("Select %s for refund", "eventkoi-lite"),
                          item.name
                        )}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{item.name}</div>
                        {eventTitle && eventLink ? (
                          <div className="text-sm">
                            <Link
                              to={eventLink}
                              className="text-foreground underline underline-offset-2"
                            >
                              {eventTitle}
                            </Link>
                          </div>
                        ) : eventTitle ? (
                          <div className="text-sm text-foreground">{eventTitle}</div>
                        ) : null}
                        {item.description ? (
                          <div className="text-sm text-foreground underline">
                            {item.description}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-center text-sm text-foreground">
                      {formatCurrency(item.unitAmount, order?.currency || "usd")}
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={maxQty}
                        value={qty}
                        onChange={(e) => updateRefundQty(item.id, maxQty, e.target.value)}
                        className="h-9 w-[56px] text-center"
                        aria-label={sprintf(
                          /* translators: %s: ticket name */
                          __("Refund quantity for %s", "eventkoi-lite"),
                          item.name
                        )}
                      />
                      <span className="text-sm text-muted-foreground">/{maxQty}</span>
                    </div>

                    <div className="flex justify-end">
                      <Input
                        type="text"
                        value={`${(lineAmount / 100).toFixed(2)}`}
                        readOnly
                        className="h-9 w-[56px] text-center"
                        aria-label={sprintf(
                          /* translators: %s: ticket name */
                          __("Refund amount for %s", "eventkoi-lite"),
                          item.name
                        )}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="border-t px-5 py-3 flex flex-col items-end gap-1">
                <div className="text-sm font-medium text-foreground">
                  {__("Total refunded amount", "eventkoi-lite")}{" "}
                  {`${formatCurrency(totalRefundCents, order?.currency || "usd")} ${String(
                    order?.currency || "usd"
                  ).toUpperCase()}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {sprintf(
                    /* translators: %s: max available refund amount */
                    __("Out of %s available for refund.", "eventkoi-lite"),
                    formatCurrency(availableRefundCents, order?.currency || "usd")
                  )}
                </div>
              </div>

              <div className="border-t px-5 pt-5 pb-6 space-y-4">
                <label className="flex items-center gap-3 text-sm leading-6 text-foreground">
                  <Checkbox
                    checked={restockTickets}
                    onCheckedChange={(next) => setRestockTickets(!!next)}
                  />
                  <span>
                    {__(
                      "Update total tickets available and allow tickets to be sold again.",
                      "eventkoi-lite"
                    )}
                  </span>
                </label>

                <label className="flex items-center gap-3 text-sm leading-6 text-foreground">
                  <Checkbox
                    checked={sendConfirmation}
                    onCheckedChange={(next) => setSendConfirmation(!!next)}
                  />
                  <span>
                    {__("Send ", "eventkoi-lite")}
                    <Link
                      to="/settings/emails"
                      className="underline underline-offset-2 text-foreground"
                    >
                      {__("refund confirmation", "eventkoi-lite")}
                    </Link>
                    {__(" to customer.", "eventkoi-lite")}
                  </span>
                </label>

                <div className="pt-3">
                  <Button
                    className="h-9 px-5"
                    onClick={handleRefund}
                    disabled={
                      !selectedItems.length ||
                      totalRefundCents <= 0 ||
                      !paymentIntentId ||
                      submitting
                    }
                  >
                    {submitting ? __("Processing...", "eventkoi-lite") : __("Refund", "eventkoi-lite")}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col h-full">
            <div className="rounded-2xl border bg-white p-5 h-full">
              <h3 className="text-lg font-medium text-foreground">
                {__("Order refund notes", "eventkoi-lite")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {__("Optional internal note. Customers will not see this.", "eventkoi-lite")}
              </p>
              <Textarea
                className="mt-3 min-h-[92px]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={__("Add an internal note...", "eventkoi-lite")}
                aria-label={__("Order refund notes", "eventkoi-lite")}
              />
            </div>
          </div>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          icon="refund"
          title={__("Confirm refund?", "eventkoi-lite")}
          description={__("This action will issue a refund.", "eventkoi-lite")}
          confirmLabel={submitting ? __("Processing...", "eventkoi-lite") : __("Refund", "eventkoi-lite")}
          onConfirm={confirmRefund}
          disabled={submitting}
        />
      </Wrapper>
    </>
  );
}
