import { useEffect, useState } from "react";

import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";

import {
  PanelBody,
  SelectControl,
  __experimentalUnitControl as UnitControl,
} from "@wordpress/components";

import { MultiSelectControl } from "@codeamp/block-components";

import { Grid } from "@/block-panels/grid";
import { ShowHide } from "@/block-panels/show-hide";

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

  const units = [{ value: "px", label: "px", default: 0 }];

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
      </PanelBody>
      <PanelBody
        title={__("Show/hide components", "eventkoi")}
        initialOpen={true}
      >
        <ShowHide
          id="showImage"
          label={__("Featured image", "eventkoi")}
          attributes={attributes}
          setAttributes={setAttributes}
        ></ShowHide>
        <ShowHide
          id="showLocation"
          label={__("Location", "eventkoi")}
          attributes={attributes}
          setAttributes={setAttributes}
        ></ShowHide>
        <ShowHide
          id="showDescription"
          label={__("Description", "eventkoi")}
          attributes={attributes}
          setAttributes={setAttributes}
        ></ShowHide>
      </PanelBody>
      <PanelBody title={__("Design options", "eventkoi")} initialOpen={true}>
        <Grid>
          <SelectControl
            label="Line style"
            value={attributes.borderStyle}
            options={[
              { label: "Solid", value: "solid" },
              { label: "Dotted", value: "dotted" },
              { label: "Dashed", value: "dashed" },
              { label: "Double", value: "double" },
              { label: "None", value: "none" },
            ]}
            onChange={(value) => setAttributes({ borderStyle: value })}
            __next40pxDefaultSize
            __nextHasNoMarginBottom
          />
          <UnitControl
            label="Thickness"
            __next40pxDefaultSize
            onChange={(value) => setAttributes({ borderSize: value })}
            value={attributes.borderSize}
            units={units}
          />
        </Grid>
      </PanelBody>
    </>
  );
};
