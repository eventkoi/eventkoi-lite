import { NotFound } from "@/components/empty-state/NotFound";
import { CopyableOrderId } from "@/components/order/CopyableOrderId";
import { CustomerInfo } from "@/components/order/CustomerInfo";
import { OrderHeader } from "@/components/order/order-header";
import { OrderActivity } from "@/components/order/OrderActivity";
import { OrderSkeleton } from "@/components/order/OrderSkeleton";
import { OrderStatus } from "@/components/order/OrderStatus";
import { OrderSummary } from "@/components/order/OrderSummary";
import { PaymentMethod } from "@/components/order/PaymentMethod";
import { Wrapper } from "@/components/wrapper";
import { useOrder } from "@/hooks/useOrder";
import { callEdgeFunction } from "@/lib/remote";
import { formatTimezone } from "@/lib/utils";
import { __, sprintf } from "@wordpress/i18n";
import { useState } from "react";
import { useParams } from "react-router-dom";

export function OrderView() {
  const { id } = useParams();
  const { order, setOrder, loading, setLoading, error } = useOrder(id);
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  const lastUpdated = order?.last_modified
    ? formatTimezone(order.last_modified)
    : "";

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setSubmittingNote(true);

    try {
      await callEdgeFunction("add-order-note", {
        method: "POST",
        body: JSON.stringify({
          order_id: order.id,
          note_key: "admin_note",
          note_value: newNote,
        }),
      });

      const refreshed = await callEdgeFunction("get-order", {
        method: "POST",
        body: JSON.stringify({ id: order.id }),
      });

      setOrder(refreshed);
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
          <div className="flex items-center gap-4 text-2xl font-medium">
            Order
            <CopyableOrderId id={order.id} />
            <OrderStatus order={order} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {sprintf(__("Last updated on %s", "eventkoi"), lastUpdated)}
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
