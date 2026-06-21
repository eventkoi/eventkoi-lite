import { DateRangeControls } from "@/block-panels/date-range-controls";
import { SegmentedControl } from "@/block-panels/segmented-control";
import { MultiSelectControl } from "@codeamp/block-components";
import apiFetch from "@wordpress/api-fetch";
import { InspectorControls } from "@wordpress/block-editor";
import { createBlocksFromInnerBlocksTemplate } from "@wordpress/blocks";
import {
  PanelBody,
  RangeControl,
  SelectControl,
} from "@wordpress/components";
import { createHigherOrderComponent } from "@wordpress/compose";
import { useDispatch, useSelect } from "@wordpress/data";
import { useEffect, useState } from "@wordpress/element";
import { addFilter } from "@wordpress/hooks";
import { __ } from "@wordpress/i18n";

const EVENTKOI_NAMESPACE = "eventkoi/event-query-loop";

addFilter(
  "blocks.registerBlockType",
  "eventkoi/query-loop-attributes",
  (settings, name) => {
    if (name !== "core/query") {
      return settings;
    }

    return {
      ...settings,
      attributes: {
        ...settings.attributes,
        calendars: {
          type: "array",
          default: [],
        },
        namespace: {
          type: "string",
          default: "",
        },
        listLayoutStyle: {
          type: "string",
          default: "stack",
        },
      },
    };
  }
);

