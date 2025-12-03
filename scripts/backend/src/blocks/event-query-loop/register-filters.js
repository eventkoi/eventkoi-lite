import { addFilter } from "@wordpress/hooks";

/**
 * Extend the core/query block with EventKoi-specific filtering attributes.
 * Mirrors legacy event-query controls so the editor can persist these values.
 */
const EXTRA_ATTRIBUTES = {
	calendars: { type: "array", default: [] },
	startDate: { type: "string", default: "" },
	endDate: { type: "string", default: "" },
	includeInstances: { type: "boolean", default: false },
	instanceParentId: { type: "integer", default: 0 },
	showInstancesForEvent: { type: "boolean", default: false },
	eventkoiSig: { type: "string", default: "" }, // cache-bust key for editor fetches.
};

addFilter(
	"blocks.registerBlockType",
	"eventkoi/event-query-loop/extend-query-attributes",
	(settings, name) => {
		if (name !== "core/query") {
			return settings;
		}

		return {
			...settings,
			attributes: {
				...settings.attributes,
				...EXTRA_ATTRIBUTES,
			},
		};
	}
);
