import { useEvent } from "@/blocks/event-query-loop/context";
import { cn } from "@/lib/utils";
import {
  AlignmentControl,
  BlockControls,
  HeadingLevelDropdown,
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

const getLocationVirtualUrl = (location = {}) =>
  location?.virtual_url || location?.url || "";

const formatLocationLine = (location = {}) => {
  const address = location?.address || {};
  const virtualUrl = getLocationVirtualUrl(location);
  if (virtualUrl) {
    return virtualUrl;
  }

  return [
    location?.name,
    location?.address1 || address?.streetAddress,
    location?.address2,
    location?.address3,
    [location?.city || address?.addressLocality, location?.state || address?.addressRegion, location?.zip || address?.postalCode]
      .filter(Boolean)
      .join(", "),
    location?.country || address?.addressCountry,
  ]
    .filter(Boolean)
    .join(", ");
};

const getPrimaryLocation = (event = {}) => {
  const locations = Array.isArray(event?.locations) ? event.locations : [];
  return locations.find((location) => formatLocationLine(location)) || {};
};

export default function Edit({ attributes, setAttributes, clientId }) {
  const { field, tagName = "div", textAlign, eventId = 0 } = attributes;

  const textAlignClass = textAlign ? `has-text-align-${textAlign}` : "";
  const blockProps = useBlockProps({
    className: cn("eventkoi-event-data", textAlignClass),
    "data-event-field": field,
  });

  const toolbar = (
    <BlockControls group="block">
      <AlignmentControl
        value={textAlign}
        onChange={(nextAlign) => setAttributes({ textAlign: nextAlign })}
      />
      {field === "title" && (
        <HeadingLevelDropdown
          value={
            /^h[1-6]$/.test(tagName)
              ? Number(tagName.replace("h", ""))
              : tagName === "p"
                ? 0
                : 2
          }
          options={[0, 1, 2, 3, 4, 5, 6]}
          onChange={(nextLevel) =>
            setAttributes({
              tagName: nextLevel === 0 ? "p" : `h${nextLevel}`,
            })
          }
        />
      )}
    </BlockControls>
  );

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
        {toolbar}
        {sidebar}
        {!isInQuery && !isInsideEventQueryLoop && (
          <div {...blockProps}>
            <span className="italic opacity-60">
              {__(
                "No event available. Choose an event or place this block inside Event Query.",
                "eventkoi-lite"
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
            isInQuery &&
              !/^h[1-6]$/.test(tagName) &&
              "ek-event-title-default"
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
                "eventkoi-lite"
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
              {__("No time", "eventkoi-lite")}
            </span>
          )}
        </TagName>
      );
      break;

    case "location":
      const loc = getPrimaryLocation(event);
      const isVirtual = loc.type === "virtual" || loc.type === "online";
      const virtualUrl = getLocationVirtualUrl(loc);
      const locationLine = event.location_line || formatLocationLine(loc);
      const hasVirtual = isVirtual && virtualUrl;

      let locationContent = null;

      if (hasVirtual) {
        const label = loc.link_text || virtualUrl;
        locationContent = (
          <a
            href={virtualUrl}
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
            {__("No location", "eventkoi-lite")}
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
      if (typeof field === "string" && field.startsWith("event_")) {
        const renderedValue =
          event && typeof event[field] === "string" ? event[field].trim() : "";

        if (renderedValue) {
          content = (
            <TagName
              {...blockProps}
              dangerouslySetInnerHTML={{ __html: renderedValue }}
            />
          );
        } else {
          const humanLabel = field
            .replace(/^event_/, "")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          content = (
            <TagName {...blockProps}>
              <span className="opacity-60 italic">{`{${humanLabel}}`}</span>
            </TagName>
          );
        }
      } else {
        content = (
          <TagName {...blockProps}>
            <span className="italic opacity-60">
              {__("No event data", "eventkoi-lite")}
            </span>
          </TagName>
        );
      }
  }

  return (
    <>
      {toolbar}
      {sidebar}
      {content}
    </>
  );
}
