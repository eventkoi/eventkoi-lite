import { __ } from "@wordpress/i18n";

export const tabs = {
  main: [
    { href: "dashboard", title: __("Dashboard", "eventkoi-lite") },
    { href: "events", title: __("Events", "eventkoi-lite") },
    { href: "calendars", title: __("Calendars", "eventkoi-lite") },
    { href: "tickets", title: __("Ticket sales", "eventkoi-lite") },
    { href: "settings", title: __("Settings", "eventkoi-lite") },
  ],
  side: [],
  tickets: [],
};
