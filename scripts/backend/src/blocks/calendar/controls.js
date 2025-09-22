import { useEffect, useState } from "react";

import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";

import {
  PanelBody,
  SelectControl,
  __experimentalToggleGroupControl as ToggleGroupControl,
  __experimentalToggleGroupControlOption as ToggleGroupControlOption,
  __experimentalToolsPanel as ToolsPanel,
} from "@wordpress/components";

import { ColorSettingsPane } from "@/block-panels/colors.js";

import { MultiSelectControl } from "@codeamp/block-components";

export const Controls = (props) => {
  const [items, setItems] = useState([]);

  const { attributes, setAttributes, calendar, setView } = props;

  const startday = attributes?.startday
    ? attributes.startday
    : calendar?.startday;

  const timeframe = attributes?.timeframe
    ? attributes.timeframe
    : calendar?.timeframe;

  const resetColors = () => {
    setAttributes({
      color: undefined,
    });
  };

  const colors = [{ value: "color", label: __("Accent", "eventkoi") }];

  const getCalendars = async () => {
    let response = await apiRequest({
      path: `${eventkoi_params.api}/calendars`,
      method: "get",
    })
      .then((response) => {
        if (response) {
          let calendars = [];
          response.map((calendar, index) => {
            calendars.push({ label: calendar.name, value: calendar.id });
          });
          setItems(calendars);
        }
      })
      .catch((error) => {});
  };

  useEffect(() => {
    getCalendars();
  }, []);

  useEffect(() => {
    if (
      items.length > 0 &&
      (!attributes.calendars || attributes.calendars.length === 0)
    ) {
      setAttributes({ calendars: [Number(eventkoi_params.default_cal)] });
    }
  }, [items, attributes.calendars]);

  return (
    <>
      <PanelBody title={__("Display options", "eventkoi")} initialOpen={true}>
        {items && items.length > 0 && (
          <MultiSelectControl
            label={__("Select calendar(s)", "eventkoi")}
            value={attributes.calendars || []}
            options={items}
            onChange={(selected) => {
              setAttributes({ calendars: selected });
            }}
            __nextHasNoMarginBottom
          />
        )}
        <ToggleGroupControl
          label={__("Timeframe defaults to", "eventkoi")}
          value={timeframe}
          isBlock
          onChange={(newValue) => {
            setAttributes({ timeframe: newValue });
            if (newValue === "week") {
              setView("timeGridWeek");
            } else {
              setView("dayGridMonth");
            }
          }}
          __nextHasNoMarginBottom
        >
          <ToggleGroupControlOption value="month" label="Month" />
          <ToggleGroupControlOption value="week" label="Week" />
        </ToggleGroupControl>

        <SelectControl
          label={__("Default month to display", "eventkoi")}
          value={attributes.default_month || ""}
          options={[
            { label: __("Current month", "eventkoi"), value: "" },
            { label: __("January", "eventkoi"), value: "january" },
            { label: __("February", "eventkoi"), value: "february" },
            { label: __("March", "eventkoi"), value: "march" },
            { label: __("April", "eventkoi"), value: "april" },
            { label: __("May", "eventkoi"), value: "may" },
            { label: __("June", "eventkoi"), value: "june" },
            { label: __("July", "eventkoi"), value: "july" },
            { label: __("August", "eventkoi"), value: "august" },
            { label: __("September", "eventkoi"), value: "september" },
            { label: __("October", "eventkoi"), value: "october" },
            { label: __("November", "eventkoi"), value: "november" },
            { label: __("December", "eventkoi"), value: "december" },
          ]}
          onChange={(newMonth) => setAttributes({ default_month: newMonth })}
          __nextHasNoMarginBottom
        />

        <SelectControl
          label={__("Default year to display", "eventkoi")}
          value={attributes.default_year || ""}
          options={[
            { label: __("Current year", "eventkoi"), value: "" },
            ...Array.from({ length: 10 }, (_, i) => {
              const year = new Date().getFullYear() + i + 1;
              return { label: String(year), value: String(year) };
            }),
          ]}
          onChange={(newYear) => setAttributes({ default_year: newYear })}
          __nextHasNoMarginBottom
        />

        <SelectControl
          label={__("Week starts on", "eventkoi")}
          value={startday}
          options={[
            { label: "Monday", value: "monday" },
            { label: "Tuesday", value: "tuesday" },
            { label: "Wednesday", value: "wednesday" },
            { label: "Thursday", value: "thursday" },
            { label: "Friday", value: "friday" },
            { label: "Saturday", value: "saturday" },
            { label: "Sunday", value: "sunday" },
          ]}
          onChange={(newStartday) => setAttributes({ startday: newStartday })}
          __nextHasNoMarginBottom
        />
      </PanelBody>
      <ToolsPanel
        label={__("Colors")}
        resetAll={resetColors}
        hasInnerWrapper={true}
        className="color-block-support-panel"
      >
        <ColorSettingsPane
          attributes={attributes}
          setAttributes={setAttributes}
          colors={colors}
        />
      </ToolsPanel>
    </>
  );
};
