/**
 * External dependencies.
 */
import { useState } from "@wordpress/element";
import { DateTime } from "luxon";

/**
 * WordPress dependencies.
 */
import { Button, DatePicker, Popover } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

import { formatWpDateTime } from "@/lib/date-utils";

function getFormatParams() {
  return typeof eventkoi_params !== "undefined" ? eventkoi_params : {};
}

function normalizeDateValue(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return DateTime.fromJSDate(value).toISODate();
  }

  const raw = String(value);
  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})/);

  if (dateOnly) {
    return dateOnly[1];
  }

  const parsed = DateTime.fromISO(raw);
  return parsed.isValid ? parsed.toISODate() : raw;
}

function formatDateValue(value) {
  const date = normalizeDateValue(value);

  if (!date) {
    return "";
  }

  const params = getFormatParams();
  const locale = (params.locale || "en").replace("_", "-");
  const dt = DateTime.fromISO(date, { zone: "utc" }).setLocale(locale);

  return formatWpDateTime(dt, params.date_format || "F j, Y");
}

/**
 * Date Range Controls for EventKoi Event Query block.
 *
 * Allows selecting a start and optional end date using
 * WordPress native date pickers. Dates are normalized to
 * 'YYYY-MM-DD' format for consistent REST query handling.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes      Block attributes.
 * @param {Function} props.setAttributes   Setter for block attributes.
 * @return {JSX.Element} Date range control panel.
 */
export const DateRangeControls = ({ attributes, setAttributes }) => {
  const [openPicker, setOpenPicker] = useState(null);

  const handleSelect = (field, date) => {
    setAttributes({ [field]: normalizeDateValue(date) });
    setOpenPicker(null);
  };

  /**
   * Reusable clickable trigger styled as a button.
   * Uses role="button" to avoid nested <button> issues.
   */
  const DateTrigger = ({ label, onClick }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick(e)}
      className="components-button is-secondary"
      style={{
        display: "block",
        width: "100%",
        textAlign: "center",
        fontSize: "14px",
        padding: "12px",
        cursor: "pointer",
        height: "auto",
      }}
    >
      {label}
    </div>
  );

  return (
    <div>
      {/* Start Date */}
      <div style={{ marginBottom: "24px" }}>
        <label
          htmlFor="eventkoi-start-date"
          style={{
            fontWeight: 500,
            fontSize: "11px",
            textTransform: "uppercase",
            display: "block",
            marginBottom: "8px",
          }}
        >
          {__("Start Date", "eventkoi-lite")}
        </label>

        <DateTrigger
          label={
            attributes.startDate
              ? formatDateValue(attributes.startDate)
              : __("Select Date", "eventkoi-lite")
          }
          onClick={() => setOpenPicker(openPicker === "start" ? null : "start")}
        />

        {openPicker === "start" && (
          <Popover
            placement="top-end"
            onClose={() => setOpenPicker(null)}
            focusOnMount={false}
            noArrow
          >
            <div style={{ padding: "10px" }}>
              <DatePicker
                currentDate={attributes.startDate || undefined}
                onChange={(date) => handleSelect("startDate", date)}
              />
            </div>
          </Popover>
        )}

        {attributes.startDate && (
          <Button
            variant="link"
            isDestructive
            onClick={() => handleSelect("startDate", "")}
            style={{
              display: "block",
              marginTop: "6px",
              fontSize: "12px",
              padding: 0,
              textAlign: "left",
              width: "100%",
            }}
          >
            {__("Clear Date", "eventkoi-lite")}
          </Button>
        )}
      </div>

      {/* End Date */}
      <div>
        <label
          htmlFor="eventkoi-end-date"
          style={{
            fontWeight: 500,
            fontSize: "11px",
            textTransform: "uppercase",
            display: "block",
            marginBottom: "8px",
          }}
        >
          {__("End Date (Optional)", "eventkoi-lite")}
        </label>

        <DateTrigger
          label={
            attributes.endDate
              ? formatDateValue(attributes.endDate)
              : __("Select Date", "eventkoi-lite")
          }
          onClick={() => setOpenPicker(openPicker === "end" ? null : "end")}
        />

        {openPicker === "end" && (
          <Popover
            placement="top-end"
            onClose={() => setOpenPicker(null)}
            focusOnMount={false}
            noArrow
          >
            <div style={{ padding: "10px" }}>
              <DatePicker
                currentDate={attributes.endDate || undefined}
                onChange={(date) => handleSelect("endDate", date)}
              />
            </div>
          </Popover>
        )}

        {attributes.endDate && (
          <Button
            variant="link"
            isDestructive
            onClick={() => handleSelect("endDate", "")}
            style={{
              display: "block",
              marginTop: "6px",
              fontSize: "12px",
              padding: 0,
              textAlign: "left",
              width: "100%",
            }}
          >
            {__("Clear Date", "eventkoi-lite")}
          </Button>
        )}
      </div>
    </div>
  );
};
