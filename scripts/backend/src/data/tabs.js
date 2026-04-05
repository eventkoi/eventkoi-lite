import { __ } from "@wordpress/i18n";

export const tabs = {
  main: [
    { href: "dashboard", title: __("Dashboard", "eventkoi") },
    { href: "events", title: __("Events", "eventkoi") },
    { href: "calendars", title: __("Calendars", "eventkoi") },
    { href: "tickets", title: __("Ticket sales", "eventkoi") },
    { href: "settings", title: __("Settings", "eventkoi") },
  ],
  side: [],
  tickets: [],
};
