import { ensureDemoEvent } from "@/tour/demo-event";

// Tour state shared by the tour UI and the screens it points at. The server
// keeps the step per admin, so the tour picks up again after a page load.

const ctx = (typeof window !== "undefined" && window.eventkoiTour) || {};

const HELP_HIDDEN_KEY = "eventkoi_tour_help_hidden";

let state = {
  active: !!ctx.active,
  step: Number(ctx.step) || 1,
  demoEventId: Number(ctx.demoEventId) || 0,
  starting: false,
  helpHidden: readHelpHidden(),
};

const listeners = new Set();

function readHelpHidden() {
  try {
    return window.localStorage.getItem(HELP_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeHelpHidden(hidden) {
  try {
    if (hidden) {
      window.localStorage.setItem(HELP_HIDDEN_KEY, "1");
    } else {
      window.localStorage.removeItem(HELP_HIDDEN_KEY);
    }
  } catch {
    // Storage can be blocked; the box then just shows again next page.
  }
}

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener(state));
}

export function getTourState() {
  return state;
}

export function subscribeTour(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function tourContext() {
  return ctx;
}

async function post(path, data = {}) {
  const response = await fetch(`${ctx.rest}/${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-WP-Nonce": ctx.nonce || "",
    },
    body: JSON.stringify(data),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(json?.message || "Request failed");
    error.code = json?.code;
    throw error;
  }

  return json;
}

/**
 * Move to a step and save it for this admin.
 *
 * @param {number} step Step number.
 * @return {Promise<void>}
 */
export async function goToStep(step) {
  setState({ step });
  try {
    await post("tour", { step });
  } catch {
    // The step still shows now; only resuming after a reload is affected.
  }
}

/**
 * Close the tour for good.
 */
export function endTour() {
  setState({ active: false });
  writeHelpHidden(false);
  post("complete").catch(() => {});
}

/**
 * Mark the tour finished on the server but keep the last step on screen,
 * so the admin still sees the signup confirmation.
 */
export function finishTour() {
  writeHelpHidden(false);
  post("complete").catch(() => {});
}

/**
 * Start the tour: create or reset the demo event, then go to the Events list.
 *
 * @param {object}  options         Options.
 * @param {boolean} options.restart Offer the tour again first (Dashboard link).
 * @return {Promise<void>}
 */
export async function beginTour({ restart = false } = {}) {
  if (state.starting) return;

  setState({ starting: true });

  try {
    if (restart) {
      await post("restart", { step: 1 });
    }

    const demoEventId = await ensureDemoEvent();

    await post("tour", { step: 2 });

    writeHelpHidden(false);
    setState({
      active: true,
      step: 2,
      demoEventId,
      starting: false,
      helpHidden: false,
    });

    window.location.href = `${ctx.adminUrl}#/events`;
  } catch (error) {
    setState({ starting: false });
    throw error;
  }
}

export function hideHelp() {
  writeHelpHidden(true);
  setState({ helpHidden: true });
}

export async function subscribeEmail(email) {
  return post("subscribe", { email });
}

function withTourParam(url, step) {
  try {
    const target = new URL(url, window.location.origin);
    target.searchParams.set("eventkoi_tour", String(step));
    return target.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}eventkoi_tour=${step}`;
  }
}

function isDemoEvent(event) {
  return !!state.demoEventId && Number(event?.id) === state.demoEventId;
}

/**
 * The event editor saved an event. Publishing the demo event moves the tour on.
 *
 * @param {object} event Saved event.
 */
export function tourEventSaved(event) {
  if (!state.active || !isDemoEvent(event)) return;

  if (event?.wp_status === "publish" && (state.step === 4 || state.step === 5)) {
    goToStep(6);
  }
}

/**
 * Preview clicked in the event editor. On step 6 the tour opens the event
 * page in this tab, so it can carry on from there.
 *
 * @param {object} event Event being edited.
 * @return {boolean} True when the tour handled the click.
 */
export function tourHandlePreview(event) {
  if (!state.active || state.step !== 6 || !isDemoEvent(event) || !event?.url) {
    return false;
  }

  goToStep(7).then(() => {
    window.location.href = withTourParam(event.url, 7);
  });

  return true;
}

/**
 * Calendar link icon clicked. On step 10 the tour opens the calendar in this
 * tab, so it can carry on from there.
 *
 * @param {string} url Calendar URL.
 * @return {boolean} True when the tour handled the click.
 */
export function tourHandleCalendarLink(url) {
  if (!state.active || state.step !== 10 || !url) {
    return false;
  }

  goToStep(11).then(() => {
    window.location.href = withTourParam(url, 11);
  });

  return true;
}
