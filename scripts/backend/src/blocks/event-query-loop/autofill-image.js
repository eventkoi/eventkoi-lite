import { EventContext } from "./context";
import { useSelect } from "@wordpress/data";
import { useContext } from "@wordpress/element";
import { addFilter } from "@wordpress/hooks";

const BLOCK_NAMESPACE = "eventkoi/event-query-loop";

const isInEventKoiQuery = (clientId) => {
	const parents = wp.data
		.select("core/block-editor")
		.getBlockParents(clientId || "");

	if (!parents || !parents.length) {
		return false;
	}

	const { getBlock } = wp.data.select("core/block-editor");

	// Walk up the tree to find the query block.
	return parents.some((parentId) => {
		const block = getBlock(parentId);
		return block?.name === "core/query" && block?.attributes?.namespace === BLOCK_NAMESPACE;
	});
};

addFilter(
	"editor.BlockEdit",
	"eventkoi/event-query-loop/autofill-image",
	(BlockEdit) =>
		function EventKoiImage(props) {
			if (props.name !== "core/image") {
				return <BlockEdit {...props} />;
			}

			// Only run inside our EventKoi Query Loop variation.
			const inQuery = useSelect(
				() => isInEventKoiQuery(props.clientId),
				[props.clientId]
			);

			const { event } = useContext(EventContext);

			if (!inQuery || !event) {
				return <BlockEdit {...props} />;
			}

			// Do not persist attributes; just override for this render so each
			// row can show its own thumbnail.
			const altText =
				event.title?.rendered || event.title || props.attributes?.alt || "";
			const style = { ...(props.attributes?.style || {}) };
			if (!style.width) {
				style.width = "100%";
			}
			if (!style.height) {
				style.height = "auto";
			}

			return (
				<BlockEdit
					{...props}
					attributes={{
						...props.attributes,
						url: event.thumbnail || props.attributes?.url || "",
						alt: altText,
						style,
					}}
				/>
			);
		}
);
