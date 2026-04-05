import { callEdgeFunction, registerInstance } from "@/lib/remote";
import { useEffect, useRef, useState } from "react";

// Shared cache (per session/tab)
let cachedAccount = null;
let cachedPromise = null;

export function useStripeAccount() {
  const [data, setData] = useState(cachedAccount);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!cachedAccount);
  const retriedRef = useRef(false);

  const doFetch = async () => {
    try {
      const res = await callEdgeFunction("get-account");
      cachedAccount = res;
      return res;
    } catch (err) {
      const shouldRetry =
        !retriedRef.current && (err?.status === 403 || err?.status === 404);

      if (!shouldRetry) {
        throw err;
      }

      retriedRef.current = true;
      await registerInstance();
      const res = await callEdgeFunction("get-account");
      cachedAccount = res;
      return res;
    }
  };

  useEffect(() => {
    if (cachedAccount) return;

    if (!cachedPromise) {
      cachedPromise = doFetch().catch((err) => {
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

  const refetch = async () => {
    cachedAccount = null;
    cachedPromise = null;
    setLoading(true);
    try {
      const res = await doFetch();
      setData(res);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}
