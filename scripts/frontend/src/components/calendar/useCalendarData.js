"use client";

import { getInitialCalendarDate } from "@/lib/date-utils";
import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import publicApi from "@/lib/public-api";

const getCalendarRequestRange = (
  start,
  end,
  viewType,
  timezone,
  anchorDate = null
) => {
  if (!start || !end) {
    return { start, end };
  }

  // Month-anchored window (padded past grid spillover) keeps the cache key
  // identical between the view fetch and the adjacent-month prefetch.
  if (String(viewType || "").startsWith("dayGrid")) {
    const zone = timezone || "UTC";
    const monthBasis =
      anchorDate || new Date((start.getTime() + end.getTime()) / 2);
    const monthStart = DateTime.fromJSDate(monthBasis, { zone }).startOf(
      "month"
    );

    if (!monthStart.isValid) {
      return { start, end };
    }

    return {
      start: monthStart.minus({ days: 7 }).toUTC().toJSDate(),
      end: monthStart.plus({ months: 1, days: 14 }).toUTC().toJSDate(),
    };
  }

  if (!String(viewType || "").startsWith("timeGrid")) {
    return { start, end };
  }

  const zone = timezone || "UTC";
  const monthStart = DateTime.fromJSDate(anchorDate || start, { zone }).startOf("month");

  // The visible range can cross a month boundary (e.g. a week view week that
  // begins in one month and ends in the next). Snap the fetch window to cover
  // every month the range touches — not just the anchor's month — otherwise
  // events on the days that fall in the other month are never fetched and the
  // cells render empty.
  const lastVisible = DateTime.fromJSDate(end, { zone }).minus({ milliseconds: 1 });
  const monthEnd = lastVisible.startOf("month").plus({ months: 1 });

  if (!monthStart.isValid || !monthEnd.isValid) {
    return { start, end };
  }

  const rangeEnd =
    monthEnd > monthStart.plus({ months: 1 })
      ? monthEnd
      : monthStart.plus({ months: 1 });

  return {
    start: monthStart.toUTC().toJSDate(),
    end: rangeEnd.toUTC().toJSDate(),
  };
};

