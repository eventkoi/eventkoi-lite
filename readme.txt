== Event Koi Lite - Events Calendar Plugin for WordPress ==
Contributors: eventkoi, lesleysim, ahmedfouaddev
Donate link: https://donate.stripe.com/fZubJ1auN86Y1PU8cSdUY01
Tags: event calendar, calendar, event, events, event list
Requires at least: 6.7
Tested up to: 6.9
Requires PHP: 8.0
Stable tag: 1.3.0.3
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Finally, a modern, unbloated events calendar plugin. Display an events calendar or list, and manage RSVPs. Uses shortcodes, blocks and page builders.

== Description ==

Frustrated with bloated, outdated events plugins built over a decade ago? EventKoi feels refreshingly modern.

Here's what you'll get:
✓ Clean, modern admin settings that are easy to use.
✓ Display an events calendar, list or grid using blocks, shortcodes, Elementor, or Beaver Builder
✓ Accessible calendar views with timezone support and flexible time display options
✓ Track attendees with RSVPs and QR check-in codes
✓ Secure, well-built code that follows WordPress coding standards
✓ Active development, responsive support, and thorough documentation

**Need more advanced features? Upgrade to EventKoi Pro for custom fields, unlimited calendars, recurring events, and more. [Get EventKoi Pro →](https://eventkoi.com/pricing)**


##What's included in EventKoi Lite

###Create & Manage Events with an intuitive and modern UI

- Add multiple event days, each with its own time
- Create in-person and virtual events
- Embed Google Maps for event locations
- Use your WordPress site's date, time, and timezone settings
- Customize event page templates in the block editor
- Localization-ready


###Accessible Event Calendar

- Display your calendar with a shortcode, block, Elementor widget, or Beaver Builder module
- Accessible calendar views with keyboard navigation and ARIA labels
- Auto-detect visitor timezone for virtual and international events
- Let visitors add events to Google Calendar, iCalendar, Outlook 365, or Outlook Live
- Choose 12 or 24-hour time display
- Set the calendar's starting day of the week
- Choose which month and year to display


###Integrations in EventKoi Lite

- Elementor: Embed an event calendar or event data using native Elementor elements
- Beaver Builder: Embed an event calendar or event data using native Beaver Builder modules


###Display Events List or Grid using Custom Filters

- Display events as a list or grid using a shortcode, block, Elementor widget, or Beaver Builder module
- Show upcoming events or filter by date range or calendar
- Build event displays that fit your site's layout and design

###RSVP: Track who is coming to your events

- Set event capacity and show remaining spots
- Let attendees RSVP and update their response
- Send confirmation emails with QR codes for check-in
- Manage RSVPs and check-ins from WordPress admin
- Export your attendee list


##[Get EventKoi Pro](https://eventkoi.com/pricing?utm_source=pluginreadme-description&utm_medium=web&utm_campaign=30-03-2026)

- **Custom fields**
	- Add custom fields and groups to any event
- **Recurring events**
	- Create advanced rules for events that repeat daily, weekly, monthly, yearly,
	-  Edit individual event instances (custom name, location, description, and more)
	- Includes event series page
- **Unlimited calendars**
	- Segment your events by calendar (e.g. free events vs paid events) and colour.
- **Advanced Elementor and Beaver Builder integrations**
	-  Build custom templates and use Loop features to build event lists.
- **Priority support**
- **30-day money-back guarantee**

## Helpful links

-  [EventKoi documentation](https://eventkoi.com/docs/?utm_source=pluginreadme-helpfullink&utm_medium=web&utm_campaign=16-12-25)
- [EventKoi blog](https://eventkoi.com/blog/?utm_source=pluginreadme-helpfullink&utm_medium=web&utm_campaign=16-12-25)
- [Get help from our Support Forum](https://wordpress.org/support/plugin/eventkoi-lite/) (please check existing threads before starting a new one)
- [Contact us](https://eventkoi.com/contact/?utm_source=pluginreadme-helpfullink&utm_medium=web&utm_campaign=16-12-25) (for non-support related questions)

## Screenshots

1. Calendar view
2. Site visitors can add an event to their own calendar
3. Site visitors can share events via social media and email
4. Calendars come with timezone detection, timezone switcher, and 12/24 hour clock
5. Events list view
6. Events management in WP Admin
7. Create event settings

== Installation ==

Installing EventKoi Lite is easy.

= Installation =

1. In your WP Admin, select Plugins, then Add plugin.
2. In the Search Plugins field, type in "EventKoi Lite"
3. When you find EventKoi Lite, click on Install Now.
4. The installation will run, then click on Activate.

= Configuring your events calendar =

1. Once the plugin is activated, head to Events, then Settings.
2. From there you can configure when you week starts, your working days, and 12/24-hour clock.

= Create your first event =

1. Head to Events > Events and select Add event
2. Fill out the form to create your event.

= Add your calendar to your site =

Head to Events > Calendar and select **Default calendar**. Then select the **Embed** tab.
There, you will see 3 ways to embed the calendar into your site:

1. Your calendar comes with a default link. Out of the box, the link is: https://yourwebsite.com/calendar/default-calendar/
2. Using either shortcodes in any page or post: [eventkoi_calendar display=calendar] or [eventkoi_calendar display=list] depending on whether you want a calendar or list view.
3. Adding a block in any page or post: Type in "/eventkoi" and then select either "EventKoi Calendar" or "EventKoi List" depending on whether you want a list or calendar view.

== Frequently Asked Questions ==

= My calendar or event page shows "Page not found."
Go to Settings > Permalinks and click Save Changes to refresh rewrite rules.

= Does it work with block themes and classic themes?
Yes. EventKoi Lite works with both block and classic themes. You can use our blocks or shortcodes to build your events calendar.

= Can I customize the event template?
Yes. If you're using a block theme, you can go to Appearance > Editor > Templates and customise the Event template. If you're using a classic theme, you can edit the template files.

= Does EventKoi Lite include recurring events?
Recurring events is available in EventKoi Pro.

= Does EventKoi Lite include ticketing?
Coming in 2026!

= Does EventKoi Lite support virtual events and timezones? =
Yes. You can create virtual events, and the events calendar can auto-detect visitor timezone so visitors see events in their own timezone.

== External services ==

This plugin can connect to the **Google Maps JavaScript API** in order to display interactive maps inside event and calendar views.
It sends your configured Google Maps API key (if provided) along with requests made by the visitor's browser when viewing a page that contains an embedded map. No personal data is sent by the plugin itself, but Google may collect usage data in accordance with their policies. This connection only happens if maps are enabled in the plugin settings and a page with an event location map is viewed.
This service is provided by Google LLC: [Terms of Service](https://cloud.google.com/maps-platform/terms), [Privacy Policy](https://policies.google.com/privacy).

== Changelog ==

= 1.3.0.3 – Time Format Fix – 2026-03-27 =
* Fix: Fixed 12/24-hour time format setting not being respected across event pages, calendar views, admin UI, and auto-detect timezone display.

= 1.3.0.2 – Fixes & Improvements – 2026-03-21 =
* Fix: Fixed pagination on single event pages being incorrectly redirected by WordPress canonical URL handling (affects Beaver Builder loop pagination).
* Fix: Improved REST API key header resolution to support both hyphenated and underscored header formats.
* Fix: Fixed comma-delimited calendar selection parsing from UI controls.
* Improvement: Updated support links to point to WordPress.org support forum.

= 1.3.0.1 – Stability & Compatibility Fixes – 2026-02-27 =
* Fix: Prevented empty `location` schema output for events without physical address data.
* Fix: Improved default template resolution consistency for Elementor and Bricks templates.
* Fix: Improved `[eventkoi_calendar display=list]` shortcode argument handling (`orderby`, `order`, `per_page`, `max_results`, `date_start`, `date_end`, `expand`).
* Fix: Improved calendar list query normalization and guardrails for safer ordering, pagination, and filtering.
* Fix: Improved activation recovery by ensuring core Lite tables are created/recovered reliably.

= 1.3.0.0 – RSVP – 2026-01-29 =
* New: Added RSVP creation and management.

= 1.2.1.0 – Local timezone display & settings – 2026-01-13 =
* New: Added auto-detect timezone setting so visitors can see event times in their local timezone.
* Improvement: Event date/time output now includes timezone metadata for accurate client-side conversion.
* Improvement: Added a Custom Fields settings preview for Pro.
* Fix: Ensured demo event imagery loads reliably in onboarding.

= 1.2.0.2 – Timezone fix – 2026-01-01 =
* Fix: Fixed calendar day headers shifting when the server timezone differs from the WordPress timezone.

= 1.2.0.1 – Style fixes – 2025-12-23 =
* Fix: Fixed image styling in the Event Query Loop block.
* Fix: Fixed Event Data block styling.

= 1.2.0.0 – Elementor Widgets & Onboarding – 2025-12-16 =
* New: Added Elementor Event Data widget to drop event details anywhere.
* New: Added Elementor Event Calendar widget to embed calendars visually.
* New: Introduced a quick start plugin tour plus onboarding hints to guide first-time setup.
* Improvement: Added missing translation strings and refreshed the POT file.
* Fix: Event counts now update correctly in the Events list.
* Fix: `eventkoi` shortcode now displays the event image reliably.

= 1.1.0.1 – JS Import Fix – 2025-12-04 =
* Fix: Added missing JavaScript imports so frontend assets load reliably.

= 1.1.0 – Query Loop Blocks & Data Enhancements – 2025-12-03 =
* New: Added EK Event Query Loop variation (with EK Event Data child block) to display events using core/query controls and pagination.
* New: Added `/eventkoi/v1/query_events` endpoint and expanded `/calendar_events` to support paging, ordering, and date filters for block previews.
* Improvement: Query Loop server render now injects EventKoi event data.

= 1.0.14 – Admin Event Description Editor Fix – 2025-11-10 =
* Fix: Resolved issue where the event description editor in the admin sometimes failed to display or save properly.

= 1.0.13 – Week View Layout & Header Improvements – 2025-10-21 =
* Improvement: Redesigned week view header to show weekday names and dates on separate lines for better readability.
* Improvement: Enhanced alignment and font styling for week/day headers across all screen sizes.
* Fix: Removed weird day numbers appearing beside months in month view.
* Fix: Adjusted locale handling to ensure consistent weekday labels across languages.

= 1.0.12 – Important bugfix – 2025-10-20 =
* Fix: Fixed issue with recurring instances not loading. (May require saving permalinks again)

= 1.0.11 – Performance, Accessibility & Calendar Enhancements – 2025-10-19 =
* Improvement: Improved weekly view and navigation consistency in the calendar UI.
* Improvement: Optimized backend query performance for faster event loading.
* Improvement: Enhanced accessibility in frontend calendar and single event views.
* Fix: Minor styling and layout adjustments for better responsiveness.
* Fix: Corrected small inconsistencies in timezone and localization handling.

= 1.0.10 – Calendar View & Localization Fixes – 2025-10-09 =
* Fix: Resolved layout and navigation issues in the weekly calendar view.
* Fix: Corrected locale handling and improved date/time formatting consistency.
* Improvement: Enhanced localization support across admin and frontend.
* Improvement: Improved responsiveness and stability in calendar rendering.

= 1.0.0 – Initial public release – 2025-10-07 =
* Initial public release of EventKoi Lite plugin.
* Core event creation and management features.
* Built-in support for single-day and multi-day events.
