import { createHigherOrderComponent } from "@wordpress/compose";
import { createElement } from "@wordpress/element";
import { addFilter } from "@wordpress/hooks";

const BLOCK_NAMESPACE = "eventkoi/event-query-loop";

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
	textAlign: { type: "string", default: "" },
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

const withEventKoiTextAlignClass = createHigherOrderComponent(
	(BlockListBlock) => (props) => {
		if (
			props.name !== "core/query" ||
			props.attributes?.namespace !== BLOCK_NAMESPACE
		) {
			return createElement(BlockListBlock, props);
		}

		const textAlign = props.attributes?.textAlign;
		if (!textAlign) {
			return createElement(BlockListBlock, props);
		}

		const className = [props.className, `has-text-align-${textAlign}`]
			.filter(Boolean)
			.join(" ");

		return createElement(BlockListBlock, { ...props, className });
	},
	"withEventKoiTextAlignClass"
);

addFilter(
	"editor.BlockListBlock",
	"eventkoi/event-query-loop/text-align-class",
	withEventKoiTextAlignClass
);
