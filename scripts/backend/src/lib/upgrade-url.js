const BASE = "https://eventkoi.com/upgradeqf35m3ref/";

/**
 * Upgrade link tagged for analytics.
 *
 * @param {string} campaign utm_campaign value, e.g. "upgrade-banner".
 * @param {string} content  utm_content value naming the screen or control.
 * @return {string}
 */
export function upgradeUrl(campaign, content) {
  const params = new URLSearchParams({
    utm_source: "eventkoi-lite",
    utm_medium: "plugin",
    utm_campaign: campaign,
    utm_content: content,
  });

  return `${BASE}?${params.toString()}`;
}
