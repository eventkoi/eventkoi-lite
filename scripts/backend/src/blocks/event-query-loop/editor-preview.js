import apiFetch from "@wordpress/api-fetch";
import { useEffect } from "@wordpress/element";
import { __ } from "@wordpress/i18n";

const BLOCK_NAMESPACE = "eventkoi/event-query-loop";
const getApiBase = () => window?.eventkoi_params?.api || "/eventkoi/v1";
const stripDate = (val) => (val ? val.split("T")[0] : "");

// Track whether an EventKoi Query Loop is active in the editor and cache its params.
let activeCount = 0;
let activeConfig = null;
const mediaCache = new Map(); // map of pseudo featured_media IDs to thumbnail data.
let fetchCounter = 0; // increments per API fetch to force unique synthetic IDs.

/**
 * Middleware: intercept core Query's REST request for eventkoi_event and
 * supply data from our custom API instead. Only runs when an EventKoi
 * Query Loop is active in the editor.
 */
apiFetch.use((options, next) => {
  // Allow bypass to prevent recursive interception.
  if (options && options.__eventkoiProxy) {
    return next(options);
  }

  if (options?.path && typeof options.path === "string") {
    const pathStr = options.path;
    // Bypass single-event fetches and search queries (used by combobox).
    if (
      pathStr.match(/\/wp\/v2\/eventkoi_event\/\d+/) ||
      pathStr.includes("search=")
    ) {
      return next(options);
    }
  }

  if (!activeConfig) {
    return next(options);
  }

  const path = typeof options === "string" ? options : options.path;
  if (!path) {
    return next(options);
  }

  // Serve stub media responses for EventKoi preview featured images.
  if (path.includes("/wp/v2/media")) {
    try {
      const url = new URL(path, "https://example.com");

      // Single media item /wp/v2/media/{id}.
      const maybeId = parseInt(url.pathname.split("/").pop(), 10);
      if (maybeId && mediaCache.has(maybeId)) {
        return Promise.resolve(mediaCache.get(maybeId));
      }

      // Batched media query with include[]=ID or include=ID.
      const includeParam = url.searchParams.getAll("include[]");
      const includeSingle = url.searchParams.get("include");
      const includeIds = [
        ...includeParam.map((val) => parseInt(val, 10)),
        includeSingle ? parseInt(includeSingle, 10) : null,
      ].filter((id) => Number.isFinite(id));

      if (includeIds.length) {
        const items = includeIds
          .filter((id) => id && mediaCache.has(id))
          .map((id) => mediaCache.get(id));

        if (items.length) {
          return Promise.resolve(items);
        }
      }
    } catch (e) {
      // fall through to next
    }
    return next(options);
  }

  if (!path.includes("/wp/v2/eventkoi_event")) {
    return next(options);
  }

  try {
    const url = new URL(path, "https://example.com"); // base required for URL parsing.
    const params = url.searchParams;

    const perPage =
      parseInt(params.get("per_page"), 10) || activeConfig.perPage || 6;
    const page = parseInt(params.get("page"), 10) || activeConfig.page || 1;
    const order = params.get("order") || activeConfig.order || "desc";
    const orderby = params.get("orderby") || activeConfig.orderBy || "modified";

    const base = (getApiBase() || "").replace(/\/$/, "");
    const qs = new URLSearchParams({
      per_page: perPage,
      page,
      order,
      orderby,
      include_instances: activeConfig.includeInstances ? 1 : 0,
    });

    if (activeConfig.startDate) {
      qs.set("start_date", stripDate(activeConfig.startDate));
    }
    if (activeConfig.endDate) {
      qs.set("end_date", stripDate(activeConfig.endDate));
    }

    if (activeConfig.includeInstances && activeConfig.showInstancesForEvent) {
      if (activeConfig.instanceParentId) {
        qs.set("parent_event", activeConfig.instanceParentId);
      }
    } else if (activeConfig.calendars?.length) {
      qs.set("id", activeConfig.calendars.join(","));
    }

    // If root uses rest_route, append params with "&" to avoid double "?".
    const root = window?.wpApiSettings?.root || "";
    const separator = root.includes("rest_route=") ? "&" : "?";
    const apiPath = `${base}/query_events${separator}${qs.toString()}`;

    const rootUrl = window?.wpApiSettings?.root || "/wp-json/";
    const normalizedRoot = rootUrl.replace(/\/$/, "");
    const normalizedPath = apiPath.replace(/^\//, "");
    const fullUrl = apiPath.startsWith("http")
      ? apiPath
      : `${normalizedRoot}/${normalizedPath}`;

    const fetchOptions = {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
    };

    // Carry nonce if available.
    if (window?.wpApiSettings?.nonce) {
      fetchOptions.headers["X-WP-Nonce"] = window.wpApiSettings.nonce;
    }

    return fetch(fullUrl, fetchOptions)
      .then((res) => res.json())
      .then((response) => {
        mediaCache.clear();
        fetchCounter += 1;

        const events = response?.events || [];
        const total = response?.total || events.length || 0;

        // Map EventKoi events to a minimal WP post shape for Query Loop.
        // Use synthetic IDs so each row is unique and map back to events.
        const eventMap = {};

        const posts = events.map((evt, index) => {
          const syntheticMediaId = fetchCounter * 100000 + (index + 1);
          const rawId = evt?.id || evt?.event_id;
          const id = rawId ? String(rawId) : String(syntheticMediaId);
          const title = evt?.title?.rendered || evt?.title || "";
          const mediaLink = `${normalizedRoot}/wp/v2/media/${syntheticMediaId}`;
          let embeddedMedia = null;

          if (evt?.thumbnail) {
            const stubImage = {
              id: syntheticMediaId,
              source_url: evt.thumbnail,
              alt_text: title,
              title: { rendered: title },
              caption: { rendered: "" },
              media_type: "image",
              mime_type: "image/jpeg",
              media_details: {
                width: evt?.thumbnail_width || null,
                height: evt?.thumbnail_height || null,
                sizes: {
                  full: {
                    source_url: evt.thumbnail,
                    width: evt?.thumbnail_width || null,
                    height: evt?.thumbnail_height || null,
                  },
                },
              },
            };
            mediaCache.set(syntheticMediaId, stubImage);
            embeddedMedia = stubImage;
          }

          // Store for editor consumption (to avoid per-row fetch).
          eventMap[String(id)] = evt;

          return {
            id,
            date: evt?.start || evt?.datetime || "",
            type: "eventkoi_event",
            link: evt?.url || "",
            title: { rendered: title },
            excerpt: {
              rendered: evt?.excerpt?.rendered || evt?.description || "",
            },
            content: { rendered: "" },
            featured_media: evt?.thumbnail ? syntheticMediaId : 0,
            _eventkoi: evt, // keep the raw event for consumers if needed.
            _links: {
              "wp:featuredmedia": evt?.thumbnail
                ? [
                    {
                      href: mediaLink,
                    },
                  ]
                : [],
            },
            _embedded: embeddedMedia
              ? {
                  "wp:featuredmedia": [embeddedMedia],
                }
              : undefined,
          };
        });

        if (typeof window !== "undefined") {
          window.__eventkoiEventMap = eventMap;
          window.__eventkoiEventMapVersion = fetchCounter;
          window.dispatchEvent(
            new CustomEvent("eventkoiEventMapUpdated", {
              detail: { version: fetchCounter },
            })
          );
          if (window.console) {
          }
        }

        const totalPages = Math.max(1, Math.ceil(total / perPage));

        // If the original request expected a raw Response (parse:false), return one with paging headers.
        if (options && typeof options === "object" && options.parse === false) {
          return new Response(JSON.stringify(posts), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-WP-Total": String(total),
              "X-WP-TotalPages": String(totalPages),
            },
          });
        }

        // Otherwise return the posts array with paging metadata for consumers.
        posts._paging = {
          total,
          totalPages,
        };

        return posts;
      });
  } catch (e) {
    return next(options);
  }
});

