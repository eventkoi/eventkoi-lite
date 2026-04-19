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

  const colors = [{ value: "color", label: __("Accent", "eventkoi-lite") }];

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
      const defaultId = Number(eventkoi_params.default_cal);
      const existsInItems = items.some((it) => Number(it.value) === defaultId);
      const seedId = existsInItems ? defaultId : Number(items[0].value);
      if (seedId) {
        setAttributes({ calendars: [seedId] });
      }
    }
  }, [items, attributes.calendars]);

  return (
    <>
      <PanelBody title={__("Display options", "eventkoi-lite")} initialOpen={true}>
        {items && items.length > 0 && (
          <MultiSelectControl
            label={__("Select calendar(s)", "eventkoi-lite")}
            value={attributes.calendars || []}
            options={items}
            onChange={(selected) => {
              setAttributes({ calendars: selected });
            }}
            __nextHasNoMarginBottom
          />
        )}
        <ToggleGroupControl
          label={__("Timeframe defaults to", "eventkoi-lite")}
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
          label={__("Default month to display", "eventkoi-lite")}
          value={attributes.default_month || ""}
          options={[
            { label: __("Current month", "eventkoi-lite"), value: "" },
            { label: __("January", "eventkoi-lite"), value: "january" },
            { label: __("February", "eventkoi-lite"), value: "february" },
            { label: __("March", "eventkoi-lite"), value: "march" },
            { label: __("April", "eventkoi-lite"), value: "april" },
            { label: __("May", "eventkoi-lite"), value: "may" },
            { label: __("June", "eventkoi-lite"), value: "june" },
            { label: __("July", "eventkoi-lite"), value: "july" },
            { label: __("August", "eventkoi-lite"), value: "august" },
            { label: __("September", "eventkoi-lite"), value: "september" },
            { label: __("October", "eventkoi-lite"), value: "october" },
            { label: __("November", "eventkoi-lite"), value: "november" },
            { label: __("December", "eventkoi-lite"), value: "december" },
          ]}
          onChange={(newMonth) => setAttributes({ default_month: newMonth })}
          __nextHasNoMarginBottom
        />

        <SelectControl
          label={__("Default year to display", "eventkoi-lite")}
          value={attributes.default_year || ""}
          options={[
            { label: __("Current year", "eventkoi-lite"), value: "" },
            ...Array.from({ length: 10 }, (_, i) => {
              const year = new Date().getFullYear() + i + 1;
              return { label: String(year), value: String(year) };
            }),
          ]}
          onChange={(newYear) => setAttributes({ default_year: newYear })}
          __nextHasNoMarginBottom
        />

        <SelectControl
          label={__("Week starts on", "eventkoi-lite")}
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
