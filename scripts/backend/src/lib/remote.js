import { fetchPluginConfig } from "@/lib/config";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

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
    throw new Error(`Edge call failed (${functionName}): ${errorText}`);
  }

  console.log("API call: " + url);
  return await res.json();
}
