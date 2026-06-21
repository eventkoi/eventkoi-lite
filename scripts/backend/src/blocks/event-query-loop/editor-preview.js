import apiFetch from "@wordpress/api-fetch";
import { AlignmentControl, BlockControls } from "@wordpress/block-editor";
import { useEffect, useRef } from "@wordpress/element";
import { __ } from "@wordpress/i18n";

const BLOCK_NAMESPACE = "eventkoi/event-query-loop";
const getApiBase = () => window?.eventkoi_params?.api || "/eventkoi/v1";
const stripDate = (val) => (val ? val.split("T")[0] : "");

// Track whether an EventKoi Query Loop is active in the editor and cache its params.
let activeCount = 0;
let activeConfig = null;
const mediaCache = new Map(); // map of pseudo featured_media IDs to thumbnail data.
let fetchCounter = 0; // increments per API fetch to force unique synthetic IDs.

const fetchFeaturedMediaMap = async (events = []) => {
  const ids = Array.from(
    new Set(
      events
        .map((evt) => parseInt(evt?.event_id, 10))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  );

  if (!ids.length) {
    return {};
  }

  try {
    const records = await apiFetch({
      path: `/wp/v2/eventkoi_event?include=${encodeURIComponent(
        ids.join(",")
      )}&per_page=${ids.length}&context=view&_fields=id,featured_media`,
      __eventkoiProxy: true,
    });

    const map = {};
    (Array.isArray(records) ? records : []).forEach((record) => {
      const recordId = parseInt(record?.id, 10);
      if (!Number.isFinite(recordId) || recordId <= 0) {
        return;
      }
      map[recordId] = parseInt(record?.featured_media, 10) || 0;
    });

    return map;
  } catch (e) {
    return {};
  }
};

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
    // Only bypass the editor combobox lookup request, not query loop fetching.
    if (pathStr.includes("/wp/v2/eventkoi_event")) {
      try {
        const bypassUrl = new URL(pathStr, "https://example.com");
        const isComboboxLookup =
          bypassUrl.searchParams.has("search") &&
          "any" === bypassUrl.searchParams.get("status") &&
          "edit" === bypassUrl.searchParams.get("context");

        if (isComboboxLookup) {
          return next(options);
        }
      } catch (e) {
        // Continue to normal handling if URL parsing fails.
      }
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
    const rootUrl = window?.wpApiSettings?.root || "/wp-json/";
    const normalizedRoot = rootUrl.replace(/\/$/, "");
    const singleMatch = url.pathname.match(/\/wp\/v2\/eventkoi_event\/(\d+)$/);

    // Support core/post-featured-image in editor by serving single post payloads
    // from the EventKoi preview cache instead of hitting wp/v2 for synthetic IDs.
    if (singleMatch) {
      const singleId = singleMatch[1];
      const cachedMap =
        typeof window !== "undefined" ? window.__eventkoiEventMap || {} : {};
      const evt = cachedMap[String(singleId)];

      if (!evt) {
        return next(options);
      }

      const syntheticMediaId = Number.parseInt(singleId, 10) + 500000;
      const sourceEventId = parseInt(evt?.event_id, 10) || 0;
      const realFeaturedMediaId =
        parseInt(evt?._eventkoi_featured_media_id, 10) ||
        (sourceEventId > 0
          ? parseInt(
              (typeof window !== "undefined"
                ? window.__eventkoiFeaturedMediaMap || {}
                : {})[sourceEventId],
              10
            ) || 0
          : 0);
      const title = evt?.title?.rendered || evt?.title || "";
      const featuredMediaId =
        realFeaturedMediaId || (evt?.thumbnail ? syntheticMediaId : 0);
      const mediaLink = `${normalizedRoot}/wp/v2/media/${featuredMediaId}`;
      let embeddedMedia = null;

      if (!realFeaturedMediaId && evt?.thumbnail) {
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

      const postObj = {
        id: Number.parseInt(singleId, 10),
        type: "eventkoi_event",
        link: evt?.url || "",
        title: { rendered: title },
        excerpt: {
          rendered: evt?.excerpt?.rendered || evt?.description || "",
        },
        content: { rendered: "" },
        featured_media: featuredMediaId,
        _eventkoi: evt,
        _links: {
          "wp:featuredmedia": featuredMediaId
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

      if (options && typeof options === "object" && options.parse === false) {
        return Promise.resolve(
          new Response(JSON.stringify(postObj), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          })
        );
      }

      return Promise.resolve(postObj);
    }

    const params = url.searchParams;

    const perPage =
      parseInt(params.get("per_page"), 10) || activeConfig.perPage || 6;
    const page = parseInt(params.get("page"), 10) || activeConfig.page || 1;
    const order = params.get("order") || activeConfig.order || "asc";
    const orderby =
      params.get("orderby") || activeConfig.orderBy || "upcoming";

    const base = (getApiBase() || "").replace(/\/$/, "");
    const qs = new URLSearchParams({
      per_page: perPage,
      page,
      order,
      orderby,
      include_instances: 0,
    });

    if (activeConfig.startDate) {
      qs.set("start_date", stripDate(activeConfig.startDate));
    }
    if (activeConfig.endDate) {
      qs.set("end_date", stripDate(activeConfig.endDate));
    }

    if (activeConfig.calendars?.length) {
      qs.set("id", activeConfig.calendars.join(","));
    }

    // If root uses rest_route, append params with "&" to avoid double "?".
    const root = window?.wpApiSettings?.root || "";
    const separator = root.includes("rest_route=") ? "&" : "?";
    const apiPath = `${base}/query_events${separator}${qs.toString()}`;

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
      .then(async (response) => {
        mediaCache.clear();
        fetchCounter += 1;

        const events = response?.events || [];
        const total = response?.total || events.length || 0;
        const featuredMediaMap = await fetchFeaturedMediaMap(events);

        // Map EventKoi events to a minimal WP post shape for Query Loop.
        // Use synthetic IDs so each row is unique and map back to events.
        const eventMap = {};

        const posts = events.map((evt, index) => {
          const syntheticMediaId = fetchCounter * 100000 + (index + 1);
          const syntheticPostId = fetchCounter * 1000000 + (index + 1);
          const rawId = evt?.id || evt?.event_id;
          const sourceEventId = parseInt(evt?.event_id, 10) || 0;
          const realFeaturedMediaId = sourceEventId
            ? parseInt(featuredMediaMap[sourceEventId], 10) || 0
            : 0;
          const id = syntheticPostId;
          const title = evt?.title?.rendered || evt?.title || "";
          const featuredMediaId =
            realFeaturedMediaId || (evt?.thumbnail ? syntheticMediaId : 0);
          const mediaLink = `${normalizedRoot}/wp/v2/media/${featuredMediaId}`;
          let embeddedMedia = null;

          if (!realFeaturedMediaId && evt?.thumbnail) {
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

          evt._eventkoi_featured_media_id = featuredMediaId;

          // Store for editor consumption (to avoid per-row fetch).
          eventMap[String(id)] = evt;
          if (rawId) {
            eventMap[String(rawId)] = evt;
          }

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
            featured_media: featuredMediaId,
            _eventkoi: evt, // keep the raw event for consumers if needed.
            _links: {
              "wp:featuredmedia": featuredMediaId
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
          window.__eventkoiFeaturedMediaMap = featuredMediaMap;
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
    const sigParts = [
      attributes?.calendars?.join(",") || "",
      attributes?.startDate || "",
      attributes?.endDate || "",
      attributes?.query?.order || "asc",
      attributes?.query?.orderBy || "upcoming",
      attributes?.query?.perPage || "6",
      attributes?.query?.pages || "1",
    ];
    const sig = sigParts.join("|");

    activeCount += 1;
    activeConfig = {
      perPage: attributes?.query?.perPage || 6,
      page: attributes?.query?.pages || 1,
      order: attributes?.query?.order || "asc",
      orderBy: attributes?.query?.orderBy || "upcoming",
      calendars: attributes?.calendars || [],
      startDate: attributes?.startDate || "",
      endDate: attributes?.endDate || "",
      includeInstances: false,
      showInstancesForEvent: false,
      instanceParentId: 0,
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
  const lastSigRef = useRef("");
  const refreshKeyRef = useRef(0);

  useEffect(() => {
    const { attributes, setAttributes } = props;
    const { query = {} } = attributes;
    const sigParts = [
      attributes?.calendars?.join(",") || "",
      attributes?.startDate || "",
      attributes?.endDate || "",
      attributes?.query?.order || "asc",
      attributes?.query?.orderBy || "upcoming",
      attributes?.query?.perPage || "6",
      attributes?.query?.pages || "1",
    ];
    const sig = sigParts.join("|");
    const previousSig = lastSigRef.current;

    if (sig !== previousSig) {
      refreshKeyRef.current += 1;
      lastSigRef.current = sig;
    }

    const queryRefreshSig = `${sig}|${refreshKeyRef.current}`;

    if (query.eventkoiSig === queryRefreshSig) {
      return;
    }

    setAttributes({
      query: {
        ...query,
        eventkoiSig: queryRefreshSig,
      },
    });
  }, [
    props.attributes?.calendars?.join(","),
    props.attributes?.startDate,
    props.attributes?.endDate,
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
    const matchLabel = __("Change design", "eventkoi-lite").toLowerCase();

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

  const textAlign = props.attributes?.textAlign || "";

  return (
    <>
      <BlockControls group="block">
        <AlignmentControl
          value={textAlign}
          onChange={(nextAlign) =>
            props.setAttributes({ textAlign: nextAlign || "" })
          }
        />
      </BlockControls>
      <BlockEdit {...props} />
    </>
  );
};
