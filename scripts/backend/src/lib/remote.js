import apiFetch from "@wordpress/api-fetch";

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
