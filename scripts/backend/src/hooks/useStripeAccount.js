import { callEdgeFunction } from "@/lib/remote";
import { useEffect, useState } from "react";

// Shared cache (per session/tab)
let cachedAccount = null;
let cachedPromise = null;

export function useStripeAccount() {
  const [data, setData] = useState(cachedAccount);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!cachedAccount);

  useEffect(() => {
    if (cachedAccount) return;

    if (!cachedPromise) {
      cachedPromise = callEdgeFunction("get-account")
        .then((res) => {
          cachedAccount = res;
          return res;
        })
        .catch((err) => {
          cachedPromise = null;
          throw err;
        });
    }

    cachedPromise
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}
