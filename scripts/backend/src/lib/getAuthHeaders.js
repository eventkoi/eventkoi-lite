import apiFetch from "@wordpress/api-fetch";

/**
 * Generates HMAC-based headers for authenticating plugin requests to Edge Functions.
 * Caches the result for 30 seconds to improve performance.
 *
 * @returns {Promise<{ headers: Record<string, string> }>}
 */
export async function getAuthHeaders() {
  const now = Date.now();
  const cache = globalThis.__eventkoi_auth;

  // Use cached headers if they exist and are recent
  if (cache && now - cache.timestamp < 30_000) {
    return { headers: cache.headers };
  }

  const res = await apiFetch({
    url: `${eventkoi_params.ajax_url}?action=eventkoi_generate_hmac`,
    method: "GET",
  });

  if (!res?.success) {
    throw new Error("Unable to generate auth headers.");
  }

  const { instance_id, timestamp, signature } = res.data;

  const headers = {
    "Content-Type": "application/json",
    "X-EVENTKOI-INSTANCE-ID": instance_id,
    "X-TIMESTAMP": String(timestamp),
    "X-SIGNATURE": signature,
  };

  globalThis.__eventkoi_auth = {
    headers,
    timestamp: now,
  };

  return { headers };
}
