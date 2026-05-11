import { useMemo } from "react";

/**
 * Read the capability map injected by PHP into eventkoi_params.
 * Returns a stable object keyed by cap → boolean.
 */
export function useCaps() {
  return useMemo(() => (window?.eventkoi_params?.caps || {}), []);
}

/**
 * True when the current user is granted the supplied EventKoi capability
 * (or any one in an array). Admins always return true (server seeds caps).
 */
export function useCan(cap) {
  const caps = useCaps();
  if (Array.isArray(cap)) {
    return cap.some((c) => !!caps[c]);
  }
  return !!caps[cap];
}
