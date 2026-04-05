import { fetchPluginConfig } from "@/lib/config";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import apiFetch from "@wordpress/api-fetch";

/**
 * Makes an authenticated call to a Supabase Edge function using plugin headers.
 * Automatically fetches plugin config and handles JSON parsing + errors.
 *
 * @param {string} functionName - The Supabase Edge function name (e.g. "get-stats").
 * @param {RequestInit} [options={}] - Optional fetch options.
 * @returns {Promise<any>} Parsed JSON response.
 */
export async function callEdgeFunction(functionName, options = {}) {
  const config = await fetchPluginConfig();
  const url = `${config.supabase_edge}/${functionName}`;

  const res = await fetchWithAuth(url, options);

  if (!res.ok) {
    const errorText = await res.text();
    const error = new Error(`Edge call failed (${functionName}): ${errorText}`);
    error.status = res.status;
    error.body = errorText;
    throw error;
  }

  return await res.json();
}

/**
 * Makes an authenticated call to the local WP REST API.
 *
 * @param {string} endpoint - REST endpoint (e.g. "orders" or "order?id=1").
 * @param {Object} [options={}] - apiFetch options.
 * @returns {Promise<any>} Parsed JSON response.
 */
export async function callLocalApi(endpoint, options = {}) {
  const normalized = endpoint.replace(/^\//, "");

  return apiFetch({
    path: `${eventkoi_params.api}/${normalized}`,
    ...options,
    headers: {
      "EVENTKOI-API-KEY": eventkoi_params.api_key,
      ...(options.headers || {}),
    },
  });
}

/**
 * Attempts to re-register the current instance with EventKoi services.
 *
 * @returns {Promise<any>} Parsed response from the AJAX handler.
 */
export async function registerInstance() {
  return apiFetch({
    url: `${eventkoi_params.ajax_url}?action=eventkoi_register_instance`,
    method: "POST",
  });
}