const withEventKoiQueryControls = createHigherOrderComponent(
  (BlockEdit) => (props) => {
    if (
      props.name !== "core/query" ||
      props.attributes?.namespace !== EVENTKOI_NAMESPACE
    ) {
      return <BlockEdit {...props} />;
    }

    const [calendars, setCalendars] = useState([]);
    const handleCalendarsChange = (selected) => {
      const terms = Array.isArray(selected) ? selected : [];
      const currentQuery = props.attributes?.query || {};
      const eventCalParam = terms.length > 0 ? terms.join(",") : undefined;

      props.setAttributes({
        calendars: terms,
        query: {
          ...currentQuery,
          postType: "eventkoi_event",
          event_cal: eventCalParam,
          taxQuery:
            terms.length > 0
              ? [
                  {
                    taxonomy: "event_cal",
                    field: "term_id",
                    terms,
                    includeChildren: false,
                  },
                ]
              : [],
        },
      });
    };

    const postTemplateClientId = useSelect(
      (select) => {
        const { getBlockOrder, getBlock } = select("core/block-editor");
        const childIds = getBlockOrder(props.clientId) || [];

        return childIds.find((childId) => {
          const childBlock = getBlock(childId);
          return childBlock?.name === "core/post-template";
        });
      },
      [props.clientId]
    );

    const postTemplateLayout = useSelect(
      (select) => {
        if (!postTemplateClientId) {
          return null;
        }

        return select("core/block-editor").getBlock(postTemplateClientId)
          ?.attributes?.layout;
      },
      [postTemplateClientId]
    );

    const { updateBlockAttributes, replaceInnerBlocks } =
      useDispatch("core/block-editor");

    const currentFormat = postTemplateLayout?.type === "grid" ? "grid" : "list";
    const currentColumns =
      postTemplateLayout?.type === "grid"
        ? postTemplateLayout?.columnCount || 3
        : 3;
    const currentListLayout = props.attributes?.listLayoutStyle || "stack";

    const currentPerPage = props.attributes?.query?.perPage ?? 6;
    const currentOrder = props.attributes?.query?.order || "asc";
    const currentOrderBy = props.attributes?.query?.orderBy || "upcoming";

    const handlePerPageChange = (value) => {
      const perPage = value || 1;
      props.setAttributes({
        query: {
          ...props.attributes.query,
          perPage,
        },
      });
    };

    const handleOrderByChange = (value) => {
      props.setAttributes({
        query: {
          ...props.attributes.query,
          orderBy: value,
          ...(value === "upcoming" ? { order: "asc" } : {}),
        },
      });
    };

    const handleOrderChange = (value) => {
      props.setAttributes({
        query: {
          ...props.attributes.query,
          order: value,
        },
      });
    };

    const handleDisplayFormatChange = (format) => {
      if (!postTemplateClientId) {
        return;
      }

      const nextLayout =
        format === "grid"
          ? {
              type: "grid",
              columnCount: currentColumns,
            }
          : { type: "default" };

      updateBlockAttributes(postTemplateClientId, {
        layout: nextLayout,
      });
    };

    const handleColumnsChange = (value) => {
      if (!postTemplateClientId) {
        return;
      }

      const columns = value || 1;

      updateBlockAttributes(postTemplateClientId, {
        layout: {
          type: "grid",
          columnCount: columns,
        },
      });
    };

    const STACK_TEMPLATE = [
      [
        "eventkoi/event-query-item",
        {},
        [
          [
            "core/group",
            {
              className: "eventkoi-event-loop-card",
              layout: { type: "default" },
            },
            [
              [
                "core/post-featured-image",
                { className: "eventkoi-event-image-default" },
              ],
              [
                "eventkoi/event-data",
                { field: "title", className: "ek-event-title-default" },
              ],
              [
                "eventkoi/event-data",
                { field: "timeline", className: "ek-event-timeline-default" },
              ],
              ["eventkoi/event-data", { field: "excerpt" }],
              [
                "eventkoi/event-data",
                { field: "location", className: "ek-event-location-default" },
              ],
            ],
          ],
        ],
      ],
    ];

    const IMAGE_LEFT_TEMPLATE = [
      [
        "eventkoi/event-query-item",
        {},
        [
          [
            "core/group",
            {
              className: "eventkoi-event-loop-card",
              layout: { type: "default" },
            },
            [
              [
                "core/columns",
                { isStackedOnMobile: true },
                [
                  [
                    "core/column",
                    { width: "30%" },
                    [
                      [
                        "core/post-featured-image",
                        { className: "eventkoi-event-image-default" },
                      ],
                    ],
                  ],
                  [
                    "core/column",
                    { width: "70%" },
                    [
                      [
                        "eventkoi/event-data",
                        {
                          field: "title",
                          className: "ek-event-title-default",
                        },
                      ],
                      [
                        "eventkoi/event-data",
                        {
                          field: "timeline",
                          className: "ek-event-timeline-default",
                        },
                      ],
                      ["eventkoi/event-data", { field: "excerpt" }],
                      [
                        "eventkoi/event-data",
                        {
                          field: "location",
                          className: "ek-event-location-default",
                        },
                      ],
                    ],
                  ],
                ],
              ],
            ],
          ],
        ],
      ],
    ];

    const IMAGE_RIGHT_TEMPLATE = [
      [
        "eventkoi/event-query-item",
        {},
        [
          [
            "core/group",
            {
              className: "eventkoi-event-loop-card",
              layout: { type: "default" },
            },
            [
              [
                "core/columns",
                { isStackedOnMobile: true },
                [
                  [
                    "core/column",
                    { width: "70%" },
                    [
                      [
                        "eventkoi/event-data",
                        {
                          field: "title",
                          className: "ek-event-title-default",
                        },
                      ],
                      [
                        "eventkoi/event-data",
                        {
                          field: "timeline",
                          className: "ek-event-timeline-default",
                        },
                      ],
                      ["eventkoi/event-data", { field: "excerpt" }],
                      [
                        "eventkoi/event-data",
                        {
                          field: "location",
                          className: "ek-event-location-default",
                        },
                      ],
                    ],
                  ],
                  [
                    "core/column",
                    { width: "30%" },
                    [
                      [
                        "core/post-featured-image",
                        { className: "eventkoi-event-image-default" },
                      ],
                    ],
                  ],
                ],
              ],
            ],
          ],
        ],
      ],
    ];

    const applyListTemplate = (layout) => {
      if (!postTemplateClientId) {
        return;
      }

      let template = STACK_TEMPLATE;
      if (layout === "image-left") {
        template = IMAGE_LEFT_TEMPLATE;
      } else if (layout === "image-right") {
        template = IMAGE_RIGHT_TEMPLATE;
      }

      const newBlocks = createBlocksFromInnerBlocksTemplate(template);
      replaceInnerBlocks(postTemplateClientId, newBlocks);
      props.setAttributes({ listLayoutStyle: layout });
    };

    // When switching to Grid, reset the saved list layout to the default (stack)
    // so returning to List uses the base template.
    useEffect(() => {
      if (currentFormat === "grid" && currentListLayout !== "stack") {
        props.setAttributes({ listLayoutStyle: "stack" });
        applyListTemplate("stack");
      }
    }, [currentFormat, currentListLayout]);

    useEffect(() => {
      apiFetch({ path: `${eventkoi_params.api}/calendars`, method: "GET" })
        .then((response) => {
          if (Array.isArray(response)) {
            setCalendars(
              response.map((cal) => ({
                label: cal.name,
                value: cal.id,
              }))
            );
          }
        })
        .catch(() => {});
    }, []);

    // Ensure query.taxQuery stays in sync with saved calendars for editor previews.
    useEffect(() => {
      const savedCalendars = props.attributes?.calendars || [];
      const currentTax = props.attributes?.query?.taxQuery || [];
      const hasTax = Array.isArray(currentTax) && currentTax.length > 0;
      const hasEventCalParam = !!props.attributes?.query?.event_cal;

      if (savedCalendars.length > 0 && (!hasTax || !hasEventCalParam)) {
        handleCalendarsChange(savedCalendars);
      }
    }, [props.attributes?.calendars, props.attributes?.query]);

    return (
      <>
        <BlockEdit {...props} />
        <InspectorControls>
          <PanelBody
            title={__("Query Settings", "eventkoi-lite")}
            initialOpen={true}
          >
                    <div className="eventkoi-settings-wrapper space-y-[16px]">
                      <RangeControl
                        label={__("Events per page", "eventkoi-lite")}
                        value={currentPerPage}
                        onChange={handlePerPageChange}
                        min={1}
                        max={40}
                      />

                      <SelectControl
                        label={__("Order by", "eventkoi-lite")}
                        value={currentOrderBy}
                        options={[
                          {
                            label: __("Upcoming events", "eventkoi-lite"),
                            value: "upcoming",
                          },
                          {
                            label: __("Past events", "eventkoi-lite"),
                            value: "past",
                          },
                          {
                            label: __("Event start date", "eventkoi-lite"),
                            value: "start_date",
                          },
                          {
                            label: __("Publish date", "eventkoi-lite"),
                            value: "date",
                          },
                          {
                            label: __("Last modified", "eventkoi-lite"),
                            value: "modified",
                          },
                          { label: __("Title", "eventkoi-lite"), value: "title" },
                        ]}
                        onChange={handleOrderByChange}
                      />

                      <SelectControl
                        label={__("Order direction", "eventkoi-lite")}
                        value={currentOrder}
                        options={[
                          { label: __("Ascending", "eventkoi-lite"), value: "asc" },
                          {
                            label: __("Descending", "eventkoi-lite"),
                            value: "desc",
                          },
                        ]}
                        onChange={handleOrderChange}
                      />

                      {calendars.length > 0 && (
                        <MultiSelectControl
                          label={__("Select calendar(s)", "eventkoi-lite")}
                          value={props.attributes?.calendars || []}
                          options={calendars}
                          onChange={handleCalendarsChange}
                        />
                      )}

                      <DateRangeControls
                        attributes={props.attributes}
                        setAttributes={props.setAttributes}
                      />
                    </div>
          </PanelBody>
        </InspectorControls>
        <InspectorControls group="styles">
          <PanelBody
            title={__("Layout & Design", "eventkoi-lite")}
            initialOpen={true}
          >
                    <div className="eventkoi-settings-wrapper space-y-[16px]">
                      <div className="eventkoi-style-settings">
                        <SegmentedControl
                          label={__("Layout", "eventkoi-lite")}
                          value={currentFormat}
                          onChange={handleDisplayFormatChange}
                          options={[
                            { label: __("Grid", "eventkoi-lite"), value: "grid" },
                            { label: __("List", "eventkoi-lite"), value: "list" },
                          ]}
                        />
                      </div>

                      {currentFormat === "grid" && (
                        <RangeControl
                          label={__("Columns", "eventkoi-lite")}
                          value={currentColumns}
                          onChange={handleColumnsChange}
                          min={1}
                          max={6}
                        />
                      )}

                      {currentFormat === "list" && (
                        <SegmentedControl
                          label={__("List layout", "eventkoi-lite")}
                          value={currentListLayout}
                          onChange={applyListTemplate}
                          options={[
                            {
                              label: __("Stacked", "eventkoi-lite"),
                              value: "stack",
                            },
                            {
                              label: __("Image left", "eventkoi-lite"),
                              value: "image-left",
                            },
                            {
                              label: __("Image right", "eventkoi-lite"),
                              value: "image-right",
                            },
                          ]}
                        />
                      )}

                      {currentFormat === "list" && (
                        <p className="components-base-control__help">
                          {__(
                            "Changing list layouts rebuilds the template and may reset custom styling inside the item.",
                            "eventkoi-lite"
                          )}
                        </p>
                      )}
                    </div>
          </PanelBody>
        </InspectorControls>
      </>
    );
  },
  "eventkoiWithQueryControls"
);

addFilter(
  "editor.BlockEdit",
  "eventkoi/event-query-controls",
  withEventKoiQueryControls
);
