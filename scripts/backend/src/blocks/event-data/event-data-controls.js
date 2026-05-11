import {
  ComboboxControl,
  PanelBody,
  SelectControl,
  Spinner,
} from "@wordpress/components";
import { useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { useEventOptions } from "./fetch-event";

export function EventDataControls({
  attributes,
  setAttributes,
  isLoadingEvent,
  disableEventSource = false,
}) {
  const { field, eventId } = attributes;
  const [searchValue, setSearchValue] = useState("");
  const { options, isLoading } = useEventOptions(searchValue, eventId);

  return (
    <>
      {/* ---------------------------------- */}
      {/* Field Selection Panel */}
      {/* ---------------------------------- */}
      <PanelBody title={__("Event Data Field", "eventkoi-lite")} initialOpen={true}>
        <SelectControl
          label={__("Field", "eventkoi-lite")}
          value={field}
          options={[
            { label: __("— Primary —", "eventkoi-lite"), value: "", disabled: true },
            { label: __("Title", "eventkoi-lite"), value: "title" },
            { label: __("Excerpt / Description", "eventkoi-lite"), value: "excerpt" },
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
          ]}
          onChange={(val) => setAttributes({ field: val })}
        />
      </PanelBody>

      {/* ---------------------------------- */}
      {/* Event Source Panel (hidden when inside Event Query) */}
      {/* ---------------------------------- */}
      {!disableEventSource && (
        <PanelBody title={__("Event Source", "eventkoi-lite")} initialOpen={true}>
          <ComboboxControl
            label={__("Select Event", "eventkoi-lite")}
            help={__(
              "Choose which event to display. If no event is selected, this block will remain empty when used outside a query.",
              "eventkoi-lite"
            )}
            value={eventId > 0 ? String(eventId) : ""}
            options={options}
            onChange={(val) =>
              setAttributes({ eventId: parseInt(val, 10) || 0 })
            }
            onFilterValueChange={setSearchValue}
            placeholder={__("Search events…", "eventkoi-lite")}
            isLoading={isLoading || isLoadingEvent}
          />

          {isLoadingEvent && (
            <div className="flex items-center gap-2 text-xs opacity-70 mt-1">
              <Spinner />
              {__("Loading selected event…", "eventkoi-lite")}
            </div>
          )}

          {eventId > 0 && !isLoadingEvent && (
            <p className="text-xs opacity-60 mt-1">
              {__("Displaying data for the selected event.", "eventkoi-lite")}
            </p>
          )}

          {eventId === 0 && (
            <p className="text-xs opacity-60 mt-1">
              {__(
                "No specific event selected — will use context if available, or remain empty if used outside an Event Query.",
                "eventkoi-lite"
              )}
            </p>
          )}
        </PanelBody>
      )}
    </>
  );
}
