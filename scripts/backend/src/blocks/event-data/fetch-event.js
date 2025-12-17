import apiFetch from "@wordpress/api-fetch";
import { useEffect, useState } from "@wordpress/element";
import { decodeEntities } from "@wordpress/html-entities";

/**
 * Fetch a single event by ID via /eventkoi/v1/get_event.
 *
 * @param {number} eventId The event ID to fetch.
 * @return {{event: Object|null, isLoading: boolean}}
 */
export function useFetchEvent(eventId) {
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (eventId > 0) {
      setIsLoading(true);

      apiFetch({
        path: `/eventkoi/v1/get_event?id=${eventId}`,
      })
        .then((res) => {
          if (res && (res.event_id || res.id)) {
            setEvent(res);
          } else {
            console.warn("EventKoi: no event found for ID", eventId);
            setEvent(null);
          }
        })
        .catch((err) => {
          console.error("EventKoi fetch error:", err);
          setEvent(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setEvent(null);
    }
  }, [eventId]);

  return { event, isLoading };
}

/**
 * Fetch a paginated list of events for ComboboxControl.
 * Ensures the selected event is always included in the list.
 *
 * @param {string} search Search term for filtering.
 * @param {number} selectedId Currently selected event ID.
 * @return {{options: Array, isLoading: boolean}}
 */
export function useEventOptions(search = "", selectedId = 0) {
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    apiFetch({
      path: `/wp/v2/eventkoi_event?per_page=20&status=publish&search=${encodeURIComponent(
        search
      )}`,
    })
      .then(async (posts) => {
        let opts = posts.map((p) => ({
          value: String(p.id),
          label: decodeEntities(p.title?.rendered || "") || `#${p.id}`,
        }));

        // Ensure selected event is in the list.
        if (
          selectedId > 0 &&
          !opts.some((o) => parseInt(o.value, 10) === selectedId)
        ) {
          try {
            const selected = await apiFetch({
              path: `/wp/v2/eventkoi_event/${selectedId}`,
            });
            if (selected && selected.id) {
              opts = [
                {
                  value: String(selected.id),
                  label:
                    decodeEntities(selected.title?.rendered || "") ||
                    `#${selected.id}`,
                },
                ...opts,
              ];
            }
          } catch {
            // Ignore missing event errors.
          }
        }

        if (isMounted) setOptions(opts);
      })
      .catch(() => {
        if (isMounted) setOptions([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [search, selectedId]);

  return { options, isLoading };
}
