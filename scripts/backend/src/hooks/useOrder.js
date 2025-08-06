// hooks/useOrder.js
import { callEdgeFunction } from "@/lib/remote";
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
        const response = await callEdgeFunction("get-order", {
          method: "POST",
          body: JSON.stringify({ id }),
        });
        setOrder(response);
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
