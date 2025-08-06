import { getAuthHeaders } from "@/lib/getAuthHeaders";

/**
 * Makes a secure fetch call to Supabase Edge with plugin-authenticated headers.
 *
 * @param {string} url - The full Supabase Edge function URL.
 * @param {Object} options - Fetch options (method, body, etc.).
 * @returns {Promise<Response>} The fetch response.
 */
export async function fetchWithAuth(url, options = {}) {
  const { headers: authHeaders } = await getAuthHeaders();

  const method = options.method || "get";

  const mergedHeaders = {
    ...authHeaders,
    ...(options.headers || {}),
  };

  const fetchOptions = {
    ...options,
    method,
    headers: mergedHeaders,
  };

  return fetch(url, fetchOptions);
}
