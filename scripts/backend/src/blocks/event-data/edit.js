import { useEvent } from "@/blocks/event-query-loop/context";
import apiRequest from "@wordpress/api-fetch";
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
import { useEffect, useRef, useState } from "@wordpress/element";
import { dateI18n } from "@wordpress/date";
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

/**
 * Keep the first `count` words of some HTML as plain text, with an ellipsis.
 * A count of 0 returns the HTML untouched.
 */
function trimExcerptWords(html, count) {
  const limit = parseInt(count, 10) || 0;
  if (limit <= 0 || !html) return html;
  const holder = document.createElement("div");
  holder.innerHTML = html;
  const text = (holder.textContent || "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(" ") + "\u2026";
}

export default function Edit({ attributes, setAttributes, clientId }) {
  const {
    field,
    tagName = "div",
    textAlign,
    eventId = 0,
    dateFormat = "",
    timeFormat = "",
    excerptLength = 0,
  } = attributes;

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

  // With a word limit the server trims the full description, not the short
  // summary that event lists carry, so fetch the full text for the preview.
  const [fullDescription, setFullDescription] = useState(null);
  const fullDescriptionCacheRef = useRef(new Map());
  const baseEventId = parseInt(event?.event_id || event?.id, 10) || 0;
  const wordLimit = parseInt(excerptLength, 10) || 0;
  useEffect(() => {
    if (!baseEventId || wordLimit <= 0 || field !== "excerpt") {
      setFullDescription(null);
      return undefined;
    }
    const cache = fullDescriptionCacheRef.current;
    if (cache.has(baseEventId)) {
      setFullDescription(cache.get(baseEventId));
      return undefined;
    }
    let isMounted = true;
    apiRequest({
      path: `${eventkoi_params.api}/event?id=${baseEventId}`,
      method: "get",
    })
      .then((res) => {
        const text = res?.description?.rendered || res?.description || "";
        cache.set(baseEventId, text);
        if (isMounted) setFullDescription(text);
      })
      .catch(() => {
        cache.set(baseEventId, null);
        if (isMounted) setFullDescription(null);
      });
    return () => {
      isMounted = false;
    };
  }, [baseEventId, wordLimit, field]);

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
  const fullExcerpt =
    event.excerpt?.rendered ||
    event.description?.rendered ||
    event.description ||
    "";
  // Mirror the server: a word limit trims the full description, like core's
  // Excerpt; without one the summary shows as before.
  const excerpt = trimExcerptWords(
    wordLimit > 0 && fullDescription ? fullDescription : fullExcerpt,
    wordLimit
  );
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
    case "title": {
      // Mirror the front-end markup: inside a query loop the title is a link
      // to the event page, so the editor shows the same colours as the site.
      const titleHtml = { __html: title };
      const linksToEvent = isInQuery;
      content = (
        <TagName
          {...blockProps}
          className={cn(
            blockProps.className,
            isInQuery &&
              !/^h[1-6]$/.test(tagName) &&
              "ek-event-title-default"
          )}
        >
          {linksToEvent ? (
            <span className="ek-event-title--inner">
              <a
                href={event.url || event.link || "#"}
                rel="bookmark"
                onClick={(e) => e.preventDefault()}
                dangerouslySetInnerHTML={titleHtml}
              />
            </span>
          ) : (
            <span
              className="ek-event-title--inner"
              dangerouslySetInnerHTML={titleHtml}
            />
          )}
        </TagName>
      );
      break;
    }

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
        // Per-block PHP date/time format preview. Mirrors the frontend, which
        // overrides eventkoi_resolved_(date|time)_format for these fields.
        const ekStartIso =
          event?.start_date_iso ||
          event?.start ||
          (event?.start_ts
            ? new Date(event.start_ts * 1000).toISOString()
            : "");
        let customFormatted = "";
        if (ekStartIso) {
          if (field === "event_date" && dateFormat) {
            customFormatted = dateI18n(dateFormat, ekStartIso);
          } else if (field === "event_time" && timeFormat) {
            customFormatted = dateI18n(timeFormat, ekStartIso);
          } else if (
            (field === "event_datetime" ||
              field === "event_datetime_with_summary") &&
            (dateFormat || timeFormat)
          ) {
            const datePart = dateI18n(
              dateFormat || eventkoi_params?.date_format || "F j, Y",
              ekStartIso
            );
            const timePart = dateI18n(
              timeFormat || eventkoi_params?.time_format_string || "g:i a",
              ekStartIso
            );
            customFormatted = `${datePart} ${timePart}`;
          }
        }

        const renderedValue =
          customFormatted ||
          (event && typeof event[field] === "string"
            ? event[field].trim()
            : "");

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
