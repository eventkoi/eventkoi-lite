/**
 * Field options for the Event Data block.
 *
 * Single source of truth: the sidebar SelectControl and the List View label
 * both read this, so a new field can never show up as "Unknown" again.
 *
 * @package EventKoi
 */

import { __ } from "@wordpress/i18n";

export const getEventDataFieldOptions = () => [

            { label: __("— Primary —", "eventkoi-lite"), value: "", disabled: true },
            { label: __("Title", "eventkoi-lite"), value: "title" },
            // "excerpt" is the historical value for the description field, kept
            // so existing blocks keep rendering what they always did. The real
            // post excerpt is a separate field below.
            { label: __("Description", "eventkoi-lite"), value: "excerpt" },
            { label: __("Excerpt", "eventkoi-lite"), value: "event_excerpt" },
            { label: __("Date and Time", "eventkoi-lite"), value: "timeline" },
            { label: __("Location", "eventkoi-lite"), value: "location" },
            { label: __("Image", "eventkoi-lite"), value: "image" },

            { label: __("— Date & time —", "eventkoi-lite"), value: "", disabled: true },
            { label: __("Datetime", "eventkoi-lite"), value: "event_datetime" },
            { label: __("Datetime with summary", "eventkoi-lite"), value: "event_datetime_with_summary" },
            { label: __("Date only", "eventkoi-lite"), value: "event_date" },
            { label: __("Time only", "eventkoi-lite"), value: "event_time" },
            { label: __("Timezone", "eventkoi-lite"), value: "event_timezone" },
            { label: __("Date type", "eventkoi-lite"), value: "event_date_type" },
            { label: __("Rule summary", "eventkoi-lite"), value: "event_rulesummary" },

            { label: __("— Date parts —", "eventkoi-lite"), value: "", disabled: true },
            { label: __("Year", "eventkoi-lite"), value: "event_date_year" },
            { label: __("Month", "eventkoi-lite"), value: "event_date_month" },
            { label: __("Month (short)", "eventkoi-lite"), value: "event_date_month_short" },
            { label: __("Day", "eventkoi-lite"), value: "event_date_day" },
            { label: __("Day name", "eventkoi-lite"), value: "event_date_day_name" },
            { label: __("ISO date", "eventkoi-lite"), value: "event_date_iso" },

            { label: __("— Calendar & location —", "eventkoi-lite"), value: "", disabled: true },
            { label: __("Calendar name", "eventkoi-lite"), value: "event_calendar" },
            { label: __("Calendar link (HTML)", "eventkoi-lite"), value: "event_calendar_link" },
            { label: __("Calendar URL", "eventkoi-lite"), value: "event_calendar_url" },
            { label: __("Location (text)", "eventkoi-lite"), value: "event_location" },
            { label: __("Location name", "eventkoi-lite"), value: "event_location_name" },
            { label: __("Location address", "eventkoi-lite"), value: "event_location_address" },
            { label: __("Location apartment/unit", "eventkoi-lite"), value: "event_location_unit" },
            { label: __("Location city", "eventkoi-lite"), value: "event_location_city" },
            { label: __("Location state", "eventkoi-lite"), value: "event_location_state" },
            { label: __("Location country", "eventkoi-lite"), value: "event_location_country" },
            { label: __("Location post code", "eventkoi-lite"), value: "event_location_zip" },
            { label: __("Google map", "eventkoi-lite"), value: "event_gmap" },
            { label: __("Image URL", "eventkoi-lite"), value: "event_image_url" },
            { label: __("Details", "eventkoi-lite"), value: "event_details" },

            { label: __("— Tickets —", "eventkoi-lite"), value: "", disabled: true },
            { label: __("Capacity (total)", "eventkoi-lite"), value: "event_capacity" },
            { label: __("Capacity remaining", "eventkoi-lite"), value: "event_capacity_remaining" },
            { label: __("Capacity sold", "eventkoi-lite"), value: "event_capacity_sold" },
            { label: __("Sold out message", "eventkoi-lite"), value: "event_sold_out" },
            { label: __("Low stock message", "eventkoi-lite"), value: "event_low_stock" },
            { label: __("Ticket count (types)", "eventkoi-lite"), value: "event_ticket_count" },
            { label: __("Ticket summary", "eventkoi-lite"), value: "event_ticket_summary" },
            { label: __("Price (from)", "eventkoi-lite"), value: "event_ticket_price_from" },
            { label: __("Price (to)", "eventkoi-lite"), value: "event_ticket_price_to" },
            { label: __("Price range", "eventkoi-lite"), value: "event_ticket_price_range" },
            { label: __("Sales start", "eventkoi-lite"), value: "event_sales_start" },
            { label: __("Sales end", "eventkoi-lite"), value: "event_sales_end" },

            { label: __("— RSVP —", "eventkoi-lite"), value: "", disabled: true },
            { label: __("RSVP capacity", "eventkoi-lite"), value: "event_rsvp_capacity" },
            { label: __("RSVP remaining", "eventkoi-lite"), value: "event_rsvp_remaining" },
            { label: __("RSVP going", "eventkoi-lite"), value: "event_rsvp_going" },
            { label: __("RSVP full", "eventkoi-lite"), value: "event_rsvp_full" },
];

/**
 * Human label for a stored field value, or an empty string when unknown.
 *
 * @param {string} value Stored `field` attribute.
 * @return {string} Translated label.
 */
export const getEventDataFieldLabel = (value) => {
  const match = getEventDataFieldOptions().find(
    (option) => !option.disabled && option.value === value
  );
  return match ? match.label : "";
};
