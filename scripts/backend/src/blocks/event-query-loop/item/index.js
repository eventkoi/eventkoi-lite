import {
  EventContext,
  usePrefetchedEvent,
} from "@/blocks/event-query-loop/context";
import apiFetch from "@wordpress/api-fetch";
import { InnerBlocks, useBlockProps } from "@wordpress/block-editor";
import { registerBlockType } from "@wordpress/blocks";
import { useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";

const TEMPLATE = [
  [
    "core/group",
    {
      layout: { type: "default" },
    },
  ],
];

const getApiBase = () => window?.eventkoi_params?.api || "/eventkoi/v1";

const useEventData = (postId, postType, prefetchedEvent = null) => {
  const [eventData, setEventData] = useState(prefetchedEvent);
  const [isLoading, setIsLoading] = useState(false);
  const [mapVersion, setMapVersion] = useState(
    typeof window !== "undefined" && window.__eventkoiEventMapVersion
      ? window.__eventkoiEventMapVersion
      : 0
  );
  const fallbackFetchStarted = useRef(false);

  useEffect(() => {
    fallbackFetchStarted.current = false;
  }, [postId]);

  useEffect(() => {
    // If we have a prefetched event (from custom preview), use it directly.
    if (prefetchedEvent) {
      setEventData(prefetchedEvent);
    }
  }, [prefetchedEvent]);

  useEffect(() => {
    const handler = (e) => {
      const nextVersion =
        e?.detail?.version ??
        (window.__eventkoiEventMapVersion || mapVersion + 1);
      setMapVersion(nextVersion);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("eventkoiEventMapUpdated", handler);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("eventkoiEventMapUpdated", handler);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let retryTimer = null;
    const hasPostId = postId !== undefined && postId !== null;
    const mapKey = hasPostId ? String(postId) : "";

    // Check editor map if available (set by the Query interceptor) using the latest version.
    const editorMap =
      typeof window !== "undefined" ? window.__eventkoiEventMap || {} : {};
    const editorEvent = mapKey ? editorMap[mapKey] || editorMap[postId] : null;

    if (editorEvent) {
      fallbackFetchStarted.current = true;
      setEventData(editorEvent);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    if (postType === "eventkoi_event") {
      setIsLoading(true);
      const retryFind = () => {
        if (!isMounted) {
          return;
        }
        const latestMap =
          typeof window !== "undefined" ? window.__eventkoiEventMap || {} : {};
        const latestEvent = mapKey
          ? latestMap[mapKey] || latestMap[postId]
          : null;
        if (latestEvent) {
          fallbackFetchStarted.current = true;
          setEventData(latestEvent);
          setIsLoading(false);
          return;
        }
        retryTimer = setTimeout(retryFind, 120);
      };
      retryFind();

      const fallbackTimeout = setTimeout(() => {
        if (
          !isMounted ||
          fallbackFetchStarted.current ||
          !postId ||
          postType !== "eventkoi_event"
        ) {
          return;
        }
        fallbackFetchStarted.current = true;

        apiFetch({
          path: `${getApiBase()}/query_events?include=${encodeURIComponent(
            postId
          )}`,
          __eventkoiProxy: true,
        })
          .then((response) => {
            if (!isMounted) {
              return;
            }
            const event = response?.events?.[0] || null;
            if (event) {
              setEventData(event);
            }
          })
          .finally(() => {
            if (isMounted) {
              setIsLoading(false);
            }
          });
      }, 600);

      return () => {
        isMounted = false;
        if (retryTimer) {
          clearTimeout(retryTimer);
        }
        clearTimeout(fallbackTimeout);
      };
    }

    // For non-event contexts (unexpected), just stop loading.
    setIsLoading(false);

    return () => {
      isMounted = false;
    };
  }, [postId, postType, prefetchedEvent, mapVersion]);

  return useMemo(
    () => ({
      event: eventData,
      isLoading,
    }),
    [eventData, isLoading]
  );
};

registerBlockType("eventkoi/event-query-item", {
  apiVersion: 2,
  title: __("EK Event Query Item", "eventkoi"),
  description: __(
    "Provides EventKoi event context inside Query Loop rows.",
    "eventkoi"
  ),
  category: "eventkoi-blocks",
  parent: ["core/post-template"],
  usesContext: ["postId", "postType"],
  supports: {
    html: false,
    inserter: false,
  },
  edit({ context }) {
    const { postId, postType } = context || {};
    const prefetchedEvent = usePrefetchedEvent();
    const { event, isLoading } = useEventData(
      postId,
      postType,
      prefetchedEvent
    );
    const blockProps = useBlockProps({
      className: "eventkoi-event-query-item",
    });

    if (!postId) {
      return (
        <div {...blockProps}>
          <p className="text-muted-foreground text-sm">
            {__("This block must be placed inside a Query Loop.", "eventkoi")}
          </p>
        </div>
      );
    }

    return (
      <div {...blockProps}>
        <EventContext.Provider
          value={{
            event,
            isActive: false,
            isLoading,
          }}
        >
          <InnerBlocks template={TEMPLATE} templateLock={false} />
        </EventContext.Provider>
      </div>
    );
  },
  save() {
    return <InnerBlocks.Content />;
  },
});
