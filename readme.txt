== EventKoi Lite ==

Contributors: eventkoi, lesleysim
Donate link: https://donate.stripe.com/fZubJ1auN86Y1PU8cSdUY01
Tags: events, calendar, event management, schedules, calendar block
Requires at least: 6.7  
Tested up to: 6.8 
Requires PHP: 8.0  
Stable tag: 1.0.10 
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Modern, fast WordPress events calendar. Create single or multi-day events and display month, week, or list views via blocks or shortcodes.

== Description ==

**EventKoi Lite** is a modern, performance-first WordPress events calendar. Publish single-day or multi-day events (with different start/end times per day) and display them in Month, Week, or List views using blocks or shortcodes. Lean database queries and minimal assets keep your site fast, without generating duplicate event rows.

## Highlights
- **Calendar Views:** Month, Week, and List
- **Events:** Consecutive start and end times. Or Multi-day with different times each day.
- **Embed calendar:** Via blocks or shortcodes
- **Calendar features:** Built-in search, 12/24-hour clock, Timezone switcher, Month or week view, Add to calendar button, and Share button
- **Block editor ready:** Block templates (block themes), block attributes, REST API
- **Performance:** Lean queries; minimal front-end assets


## Additional features
- **Event options**: Online or physical location, easy Google Maps embed, description, featured image
- **Event template**: Editable in block editor or via code for classic themes
- **Additional settings**: Select working days, select day that the week starts on, display specific month and year.


## How to display calendar on your site
Head to Events > Calendar and select **Default calendar**. Then select the **Embed** tab.
There, you will see 3 ways to embed the calendar into your site:
1. Your calendar comes with a default link. Out of the box, the link is: https://yourwebsite.com/calendar/default-calendar/
2. Using either shortcodes in any page or post: [eventkoi_calendar display=calendar] or [eventkoi_calendar display=list] depending on whether you want a calendar or list view.
3. Adding a block in any page or post: Type in "/eventkoi" and then select either "EventKoi Calendar" or "EventKoi List" depending on whether you want a list or calendar view.


## Blocks and shortcodes
Here are the available blocks:
- EventKoi Calendar
- EventKoi List

Here are the available shortcodes:
- [eventkoi_calendar display=calendar]
- [eventkoi_calendar display=list] 


## What’s in Pro (separate upgrade)
- Recurring/complex events
- Unlimited calendars
- Unlimited locations per event
- Lots more coming soon

## Additional links
[Learn more about EventKoi](https://eventkoi.com)
[EventKoi documentation](https://eventkoi.com/docs)

## Screenshots
1. Calendar (frontend view)
2. Add to calendar (frontend view)
3. Share event (frontend view)
4. Timezone switcher (frontend view)
5. Calendar list (frontend view)
6. Events table list in WP Admin
7. Add/Edit Event screen

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
= My calendar or event page shows “Page not found.”
Go to Settings > Permalinks and click Save Changes to refresh rewrite rules.

= Does it work with block themes and classic themes?
Yes. EventKoi Lite works with both block and classic themes. If you experience any issues, please request support.

= Can I customize the event template?
Yes. If you’re using a block theme, you can go to Appearance > Editor > Templates and customise the Event template. If you’re using a classic theme, you can edit the template files. 

= Are there Gutenberg blocks?
Yes. There is a calendar block (called EventKoi Calendar) and a list block (called EventKoi List).

= Does EventKoi Lite include recurring events?
No. Recurring events is available in EventKoi Pro. 

= Does EventKoi Lite include ticketing?
Coming in 2026!

= How to change week start day?
Head to Events > Settings. Then select your desired week start day from the drop down.

= How to change working days?
Head to Events > Settings. Then select your desired work days.

= How to switch between 12/24-hour clock?
In the WordPress admin, head to Events > Settings. Then select either 12-hour or 24-hour clock.

Users can also toggle between 12-hour and 24-hour clock in the frontend calendar on the top right hand side of the calendar. There is a clickable link that display the timezone and the 12-hour or 24-hour clock. Click on it to switch between 12-hour or 24-hour clock.

== External services ==

This plugin can connect to the **Google Maps JavaScript API** in order to display interactive maps inside event and calendar views.

It sends your configured Google Maps API key (if provided) along with requests made by the visitor’s browser when viewing a page that contains an embedded map. No personal data is sent by the plugin itself, but Google may collect usage data in accordance with their policies. This connection only happens if maps are enabled in the plugin settings and a page with an event location map is viewed.
This service is provided by Google LLC: [Terms of Service](https://cloud.google.com/maps-platform/terms), [Privacy Policy](https://policies.google.com/privacy).

== Changelog ==

= 1.0.10 – Calendar View & Localization Fixes – 2025-10-09 =
* Fix: Resolved layout and navigation issues in the weekly calendar view.
* Fix: Corrected locale handling and improved date/time formatting consistency.
* Improvement: Enhanced localization support across admin and frontend.
* Improvement: Improved responsiveness and stability in calendar rendering.

= 1.0.0 – Initial public release – 2025-10-07 =
* Initial public release of EventKoi Lite plugin.
* Core event creation and management features.
* Built-in support for single-day and multi-day events.
