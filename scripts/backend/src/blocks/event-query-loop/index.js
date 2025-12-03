import { registerBlockVariation } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { icon } from "./icon";
import { withEventKoiQueryData } from "./editor-preview";
import { addFilter } from "@wordpress/hooks";
import "./autofill-image";
import "./register-filters";

const BLOCK_NAME = "eventkoi/event-query-loop";

const QUERY_DEFAULTS = {
	perPage: 6,
	pages: 0,
	offset: 0,
	postType: "eventkoi_event",
	order: "desc",
	orderBy: "modified",
	author: "",
	search: "",
	sticky: "",
	inherit: false,
};

const getDefaultQuery = () => ({ ...QUERY_DEFAULTS });

const QUERY_TEMPLATE = [
	[
		"core/post-template",
		{ layout: { type: "constrained" } },
		[
			[
				"eventkoi/event-query-item",
				{},
				[
					[
						"core/group",
						{
							layout: { type: "default" },
							className: "eventkoi-event-loop-card",
						},
						[
							["core/image", { className: "eventkoi-event-image-default" }],
							[
								"eventkoi/event-data",
								{ field: "title", className: "ek-event-title-default" },
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
	[
		"core/query-pagination",
		{ layout: { type: "flex", justifyContent: "space-between" } },
		[
			["core/query-pagination-previous", { label: __("Previous", "eventkoi") }],
			["core/query-pagination-numbers", {}],
			["core/query-pagination-next", { label: __("Next", "eventkoi") }],
		],
	],
	[
		"core/query-no-results",
		{},
		[["core/paragraph", { placeholder: __("No events found.", "eventkoi") }]],
	],
];

if (registerBlockVariation) {
	registerBlockVariation("core/query", {
		name: BLOCK_NAME,
		title: __("EK Event Query Loop", "eventkoi"),
		description: __(
			"Display EventKoi events using Query Loop controls.",
			"eventkoi"
		),
		icon,
		attributes: {
			namespace: BLOCK_NAME,
			className: "eventkoi-query-loop",
			query: getDefaultQuery(),
			displayLayout: {
				type: "list",
				columns: 1,
			},
		},
		category: "eventkoi-blocks",
		innerBlocks: QUERY_TEMPLATE,
		allowedControls: [],
		scope: ["block", "inserter"],
		isActive: (blockAttributes) => {
			if (!blockAttributes) {
				return false;
			}

			if (blockAttributes?.namespace === BLOCK_NAME) {
				return true;
			}

			return blockAttributes?.query?.postType === "eventkoi_event";
		},
	});
}

addFilter(
	"editor.BlockEdit",
	"eventkoi/event-query-loop/data",
	withEventKoiQueryData
);