/**
 * Sync the active EventKoi Query Loop parameters for the middleware to use.
 */
const useEventKoiQuerySync = (attributes) => {
  useEffect(() => {
    const normalizedShowInstances =
      !!attributes?.showInstancesForEvent && !!attributes?.instanceParentId;

    const sigParts = [
      attributes?.calendars?.join(",") || "",
      attributes?.startDate || "",
      attributes?.endDate || "",
      attributes?.includeInstances ? "1" : "0",
      normalizedShowInstances ? "1" : "0",
      attributes?.instanceParentId || "",
      attributes?.query?.order || "desc",
      attributes?.query?.orderBy || "modified",
      attributes?.query?.perPage || "6",
      attributes?.query?.pages || "1",
    ];
    const sig = sigParts.join("|");

    activeCount += 1;
    activeConfig = {
      perPage: attributes?.query?.perPage || 6,
      page: attributes?.query?.pages || 1,
      order: attributes?.query?.order || "desc",
      orderBy: attributes?.query?.orderBy || "modified",
      calendars: attributes?.calendars || [],
      startDate: attributes?.startDate || "",
      endDate: attributes?.endDate || "",
      includeInstances: !!attributes?.includeInstances,
      showInstancesForEvent: normalizedShowInstances,
      instanceParentId: attributes?.instanceParentId || 0,
      sig,
    };

    return () => {
      activeCount -= 1;
      if (activeCount <= 0) {
        activeConfig = null;
        activeCount = 0;
      }
    };
  }, [
    attributes?.query?.perPage,
    attributes?.query?.pages,
    attributes?.query?.order,
    attributes?.query?.orderBy,
    attributes?.calendars?.join(","),
    attributes?.startDate,
    attributes?.endDate,
    attributes?.includeInstances,
    attributes?.showInstancesForEvent,
    attributes?.instanceParentId,
    attributes?.query?.order,
    attributes?.query?.orderBy,
    attributes?.query?.perPage,
    attributes?.query?.pages,
  ]);
};