export function useCalendarData({
  id,
  calendars,
  display,
  searchTerm = "",
  timeframe,
  context,
  defaultMonth,
  defaultYear,
  orderby,
  order,
  perPage,
  maxResults,
  dateStart,
  dateEnd,
  calendarRef,
}) {
  const [calendar, setCalendar] = useState({});
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState(null);
  const [view, setView] = useState();
  const [currentDate, setCurrentDate] = useState(null);
  const [initialDate, setInitialDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [listTotal, setListTotal] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [listHasMore, setListHasMore] = useState(false);
  const [listLoadingMore, setListLoadingMore] = useState(false);

  const lastRangeRef = useRef(null);
  // The initial-calendar fetch seeds the default view and date. Seeding is a
  // first-load concern only: a later re-run must never overwrite the view or
  // date the visitor has picked in the meantime.
  const initialRequestIdRef = useRef(0);
  const calendarSeededRef = useRef(false);
  const hasLoadedView = useRef(false);
  const viewRequestIdRef = useRef(0);
  const rangeCacheRef = useRef(new Map());
  // range key -> in-flight prefetch promise
  const inflightRef = useRef(new Map());

  // Use calendars if present, otherwise id
  const effectiveId = calendars || id;
  const shouldApplyListSorting = display === "list";
  // A List with no explicit sort configured should lead with upcoming events
  // (today onward, ascending), not dump the whole history oldest-first. Sites
  // that deliberately set an order (e.g. a past-events list) keep their choice.
  const effectiveOrderby = shouldApplyListSorting
    ? orderby || "upcoming"
    : orderby;
  const listPerPage = Math.max(1, Number.parseInt(perPage, 10) || 10);
  const parsedMaxResults = Number.parseInt(maxResults, 10);
  const listMaxResults =
    Number.isFinite(parsedMaxResults) && parsedMaxResults > 0
      ? parsedMaxResults
      : 0;
  const getRequestTimezone = () => {
    if (typeof window === "undefined") {
      return window.eventkoi_params?.timezone || "UTC";
    }

    const params = new URLSearchParams(window.location.search);
    const requested = params.get("tz");

    if (requested) {
      return requested === "local"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        : requested;
    }

    if (window.eventkoi_params?.auto_detect_timezone) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    }

    return (
      window.eventkoi_params?.timezone_override || window.eventkoi_params?.timezone || "UTC"
    );
  };

  const getInitialCalendar = async () => {
    setLoadError(false);
    const requestId = initialRequestIdRef.current + 1;
    initialRequestIdRef.current = requestId;
    try {
      const params = new URLSearchParams({
        id: effectiveId,
        display,
        initial: "true",
      });
      if (shouldApplyListSorting && effectiveOrderby) params.set("orderby", effectiveOrderby);
      if (shouldApplyListSorting && order) params.set("order", order);

      const response = await publicApi({
        path: `/calendar_events?${params.toString()}`,
        method: "get",
      });

      if (requestId !== initialRequestIdRef.current) {
        return;
      }

      setCalendar(response.calendar);

      if (calendarSeededRef.current) {
        return;
      }
      calendarSeededRef.current = true;

      const moduleTimeframe =
        timeframe === "week" || timeframe === "month" ? timeframe : null;
      const calendarTimeframe =
        response?.calendar?.timeframe === "week" ||
        response?.calendar?.timeframe === "month"
          ? response.calendar.timeframe
          : "month";
      const effectiveTimeframe = moduleTimeframe || calendarTimeframe;
      const defaultView =
        effectiveTimeframe === "week" ? "timeGridWeek" : "dayGridMonth";

      setView(defaultView);

      const date = getInitialCalendarDate({
        context,
        defaultMonth,
        defaultYear,
        calendar: response.calendar,
        timeframe: effectiveTimeframe,
      });

      setCurrentDate(date);
      setInitialDate(date);
    } catch (err) {
      console.error("Failed to load initial calendar", err);
      setLoadError(true);
    }
  };

  const loadEventsForView = async (
    start,
    end,
    viewType = "",
    anchorDate = null
  ) => {
    const requestTimezone = getRequestTimezone();
    const requestRange = getCalendarRequestRange(
      start,
      end,
      viewType,
      requestTimezone,
      anchorDate
    );

    // Claim a sequence number so out-of-order responses (fast month/week nav)
    // don't overwrite fresh state with stale results.
    const requestId = viewRequestIdRef.current + 1;
    viewRequestIdRef.current = requestId;

    const rangeKey =
      requestRange.start && requestRange.end
        ? `${requestRange.start.toISOString()}__${requestRange.end.toISOString()}__${
            viewType || ""
          }__${requestTimezone}`
        : "";

    const applyCached = () => {
      const cached = rangeCacheRef.current.get(rangeKey);
      setEvents(Array.isArray(cached?.events) ? cached.events : []);
      if (cached?.calendar) {
        setCalendar(cached.calendar);
      }
      setLoading(false);
    };

    if (rangeKey && rangeCacheRef.current.has(rangeKey)) {
      if (requestId === viewRequestIdRef.current) {
        applyCached();
        prefetchAdjacent(start, end, viewType, anchorDate, requestTimezone);
      }
      return;
    }

    // Await an in-flight prefetch for this range instead of duplicating it.
    if (rangeKey && inflightRef.current.has(rangeKey)) {
      setLoading(true);
      try {
        await inflightRef.current.get(rangeKey);
      } catch {
        // Prefetch failed; fall through to a normal fetch.
      }
      if (requestId !== viewRequestIdRef.current) {
        return;
      }
      if (rangeCacheRef.current.has(rangeKey)) {
        applyCached();
        prefetchAdjacent(start, end, viewType, anchorDate, requestTimezone);
        return;
      }
    }

    try {
      setLoading(true);

      const params = new URLSearchParams({ id: effectiveId, display });
      if (shouldApplyListSorting && effectiveOrderby) params.set("orderby", effectiveOrderby);
      if (shouldApplyListSorting && order) params.set("order", order);
      if (requestRange.start) params.set("start", requestRange.start.toISOString());
      if (requestRange.end) params.set("end", requestRange.end.toISOString());
      if (viewType) params.set("view_type", viewType);
      if (display === "calendar") params.set("timezone", requestTimezone);

      const response = await publicApi({
        path: `/calendar_events?${params.toString()}`,
        method: "get",
      });

      if (rangeKey) {
        rangeCacheRef.current.set(rangeKey, {
          events: Array.isArray(response.events) ? response.events : [],
          calendar: response.calendar || null,
        });
      }

      if (requestId !== viewRequestIdRef.current) {
        return; // A newer view-fetch superseded this one.
      }

      setEvents(response.events);
      setCalendar(response.calendar);

      prefetchAdjacent(start, end, viewType, anchorDate, requestTimezone);

      if (!hasLoadedView.current) {
        hasLoadedView.current = true;
        loadAllEvents();
      }
    } catch (err) {
      console.error("Failed to load events for view", err);
      setLoadError(true);
    } finally {
      if (requestId === viewRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Prefetch adjacent windows (next + previous) for faster nav, anchored on
  // the neighboring month so cache keys match the view fetch.
  const prefetchAdjacent = (start, end, viewType, anchorDate, requestTimezone) => {
    if (!start || !end) {
      return;
    }
    const spanMs = end.getTime() - start.getTime();
    if (spanMs <= 0) {
      return;
    }
    const anchorBasis =
      anchorDate || new Date((start.getTime() + end.getTime()) / 2);
    const anchorDt = DateTime.fromJSDate(anchorBasis, {
      zone: requestTimezone || "UTC",
    });

    const prefetch = async (pStart, pEnd, pAnchor) => {
      const requestRange = getCalendarRequestRange(
        pStart,
        pEnd,
        viewType,
        requestTimezone,
        pAnchor
      );
      if (!requestRange.start || !requestRange.end) {
        return;
      }
      const key = `${requestRange.start.toISOString()}__${requestRange.end.toISOString()}__${
        viewType || ""
      }__${requestTimezone}`;
      if (rangeCacheRef.current.has(key) || inflightRef.current.has(key)) {
        return;
      }
      const run = (async () => {
        const p = new URLSearchParams({ id: effectiveId, display });
        if (shouldApplyListSorting && effectiveOrderby) p.set("orderby", effectiveOrderby);
        if (shouldApplyListSorting && order) p.set("order", order);
        p.set("start", requestRange.start.toISOString());
        p.set("end", requestRange.end.toISOString());
        if (viewType) p.set("view_type", viewType);
        if (display === "calendar") p.set("timezone", requestTimezone);

        const prefetched = await publicApi({
          path: `/calendar_events?${p.toString()}`,
          method: "get",
        });

        rangeCacheRef.current.set(key, {
          events: Array.isArray(prefetched?.events) ? prefetched.events : [],
          calendar: prefetched?.calendar || null,
        });
      })();
      inflightRef.current.set(key, run.catch(() => {}));
      try {
        await run;
      } catch {
        // Ignore prefetch errors silently.
      } finally {
        inflightRef.current.delete(key);
      }
    };

    void prefetch(
      new Date(end.getTime()),
      new Date(end.getTime() + spanMs),
      anchorDt.plus({ months: 1 }).toJSDate()
    );
    void prefetch(
      new Date(start.getTime() - spanMs),
      new Date(start.getTime()),
      anchorDt.minus({ months: 1 }).toJSDate()
    );
  };

  const loadAllEvents = async () => {
    try {
      if (display === "list") {
        setLoading(true);
      }

      const params = new URLSearchParams({ id: effectiveId, display });
      if (shouldApplyListSorting && effectiveOrderby) params.set("orderby", effectiveOrderby);
      if (shouldApplyListSorting && order) params.set("order", order);
      if (display === "list") {
        const firstPageSize =
          listMaxResults > 0 ? Math.min(listPerPage, listMaxResults) : listPerPage;
        params.set("page", "1");
        params.set("per_page", String(firstPageSize));
        if (listMaxResults > 0) {
          params.set("max_results", String(listMaxResults));
        }
        if (dateStart) {
          params.set("date_start", dateStart);
        }
        if (dateEnd) {
          params.set("date_end", dateEnd);
        }
      }

      const listSearch = (searchTerm || "").trim();
      if (listSearch) {
        params.set("search", listSearch);
      }

      const response = await publicApi({
        path: `/calendar_events?${params.toString()}`,
        method: "get",
      });

      // A search returns a flat set of matches across all dates (capped
      // server-side), not a paginated window, so render it as-is.
      if (listSearch) {
        const matched = Array.isArray(response.events) ? response.events : [];
        const matchedTotal =
          Number.parseInt(response.total, 10) || matched.length;
        setAllEvents(matched);
        setListTotal(matchedTotal);
        setListPage(1);
        setListHasMore(false);
        return;
      }

      const rawFirstPageEvents = Array.isArray(response.events) ? response.events : [];
      const firstPageEvents =
        listMaxResults > 0
          ? rawFirstPageEvents.slice(0, listMaxResults)
          : rawFirstPageEvents;
      const apiTotal = Number.parseInt(response.total, 10) || firstPageEvents.length;
      const total = listMaxResults > 0 ? Math.min(apiTotal, listMaxResults) : apiTotal;

      setAllEvents(firstPageEvents);
      setListTotal(total);
      setListPage(1);
      setListHasMore(firstPageEvents.length < total);
    } catch (err) {
      console.error("Failed to load all events", err);
      setLoadError(true);
    } finally {
      if (display === "list") {
        setLoading(false);
      }
    }
  };

  const loadMoreListEvents = async () => {
    if (display !== "list" || listLoadingMore || !listHasMore) {
      return;
    }

    if (listMaxResults > 0 && Array.isArray(allEvents) && allEvents.length >= listMaxResults) {
      setListHasMore(false);
      return;
    }

    const nextPage = listPage + 1;

    try {
      setListLoadingMore(true);
      const host =
        typeof window !== "undefined" ? window.location.hostname : "";
      const isLocalHost =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        host.endsWith(".local");

      const currentCount = Array.isArray(allEvents) ? allEvents.length : 0;
      const remainingAllowed =
        listMaxResults > 0 ? Math.max(listMaxResults - currentCount, 0) : listPerPage;
      const nextPageSize =
        listMaxResults > 0 ? Math.min(listPerPage, remainingAllowed) : listPerPage;

      if (nextPageSize <= 0) {
        setListHasMore(false);
        return;
      }

      const params = new URLSearchParams({
        id: effectiveId,
        display,
        page: String(nextPage),
        per_page: String(nextPageSize),
      });
      if (shouldApplyListSorting && effectiveOrderby) params.set("orderby", effectiveOrderby);
      if (shouldApplyListSorting && order) params.set("order", order);
      if (listMaxResults > 0) params.set("max_results", String(listMaxResults));
      if (dateStart) params.set("date_start", dateStart);
      if (dateEnd) params.set("date_end", dateEnd);

      const response = await publicApi({
        path: `/calendar_events?${params.toString()}`,
        method: "get",
      });

      if (isLocalHost) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 3000);
        });
      }

      const rawNextEvents = Array.isArray(response.events) ? response.events : [];
      const nextEvents =
        listMaxResults > 0 ? rawNextEvents.slice(0, nextPageSize) : rawNextEvents;

      if (!nextEvents.length) {
        setListHasMore(false);
        return;
      }

      setAllEvents((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        const seen = new Set(current.map((event) => event?.id));
        const merged = [...current];

        nextEvents.forEach((event) => {
          const key = event?.id;
          if (!seen.has(key)) {
            merged.push(event);
            seen.add(key);
          }
        });

        const apiTotal = Number.parseInt(response.total, 10) || listTotal || merged.length;
        const total =
          listMaxResults > 0 ? Math.min(apiTotal, listMaxResults) : apiTotal;
        setListTotal(total);
        setListHasMore(merged.length < total);

        return merged;
      });

      setListPage(nextPage);
    } catch (err) {
      console.error("Failed to load more list events", err);
    } finally {
      setListLoadingMore(false);
    }
  };

  useEffect(() => {
    if (display === "list") {
      loadAllEvents();
      return;
    }

    getInitialCalendar();
  }, []);

  // Debounced search refetch for list mode. Skips the initial mount (handled by
  // the effect above) and re-runs on every later search change, including
  // clearing the box, which restores the full list.
  const listSearchInitRef = useRef(false);
  useEffect(() => {
    if (!listSearchInitRef.current) {
      listSearchInitRef.current = true;
      return undefined;
    }
    if (display !== "list") {
      return undefined;
    }
    const handle = setTimeout(() => {
      loadAllEvents();
    }, 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  // Retries whichever fetch feeds the current display mode, so a failed
  // load can recover without a full page reload.
  const retry = () => {
    if (display === "list") {
      loadAllEvents();
      return;
    }

    getInitialCalendar();
  };

  return {
    calendar,
    events,
    allEvents,
    view,
    setView,
    currentDate,
    setCurrentDate,
    initialDate,
    loading,
    loadError,
    retry,
    listTotal,
    listHasMore,
    listLoadingMore,
    loadMoreListEvents,
    loadEventsForView,
    lastRangeRef,
  };
}
