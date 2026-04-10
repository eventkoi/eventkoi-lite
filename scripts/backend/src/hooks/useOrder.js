import { callLocalApi } from "@/lib/remote";
import { normalizeOrder } from "@/lib/orders";
import { useEffect, useState } from "react";

export function useOrder(id) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      setError(null);
      try {
        const orders = await callLocalApi("tickets/all-orders");
        const match = Array.isArray(orders)
          ? orders.find((o) => o.id === id || o.order_id === id)
          : null;
        if (match) {
          setOrder(normalizeOrder(match));
        } else {
          setError("Order not found");
          setOrder(null);
        }
      } catch (err) {
        console.error("Failed to fetch order:", err);
        setError("Order not found");
        setOrder(null);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchOrder();
    }
  }, [id]);

  return { order, setOrder, loading, setLoading, error };
}
