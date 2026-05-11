import { NotFound } from "@/components/empty-state/NotFound";
import { CopyableOrderId } from "@/components/order/CopyableOrderId";
import { CustomerInfo } from "@/components/order/CustomerInfo";
import { OrderHeader } from "@/components/order/order-header";
import { OrderActivity } from "@/components/order/OrderActivity";
import { OrderSkeleton } from "@/components/order/OrderSkeleton";
import { OrderStatus } from "@/components/order/OrderStatus";
import { OrderSummary } from "@/components/order/OrderSummary";
import { PaymentMethod } from "@/components/order/PaymentMethod";
import { Badge } from "@/components/ui/badge";
import { Wrapper } from "@/components/wrapper";
import { useOrder } from "@/hooks/useOrder";
import { formatWPtime } from "@/lib/date-utils";
import { callLocalApi } from "@/lib/remote";
import { normalizeOrder } from "@/lib/orders";
import { __, sprintf } from "@wordpress/i18n";
import { useState } from "react";
import { useParams } from "react-router-dom";

export function OrderView() {
  const { id } = useParams();
  const { order, setOrder, loading, setLoading, error } = useOrder(id);
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const headerTitle = __("Order", "eventkoi-lite");

  const lastUpdated = order?.last_modified
    ? formatWPtime(order.last_modified).replace(/\n/g, " ")
    : "";

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setSubmittingNote(true);

    try {
      await callLocalApi("add_order_note", {
        method: "POST",
        data: {
          order_id: order.id,
          note_key: "admin_note",
          note_value: newNote,
        },
      });

      const orders = await callLocalApi("tickets/all-orders");
      const match = Array.isArray(orders)
        ? orders.find((o) => o.id === order.id || o.order_id === order.id)
        : null;
      if (match) {
        setOrder(normalizeOrder(match));
      }
      setNewNote("");
    } catch (err) {
      console.error("Failed to submit note:", err);
    } finally {
      setSubmittingNote(false);
    }
  }

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
              {headerTitle}
              <CopyableOrderId id={order.id} />
              <OrderStatus order={order} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {sprintf(
              /* translators: %s: human-readable last updated datetime */
              __("Last updated on %s", "eventkoi-lite"),
              lastUpdated
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          <div className="md:col-span-2 space-y-6">
            <OrderSummary order={order} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CustomerInfo order={order} />
              <PaymentMethod order={order} />
            </div>
          </div>

          <div className="flex flex-col h-full">
            <OrderActivity
              order={order}
              newNote={newNote}
              setNewNote={setNewNote}
              handleAddNote={handleAddNote}
              submittingNote={submittingNote}
            />
          </div>
        </div>
      </Wrapper>
    </>
  );
}
