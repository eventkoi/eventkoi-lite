/**
 * Stub for @/hooks/SettingsContext.
 *
 * The real module pulls in React and @wordpress/api-fetch and reads
 * window.eventkoi_params at import time. Only getSettings() is reachable from
 * date-utils, so the tests drive it through a global they control.
 */

export function getSettings() {
  return globalThis.__EK_TEST_SETTINGS__ ?? null;
}

export default { getSettings };
