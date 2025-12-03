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
      <PanelBody title={__("Event Data Field", "eventkoi")} initialOpen={true}>
        <SelectControl
          label={__("Field", "eventkoi")}
          value={field}
          options={[
            { label: __("Title", "eventkoi"), value: "title" },
            {
              label: __("Excerpt / Description", "eventkoi"),
              value: "excerpt",
            },
            { label: __("Date and Time", "eventkoi"), value: "timeline" },
            { label: __("Location", "eventkoi"), value: "location" },
            { label: __("Image", "eventkoi"), value: "image" },
          ]}
          onChange={(val) => setAttributes({ field: val })}
        />
      </PanelBody>

      {/* ---------------------------------- */}
      {/* Event Source Panel (hidden when inside Event Query) */}
      {/* ---------------------------------- */}
      {!disableEventSource && (
        <PanelBody title={__("Event Source", "eventkoi")} initialOpen={true}>
          <ComboboxControl
            label={__("Select Event", "eventkoi")}
            help={__(
              "Choose which event to display. If no event is selected, this block will remain empty when used outside a query.",
              "eventkoi"
            )}
            value={eventId > 0 ? String(eventId) : ""}
            options={options}
            onChange={(val) =>
              setAttributes({ eventId: parseInt(val, 10) || 0 })
            }
            onFilterValueChange={setSearchValue}
            placeholder={__("Search events…", "eventkoi")}
            isLoading={isLoading || isLoadingEvent}
          />

          {isLoadingEvent && (
            <div className="flex items-center gap-2 text-xs opacity-70 mt-1">
              <Spinner />
              {__("Loading selected event…", "eventkoi")}
            </div>
          )}

          {eventId > 0 && !isLoadingEvent && (
            <p className="text-xs opacity-60 mt-1">
              {__("Displaying data for the selected event.", "eventkoi")}
            </p>
          )}

          {eventId === 0 && (
            <p className="text-xs opacity-60 mt-1">
              {__(
                "No specific event selected — will use context if available, or remain empty if used outside an Event Query.",
                "eventkoi"
              )}
            </p>
          )}
        </PanelBody>
      )}
    </>
  );
}
