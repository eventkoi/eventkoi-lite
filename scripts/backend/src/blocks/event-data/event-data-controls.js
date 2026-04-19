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
            { label: __("Title", "eventkoi-lite"), value: "title" },
            {
              label: __("Excerpt / Description", "eventkoi-lite"),
              value: "excerpt",
            },
            { label: __("Date and Time", "eventkoi-lite"), value: "timeline" },
            { label: __("Location", "eventkoi-lite"), value: "location" },
            { label: __("Image", "eventkoi-lite"), value: "image" },
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
