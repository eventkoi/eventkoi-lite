import {
  ComboboxControl,
  PanelBody,
  SelectControl,
  Spinner,
  TextControl,
} from "@wordpress/components";
import { useEffect, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { getEventDataFieldOptions } from "./event-data-fields";
import apiRequest from "@wordpress/api-fetch";
import { useEventOptions } from "./fetch-event";

const DATE_TIME_FIELDS = new Set([
  "timeline",
  "event_datetime",
  "event_datetime_with_summary",
  "event_date",
  "event_time",
  "event_timezone",
  "event_date_type",
  "event_rulesummary",
  "event_date_year",
  "event_date_month",
  "event_date_month_short",
  "event_date_day",
  "event_date_day_name",
  "event_date_iso",
]);

// Fields whose output a custom PHP "date format" string applies to.
const FORMATTABLE_DATE_FIELDS = new Set([
  "event_datetime",
  "event_datetime_with_summary",
  "event_date",
]);

// Fields whose output a custom PHP "time format" string applies to.
const FORMATTABLE_TIME_FIELDS = new Set([
  "event_datetime",
  "event_datetime_with_summary",
  "event_time",
]);

const getSettingsUrl = () => {
  const ajaxUrl = window.eventkoi_params?.ajax_url || "";
  if (ajaxUrl) {
    return ajaxUrl.replace(/admin-ajax\.php.*$/, "admin.php?page=eventkoi#/settings");
  }
  return "admin.php?page=eventkoi#/settings";
};

export function EventDataControls({
  attributes,
  setAttributes,
  isLoadingEvent,
  disableEventSource = false,
}) {
  const { field, eventId, dateFormat, timeFormat } = attributes;
  const [searchValue, setSearchValue] = useState("");
  const { options, isLoading } = useEventOptions(searchValue, eventId);
  const isDateTimeField = DATE_TIME_FIELDS.has(field);
  const showDateFormat = FORMATTABLE_DATE_FIELDS.has(field);
  const showTimeFormat = FORMATTABLE_TIME_FIELDS.has(field);
  const settingsUrl = getSettingsUrl();
  const [datePreview, setDatePreview] = useState("");
  const [timePreview, setTimePreview] = useState("");

  // Live sample of the chosen formats. Reuses the settings preview endpoint,
  // which falls back to the global format when a field is left blank.
  useEffect(() => {
    if (!showDateFormat && !showTimeFormat) {
      return undefined;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (dateFormat) params.set("date", dateFormat);
        if (timeFormat) params.set("time", timeFormat);
        const qs = params.toString();
        const res = await apiRequest({
          path:
            `${eventkoi_params.api}/settings/preview-format` +
            (qs ? `?${qs}` : ""),
          method: "GET",
          headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
        });
        if (!cancelled) {
          setDatePreview(res?.date || "");
          setTimePreview(res?.time || "");
        }
      } catch (err) {
        if (!cancelled) {
          setDatePreview("");
          setTimePreview("");
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [dateFormat, timeFormat, showDateFormat, showTimeFormat]);

  return (
    <>
      {/* ---------------------------------- */}
      {/* Field Selection Panel */}
      {/* ---------------------------------- */}
      <PanelBody title={__("Event Data Field", "eventkoi-lite")} initialOpen={true}>
        <SelectControl
          label={__("Field", "eventkoi-lite")}
          value={field}
          options={getEventDataFieldOptions()}
          onChange={(val) => setAttributes({ field: val })}
        />

        {(showDateFormat || showTimeFormat) && (
          <div style={{ marginTop: "12px" }}>
            {showDateFormat && (
              <TextControl
                label={__("Date format (PHP)", "eventkoi-lite")}
                value={dateFormat || ""}
                __next40pxDefaultSize={true}
                __nextHasNoMarginBottom={true}
                placeholder={eventkoi_params?.date_format || "F j, Y"}
                onChange={(val) => setAttributes({ dateFormat: val })}
                help={
                  datePreview
                    ? `${__("Preview:", "eventkoi-lite")} ${datePreview}`
                    : __(
                        "Leave blank to use the global setting.",
                        "eventkoi-lite"
                      )
                }
              />
            )}
            {showTimeFormat && (
              <div style={{ marginTop: "8px" }}>
                <TextControl
                  label={__("Time format (PHP)", "eventkoi-lite")}
                  value={timeFormat || ""}
                  __next40pxDefaultSize={true}
                  __nextHasNoMarginBottom={true}
                  placeholder={eventkoi_params?.time_format_string || "g:i a"}
                  onChange={(val) => setAttributes({ timeFormat: val })}
                  help={
                    timePreview
                      ? `${__("Preview:", "eventkoi-lite")} ${timePreview}`
                      : __(
                          "Leave blank to use the global setting.",
                          "eventkoi-lite"
                        )
                  }
                />
              </div>
            )}
            <p className="text-xs opacity-70 mt-2">
              <a
                href="https://wordpress.org/documentation/article/customize-date-and-time-format/"
                target="_blank"
                rel="noreferrer"
              >
                {__("Format reference", "eventkoi-lite")}
              </a>
            </p>
          </div>
        )}

        {isDateTimeField && !showDateFormat && !showTimeFormat && (
          <p className="text-xs opacity-70 mt-2">
            {__("This field uses the formats configured in", "eventkoi-lite")}{" "}
            <a href={settingsUrl} target="_blank" rel="noreferrer">
              {__("EventKoi settings", "eventkoi-lite")}
            </a>
            .
          </p>
        )}
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
