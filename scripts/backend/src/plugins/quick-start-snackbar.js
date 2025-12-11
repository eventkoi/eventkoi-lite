const SNACKBAR_ID = "eventkoi-quick-start-snackbar";
const SESSION_DISMISS_KEY = "eventkoi_qs_hidden_session";
const { __ } = window.wp?.i18n ?? { __: (text) => text };

const markQuickStartComplete = () => {
  try {
    window.sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
  } catch {
    // Ignore sessionStorage issues.
  }

  if (!window.eventkoiQuickStart?.restUrl) {
    return;
  }

  const url = new URL(window.eventkoiQuickStart.restUrl);

  if (window.eventkoiQuickStart.nonce) {
    url.searchParams.set("_wpnonce", window.eventkoiQuickStart.nonce);
  }

  const payload = JSON.stringify({ completed: true });

  if (navigator?.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon(url.toString(), blob)) {
      return;
    }
  }

  fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(window.eventkoiQuickStart.nonce
        ? { "X-WP-Nonce": window.eventkoiQuickStart.nonce }
        : {}),
    },
    body: payload,
    keepalive: true,
  }).catch(() => {});
};

const createSnackbar = () => {
  if (document.getElementById(SNACKBAR_ID)) {
    return;
  }

  try {
    if (window.sessionStorage.getItem(SESSION_DISMISS_KEY) === "1") {
      return;
    }
  } catch {
    // Ignore sessionStorage issues.
  }

  const wrapper = document.createElement("div");
  wrapper.id = SNACKBAR_ID;
  wrapper.style.position = "fixed";
  wrapper.style.right = "20px";
  wrapper.style.bottom = "48px";
  wrapper.style.zIndex = "9999";
  wrapper.style.maxWidth = "380px";
  wrapper.style.boxShadow = "0 10px 30px rgba(0,0,0,0.12)";
  wrapper.style.borderRadius = "12px";
  wrapper.style.overflow = "hidden";
  wrapper.style.background = "#121212";
  wrapper.style.color = "#f9fafb";
  wrapper.style.fontFamily = "Inter, system-ui, -apple-system, sans-serif";
  wrapper.style.border = "1px solid rgba(255,255,255,0.06)";

  wrapper.innerHTML = `
    <div style="padding: 14px;display:flex;">
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <div style="width:16.918px;height:21.88px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16.918" height="21.89" viewBox="0 0 16.918 21.89" aria-hidden="true" focusable="false"><g transform="translate(0 -13.696)"><g transform="translate(0 13.696)"><path d="M6.19-72.725A3.818,3.818,0,0,0,4.837-75.38a3.359,3.359,0,0,0-2.484-.876A1.885,1.885,0,0,0,.611-74.9a1.612,1.612,0,0,0-.092,1.06,6.23,6.23,0,0,0,.518,1.178,8.55,8.55,0,0,1,.4.832,4.387,4.387,0,0,1,.224.775,7.582,7.582,0,0,0,.984,2.5,4.542,4.542,0,0,0,1.52,1.613,1.022,1.022,0,0,0,1.363-.107q.563-.391.693-2.332A18.33,18.33,0,0,0,6.19-72.725Zm-.09,7.2q-1.034,0-1.242,2.7a18.162,18.162,0,0,0,.413,5.442q.622,2.739,1.677,2.878,2.3.313,2.729-2.422a10.636,10.636,0,0,0-.736-5.668Q7.773-65.521,6.1-65.521Zm2.05-1.52a.88.88,0,0,0,.941.487,2.49,2.49,0,0,0,1.12-.657q.583-.539,1.389-1.4.481-.627.9-1.091a5.462,5.462,0,0,1,.805-.754,4.378,4.378,0,0,0,2.051-2.931,2.483,2.483,0,0,0-.917-2.533,2.674,2.674,0,0,0-2.914-.028A5.715,5.715,0,0,0,9.343-73.55,12.509,12.509,0,0,0,7.9-69.78,3.422,3.422,0,0,0,8.149-67.041Z" transform="translate(-0.467 76.356)" fill="#fb4409"></path></g><g transform="translate(7.301 20.061)"><path d="M34.564-32.511a2.816,2.816,0,0,0-.269,1.24,1.461,1.461,0,0,0,.269.913c.535.852.818,1.139,1.1,1.59a15.006,15.006,0,0,0,3.8,4.125q2.223,1.635,3.58.774a1.555,1.555,0,0,0,.865-1.448,3.235,3.235,0,0,0-.619-1.622A17.131,17.131,0,0,0,41.85-28.67l-.332-.386a20.805,20.805,0,0,0-2.5-2.265,10.6,10.6,0,0,0-2.8-1.656Q34.936-33.447,34.564-32.511Z" transform="translate(-34.295 33.134)" fill="#fb4409"></path></g></g></svg>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;align-items:flex-start;gap:10px;">
            <div style="font-size:15px;line-height:1.4;font-weight:500;letter-spacing:-0.01em;">${__(
              "Launch EventKoi Onboarding Wizard?",
              "eventkoi-lite"
            )}</div>
            <button type="button" aria-label="Dismiss" data-role="close"
              style="margin-left:auto;margin-top:-8px;background:none;border:0;color:#9ca3af;cursor:pointer;padding:4px;font-size:20px;line-height:1;border-radius:8px;">
              ×
            </button>
          </div>
          <div style="display:flex;gap:14px;flex-wrap:wrap;">
            <a href="${
              eventkoiQuickStart.onboarding_url
            }" target="_self" rel="noreferrer"
              data-role="onboarding"
              style="text-align:center;background:#fff;color:#333;border-radius:10px;padding:6px 12px;font-weight:500;text-decoration:none;font-size:13px;">
              ${__("Launch wizard", "eventkoi-lite")}
            </a>
            <a href="${
              eventkoiQuickStart.dashboard_url
            }" target="_self" rel="noreferrer"
              style="padding:6px 12px;border-radius:10px;background:#555;color:#fff;font-weight:500;font-size:13px;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;min-width:0;">
              ${__("Go to EventKoi Dashboard", "eventkoi-lite")}
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  wrapper.querySelectorAll('[data-role="close"]').forEach((btn) =>
    btn.addEventListener("click", () => {
      markQuickStartComplete();
      wrapper.remove();
    })
  );

  wrapper.querySelectorAll('[data-role="onboarding"]').forEach((btn) =>
    btn.addEventListener("click", () => {
      markQuickStartComplete();
    })
  );

  document.body.appendChild(wrapper);

  const handleHide = () => {
    try {
      window.sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    } catch {
      // Ignore sessionStorage issues.
    }
    wrapper.remove();
  };

  window.addEventListener("pagehide", handleHide, { once: true });
};

document.addEventListener("DOMContentLoaded", () => {
  const quickStart = window.eventkoiQuickStart;
  const isPluginsScreen = quickStart?.screen === "plugins";
  const onOnboardingRoute =
    typeof window.location?.hash === "string" &&
    window.location.hash.includes("/dashboard/onboarding");

  if (quickStart?.show && onOnboardingRoute) {
    markQuickStartComplete();
  }

  if (!quickStart || !quickStart.show || !isPluginsScreen) {
    return;
  }

  createSnackbar();
});
