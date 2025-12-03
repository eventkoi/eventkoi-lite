import { useEvent } from "@/blocks/event-query-loop/context";
import { cn } from "@/lib/utils";
import {
  store as blockEditorStore,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import { cloneBlock, createBlock } from "@wordpress/blocks";
import { useDispatch, useSelect } from "@wordpress/data";
import { useEffect, useRef } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { Image as ImageIcon } from "lucide-react";
import { EventDataControls } from "./event-data-controls";
import { useFetchEvent } from "./fetch-event";

export default function Edit({ attributes, setAttributes, clientId }) {
  const { field, tagName = "div", eventId = 0 } = attributes;

  const blockProps = useBlockProps({
    className: "eventkoi-event-data",
    "data-event-field": field,
  });

  const { event: contextEvent } = useEvent();
  const { event: manualEvent, isLoading: isLoadingEvent } =
    useFetchEvent(eventId);
  const event = manualEvent || contextEvent;
  const TagName = tagName;
  const isInQuery = !!contextEvent;
  const hasMovedIntoItem = useRef(false);

  const {
    isInsideEventQueryLoop,
    hasEventQueryItemParent,
    postTemplateId,
    firstEventQueryItemId,
    groupChildId,
    targetChildCount,
    blockRecord,
  } = useSelect(
    (select) => {
      const editorSelect = select(blockEditorStore);
      if (!clientId) {
        return {
          isInsideEventQueryLoop: false,
          hasEventQueryItemParent: false,
          postTemplateId: null,
          firstEventQueryItemId: null,
          targetChildCount: 0,
          blockRecord: null,
        };
      }

      const parents = editorSelect.getBlockParents(clientId) || [];
      const parentBlocks = parents.map(editorSelect.getBlock);

      const hasEventQueryItemParent = parentBlocks.some(
        (parentBlock) => parentBlock?.name === "eventkoi/event-query-item"
      );

      const isInsideEventQueryLoop = parents.some((parentId) => {
        const parentBlock = editorSelect.getBlock(parentId);
        return (
          parentBlock?.name === "core/query" &&
          parentBlock?.attributes?.namespace === "eventkoi/event-query-loop"
        );
      });

      const postTemplateId =
        parents.find(
          (parentId) =>
            editorSelect.getBlock(parentId)?.name === "core/post-template"
        ) || null;

      let firstEventQueryItemId = null;
      let groupChildId = null;
      let targetChildCount = 0;

      if (postTemplateId) {
        const postTemplateOrder =
          editorSelect.getBlockOrder(postTemplateId) || [];
        firstEventQueryItemId =
          postTemplateOrder.find(
            (childId) =>
              editorSelect.getBlock(childId)?.name ===
              "eventkoi/event-query-item"
          ) || null;

        if (firstEventQueryItemId) {
          const itemChildren =
            editorSelect.getBlockOrder(firstEventQueryItemId) || [];

          groupChildId =
            itemChildren.find(
              (childId) => editorSelect.getBlock(childId)?.name === "core/group"
            ) || null;

          if (groupChildId) {
            targetChildCount = (editorSelect.getBlockOrder(groupChildId) || [])
              .length;
          } else {
            targetChildCount = itemChildren.length;
          }
        }
      }

      return {
        isInsideEventQueryLoop,
        hasEventQueryItemParent,
        postTemplateId,
        firstEventQueryItemId,
        groupChildId,
        targetChildCount,
        blockRecord: editorSelect.getBlock(clientId),
      };
    },
    [clientId]
  );

  const { insertBlocks, removeBlocks } = useDispatch(blockEditorStore);

  useEffect(() => {
    if (contextEvent && eventId > 0) {
      setAttributes({ eventId: 0 });
    }
  }, [contextEvent]);

  // Auto-correct placement when dropped inside the EventKoi Query Loop but
  // outside the EK Event Query Item wrapper so event context is available.
  useEffect(() => {
    if (
      hasMovedIntoItem.current ||
      !clientId ||
      !isInsideEventQueryLoop ||
      hasEventQueryItemParent ||
      !postTemplateId ||
      !blockRecord
    ) {
      return;
    }

    const clonedBlock = cloneBlock(blockRecord);

    if (groupChildId) {
      insertBlocks(clonedBlock, targetChildCount, groupChildId);
    } else if (firstEventQueryItemId) {
      insertBlocks(clonedBlock, targetChildCount, firstEventQueryItemId);
    } else {
      const wrapper = createBlock("eventkoi/event-query-item", {}, [
        clonedBlock,
      ]);
      insertBlocks(wrapper, undefined, postTemplateId);
    }

    hasMovedIntoItem.current = true;
    removeBlocks([clientId], false);
  }, [
    blockRecord,
    clientId,
    firstEventQueryItemId,
    groupChildId,
    hasEventQueryItemParent,
    insertBlocks,
    isInsideEventQueryLoop,
    postTemplateId,
    removeBlocks,
    targetChildCount,
  ]);

  // Always render sidebar controls
  const sidebar = (
    <InspectorControls>
      <EventDataControls
        attributes={attributes}
        setAttributes={setAttributes}
        isLoadingEvent={isLoadingEvent}
        disableEventSource={isInQuery}
      />
    </InspectorControls>
  );

  // Early fallback message — but still include sidebar!
  if (!event) {
    return (
      <>
        {sidebar}
        {!isInQuery && !isInsideEventQueryLoop && (
          <div {...blockProps}>
            <span className="italic opacity-60">
              {__(
                "No event available. Choose an event or place this block inside Event Query.",
                "eventkoi"
              )}
            </span>
          </div>
        )}
      </>
    );
  }

  // --- Normalize event fields ---
  const title = event.title?.rendered || event.title || "";
  const excerpt =
    event.excerpt?.rendered ||
    event.description?.rendered ||
    event.description ||
    "";
  const location = event.location_line || "";
  const timeline = event.datetime;
  const image = event.thumbnail ? (
    <img
      src={event.thumbnail}
      alt={title}
      className="rounded-xl w-full h-auto object-cover"
    />
  ) : null;

  let content = null;

  switch (field) {
    case "title":
      content = (
        <TagName
          {...blockProps}
          className={cn(
            blockProps.className,
            isInQuery && "ek-event-title-default"
          )}
          dangerouslySetInnerHTML={{ __html: title }}
        />
      );
      break;

    case "excerpt":
      content = (
        <TagName
          {...blockProps}
          dangerouslySetInnerHTML={{
            __html:
              excerpt ||
              `<span class="opacity-60 italic">${__(
                "No description",
                "eventkoi"
              )}</span>`,
          }}
        />
      );
      break;

    case "timeline":
      content = (
        <TagName
          {...blockProps}
          className={cn(
            blockProps.className,
            isInQuery && "ek-event-timeline-default"
          )}
        >
          {timeline ? (
            <span>{timeline}</span>
          ) : (
            <span className="opacity-60 italic">
              {__("No time", "eventkoi")}
            </span>
          )}
        </TagName>
      );
      break;

    case "location":
      const loc = event.locations?.[0] ?? {};
      const isVirtual = loc.type === "virtual" || loc.type === "online";
      const locationLine = event.location_line;
      const hasVirtual = isVirtual && loc.virtual_url;

      let locationContent = null;

      if (hasVirtual) {
        const label = loc.link_text || loc.virtual_url;
        locationContent = (
          <a
            href={loc.virtual_url}
            className="underline underline-offset-4 truncate"
            title={label}
            target="_blank"
            rel="noopener noreferrer"
          >
            {label}
          </a>
        );
      } else if (locationLine) {
        locationContent = <span>{locationLine}</span>;
      } else {
        locationContent = (
          <span className="opacity-60 italic">
            {__("No location", "eventkoi")}
          </span>
        );
      }

      content = (
        <TagName
          {...blockProps}
          className={cn(
            blockProps.className,
            isInQuery && "ek-event-location-default"
          )}
        >
          {locationContent}
        </TagName>
      );
      break;

    case "image":
      content = (
        <div
          {...blockProps}
          className={cn(blockProps.className, "ek-event-image")}
        >
          {image ? (
            <div className="pointer-events-none select-none">{image}</div>
          ) : (
            <div className="border border-input bg-border flex items-center justify-center rounded-xl h-[120px]">
              <ImageIcon className="w-6 h-6 opacity-40" />
            </div>
          )}
        </div>
      );
      break;

    default:
      content = (
        <TagName {...blockProps}>
          <span className="italic opacity-60">
            {__("No event data", "eventkoi")}
          </span>
        </TagName>
      );
  }

  return (
    <>
      {sidebar}
      {content}
    </>
  );
}
