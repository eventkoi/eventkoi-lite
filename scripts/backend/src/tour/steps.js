import { __, sprintf } from "@wordpress/i18n";

// The 14 steps of the plugin tour, in the order of Lesley's design.
// Steps 7 and 11 happen on the site itself (see the frontend tour script).

export const LAST_STEP = 14;

// Same translated title the demo event is created with.
const demoTitle = () => __("Classical Concert in the Park", "eventkoi-lite");

/**
 * Where the admin currently is.
 *
 * @param {string} screen Current admin screen base.
 * @return {{ screen: string, app: boolean, path: string, params: URLSearchParams }}
 */
export function readLocation(screen) {
  const hash = (window.location.hash || "").replace(/^#/, "");
  const [path = "", query = ""] = hash.split("?");

  return {
    screen,
    app: screen === "toplevel_page_eventkoi",
    path: path || "/",
    params: new URLSearchParams(query),
  };
}

export function isEventsList(loc) {
  return loc.app && /^\/events\/?$/.test(loc.path);
}

export function isDemoEditor(loc, demoId) {
  return (
    loc.app &&
    !!demoId &&
    new RegExp(`^/events/${demoId}(/|$)`).test(loc.path) &&
    !loc.path.includes("/instances/")
  );
}

export function isCalendarsList(loc) {
  return loc.app && /^\/calendars\/?$/.test(loc.path);
}

export function isSettingsDefault(loc) {
  return loc.app && /^\/settings(\/default)?\/?$/.test(loc.path);
}

const submenu = (slug) =>
  `#toplevel_page_eventkoi .wp-submenu a[href$="#/${slug}"]`;

/**
 * Step definitions.
 *
 * placement: "right" sits beside the anchor with the arrow on its left,
 * "below" sits under it with the arrow on top, "corner" sits under the
 * anchor at the right edge of the screen without an arrow.
 */
/**
 * The admin page a step lives on, as an app route.
 *
 * @param {number} step   Step number.
 * @param {number} demoId Demo event ID.
 * @return {string|null} Route, or null for the Plugins page or the site.
 */
export function stepRoute(step, demoId) {
  if (step === 2 || step === 3) return "/events";
  if ([4, 5, 6, 8].includes(step)) return `/events/${demoId}/main`;
  if ([9, 10, 12].includes(step)) return "/calendars";
  if (step === 13 || step === 14) return "/settings";
  return null;
}

export const STEPS = {
  1: {
    variant: "welcome",
    on: (loc) => loc.screen === "plugins",
    anchor: () => "#toplevel_page_eventkoi > a",
    placement: "right",
    title: __("Welcome to EventKoi! 👋", "eventkoi-lite"),
    body: __(
      "To get you started, I’ve created a short tour to help you publish your first event and get familiar with our features.",
      "eventkoi-lite"
    ),
  },
  2: {
    on: isEventsList,
    anchor: () => '[data-ek-tour="events-heading"]',
    placement: "right",
    title: __("Manage your events here", "eventkoi-lite"),
    body: __("Create new events, or edit existing ones.", "eventkoi-lite"),
    counter: [1, 2],
    next: 3,
  },
  3: {
    on: isEventsList,
    anchor: (demoId) =>
      `[data-ek-tour="event-title"][data-ek-event-id="${demoId}"]`,
    placement: "right",
    click: true,
    highlight: true,
    title: sprintf(
      /* translators: %s: name of the demo event. */
      __("Click on “%s”", "eventkoi-lite"),
      demoTitle()
    ),
    body: [
      __("Clicking the event to edit it.", "eventkoi-lite"),
      __("The tour will continue on the next page.", "eventkoi-lite"),
    ],
    counter: [2, 2],
  },
  4: {
    on: isDemoEditor,
    anchor: () => '[data-ek-tour="event-header"]',
    placement: "corner",
    title: __("Explore and edit event", "eventkoi-lite"),
    body: __(
      "Get familiar with the event settings by playing around and making changes.",
      "eventkoi-lite"
    ),
    counter: [1, 2],
    next: 5,
  },
  5: {
    on: isDemoEditor,
    anchor: () => '[data-ek-tour="publish"]',
    placement: "below",
    click: true,
    title: __("Click “Publish”", "eventkoi-lite"),
    body: __("Publish your event when you’re ready.", "eventkoi-lite"),
    counter: [2, 3],
    back: 4,
  },
  6: {
    on: isDemoEditor,
    anchor: () => '[data-ek-tour="preview"]',
    placement: "below",
    click: true,
    title: __("Click “Preview”", "eventkoi-lite"),
    body: __("See what your event looks like to attendees.", "eventkoi-lite"),
    counter: [3, 3],
    back: 5,
    nextClicks: '[data-ek-tour="preview"]',
  },
  8: {
    on: isDemoEditor,
    anchor: () => submenu("calendars"),
    placement: "right",
    click: true,
    highlight: true,
    title: __("Click on “Calendars”", "eventkoi-lite"),
    body: __("We’re headed to your Calendars next.", "eventkoi-lite"),
  },
  9: {
    on: isCalendarsList,
    anchor: () => '[data-ek-tour="calendars-heading"]',
    placement: "right",
    title: __("Welcome to your Calendar", "eventkoi-lite"),
    body: __("Access and manage your calendar here.", "eventkoi-lite"),
    counter: [1, 2],
    back: 8,
    next: 10,
  },
  10: {
    on: isCalendarsList,
    anchor: () =>
      '[data-ek-tour="calendar-link"][data-default-cal-link="true"], [data-ek-tour="calendar-link"]',
    placement: "right",
    click: true,
    highlight: true,
    title: __("Click link icon", "eventkoi-lite"),
    body: [
      __("Click the icon to view the frontend calendar.", "eventkoi-lite"),
      __("This is your last step in the tour.", "eventkoi-lite"),
    ],
    counter: [2, 2],
    back: 9,
  },
  12: {
    on: isCalendarsList,
    anchor: () => submenu("settings"),
    placement: "right",
    click: true,
    highlight: true,
    title: __("Click on “Settings”", "eventkoi-lite"),
    body: __(
      "Let’s personalise your event and calendar settings.",
      "eventkoi-lite"
    ),
  },
  13: {
    on: isSettingsDefault,
    anchor: () => '[data-ek-tour="app-header"]',
    placement: "corner",
    title: __("Personalise your settings", "eventkoi-lite"),
    body: __(
      "Take your time. Go through everything and customise what you need.",
      "eventkoi-lite"
    ),
    nextLabel: __("Next: Final step", "eventkoi-lite"),
    next: 14,
  },
  14: {
    variant: "final",
    on: isSettingsDefault,
  },
};
