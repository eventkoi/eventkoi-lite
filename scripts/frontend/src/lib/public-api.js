"use client";

/**
 * Nonce-free fetch client for public EventKoi REST endpoints.
 * Uses apiFetch.create when available; falls back to window.fetch otherwise.
 */
import apiFetch from "@wordpress/api-fetch";

const apiBase =
  (typeof eventkoi_params !== "undefined" &&
    eventkoi_params.rest_url &&
    eventkoi_params.rest_url.replace(/\/$/, "")) ||
  "/wp-json/eventkoi/v1";

const ensurePath = (path = "") => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // Split path + query so we can merge queries correctly when apiBase already has a query (?rest_route=...).
  const [rawPath, rawQuery] = String(path).split("?");
  const normalizedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  try {
    const base = new URL(apiBase, typeof window !== "undefined" ? window.location.origin : undefined);
    const hasRestRoute = base.searchParams.has("rest_route");

    if (hasRestRoute) {
      const currentRoute = (base.searchParams.get("rest_route") || "").replace(/\/$/, "");
      base.searchParams.set("rest_route", `${currentRoute}${normalizedPath}`);

      if (rawQuery) {
        const qs = new URLSearchParams(rawQuery);
        qs.forEach((value, key) => base.searchParams.append(key, value));
      }

      return base.toString();
    }

    // Pretty REST base (/wp-json/...) without query string.
    return rawQuery ? `${apiBase}${normalizedPath}?${rawQuery}` : `${apiBase}${normalizedPath}`;
  } catch (e) {
    // Fallback to naive concatenation if URL parsing fails for any reason.
    return rawQuery ? `${apiBase}${normalizedPath}?${rawQuery}` : `${apiBase}${normalizedPath}`;
  }
};

export const resolvePublicRestUrl = (path = "") => ensurePath(path);

let publicApi;

// Newer WP versions expose apiFetch.create; use it to avoid nonce middleware.
if (typeof apiFetch.create === "function") {
  publicApi = apiFetch.create({
    credentials: "omit",
  });

  const baseHasQuery = apiBase.includes("?");

  if (!baseHasQuery && typeof apiFetch.createRootURLMiddleware === "function") {
    publicApi.use(apiFetch.createRootURLMiddleware(apiBase));
  } else {
    publicApi.use((options, next) => {
      const ensured = ensurePath(options.path);
      const opts = { ...options };

      // If ensurePath produced a full URL (rest_route base), set url and drop path so wp-api-fetch root middleware doesn't double-append.
      if (/^https?:\/\//i.test(ensured)) {
        delete opts.path;
        opts.url = ensured;
      } else {
        opts.path = ensured;
      }

      return next(opts);
    });
  }
} else {
  // Fallback: minimal fetch wrapper without nonce/cookies.
  publicApi = async (options = {}) => {
    const { path, url, data, headers = {}, method = "GET", ...rest } = options;
    const ensured = ensurePath(path || "");
    const finalUrl = url || ensured;

    const fetchOptions = {
      method,
      credentials: "omit",
      headers: { ...headers },
      ...rest,
    };

    if (data && !fetchOptions.body) {
      fetchOptions.body = JSON.stringify(data);
      if (!fetchOptions.headers["Content-Type"]) {
        fetchOptions.headers["Content-Type"] = "application/json";
      }
    }

    const response = await fetch(finalUrl, fetchOptions);

    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const error = new Error(response.statusText || "Request failed");
      error.response = payload;
      error.status = response.status;
      throw error;
    }

    return payload;
  };
}

export default publicApi;