export const withEventKoiQueryData = (BlockEdit) => (props) => {
  if (
    props.name !== "core/query" ||
    props.attributes?.namespace !== BLOCK_NAMESPACE
  ) {
    return <BlockEdit {...props} />;
  }

  useEventKoiQuerySync(props.attributes);

  // Force core/query to refetch when EventKoi filters change by bumping a signature in the query args.
  useEffect(() => {
    const { attributes, setAttributes } = props;
    const { query = {} } = attributes;
    const normalizedShowInstances =
      !!attributes?.showInstancesForEvent && !!attributes?.instanceParentId;
    const sigParts = [
      attributes?.calendars?.join(",") || "",
      attributes?.startDate || "",
      attributes?.endDate || "",
      attributes?.includeInstances ? "1" : "0",
      normalizedShowInstances ? "1" : "0",
      attributes?.instanceParentId || "",
      attributes?.query?.order || "desc",
      attributes?.query?.orderBy || "modified",
      attributes?.query?.perPage || "6",
      attributes?.query?.pages || "1",
    ];
    const sig = sigParts.join("|");

    if (query.eventkoiSig === sig) {
      return;
    }

    setAttributes({
      query: {
        ...query,
        eventkoiSig: sig,
      },
    });
  }, [
    props.attributes?.calendars?.join(","),
    props.attributes?.startDate,
    props.attributes?.endDate,
    props.attributes?.includeInstances,
    props.attributes?.showInstancesForEvent,
    props.attributes?.instanceParentId,
    props.attributes?.query?.eventkoiSig,
    props.attributes?.query?.order,
    props.attributes?.query?.orderBy,
    props.attributes?.query?.perPage,
    props.attributes?.query?.pages,
  ]);

  // Hide Gutenberg "Change design" toolbar button for this variation.
  useEffect(() => {
    if (
      props.name !== "core/query" ||
      props.attributes?.namespace !== BLOCK_NAMESPACE ||
      !props.isSelected
    ) {
      return () => {};
    }

    const hiddenButtons = new Set();
    const hiddenSlots = new Set();
    const matchLabel = __("Change design", "eventkoi").toLowerCase();

    const hideMatches = (root) => {
      if (!root) {
        return;
      }
      root.querySelectorAll("button, .components-button").forEach((btn) => {
        const label =
          btn.getAttribute("aria-label") ||
          btn.textContent?.trim() ||
          btn.innerText?.trim() ||
          "";
        if (!label) {
          return;
        }
        if (label.toLowerCase().includes(matchLabel)) {
          btn.style.display = "none";
          hiddenButtons.add(btn);

          const slot = btn.closest(".block-editor-block-toolbar__slot");
          if (slot) {
            slot.style.display = "none";
            hiddenSlots.add(slot);
          }
        }
      });
    };

    hideMatches(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }
          hideMatches(node);
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      hiddenButtons.forEach((btn) => (btn.style.display = ""));
      hiddenSlots.forEach((slot) => (slot.style.display = ""));
    };
  }, [props.isSelected, props.attributes?.namespace, props.name]);

  // Hide any .components-panel__body that appears immediately before our
  // .eventkoi-inspector-tabs section (editor-only tweak).
  useEffect(() => {
    if (
      props.name !== "core/query" ||
      props.attributes?.namespace !== BLOCK_NAMESPACE ||
      !props.isSelected
    ) {
      return () => {};
    }

    const hiddenBodies = new Set();

    const hideBodiesBefore = (el) => {
      if (!el) {
        return;
      }
      let sibling = el.previousElementSibling;
      while (sibling && sibling.classList.contains("components-panel__body")) {
        sibling.style.display = "none";
        hiddenBodies.add(sibling);
        sibling = sibling.previousElementSibling;
      }
    };

    document
      .querySelectorAll(".eventkoi-inspector-tabs")
      .forEach((el) => hideBodiesBefore(el));

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }
          if (node.classList.contains("eventkoi-inspector-tabs")) {
            hideBodiesBefore(node);
          } else {
            node
              .querySelectorAll?.(".eventkoi-inspector-tabs")
              ?.forEach((child) => hideBodiesBefore(child));
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      hiddenBodies.forEach((panel) => {
        panel.style.display = "";
      });
    };
  }, [props.isSelected, props.attributes?.namespace, props.name]);

  return <BlockEdit {...props} />;
};
