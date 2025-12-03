/**
 * External dependencies.
 */
import { useState } from "@wordpress/element";

/**
 * WordPress dependencies.
 */
import { Button, DatePicker, Popover } from "@wordpress/components";
import { dateI18n } from "@wordpress/date";
import { __ } from "@wordpress/i18n";

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

  /**
   * Use the user's original handleSelect (no normalization).
   */
  const handleSelect = (field, date) => {
    setAttributes({ [field]: date });
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
          {__("Start Date", "eventkoi")}
        </label>

        <DateTrigger
          label={
            attributes.startDate
              ? dateI18n("F j, Y", attributes.startDate)
              : __("Select Date", "eventkoi")
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
            {__("Clear Date", "eventkoi")}
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
          {__("End Date (Optional)", "eventkoi")}
        </label>

        <DateTrigger
          label={
            attributes.endDate
              ? dateI18n("F j, Y", attributes.endDate)
              : __("Select Date", "eventkoi")
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
            {__("Clear Date", "eventkoi")}
          </Button>
        )}
      </div>
    </div>
  );
};
