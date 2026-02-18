"use client";

import { getInitialCalendarDate } from "@/lib/date-utils";
import { useEffect, useRef, useState } from "react";
import publicApi from "@/lib/public-api";

export function useCalendarData({
  id,
  calendars,
  display,
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
  const [listTotal, setListTotal] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [listHasMore, setListHasMore] = useState(false);
  const [listLoadingMore, setListLoadingMore] = useState(false);

  const lastRangeRef = useRef(null);
  const hasLoadedView = useRef(false);

  // Use calendars if present, otherwise id
  const effectiveId = calendars || id;
  const shouldApplyListSorting = display === "list";
  const listPerPage = Math.max(1, Number.parseInt(perPage, 10) || 10);
  const parsedMaxResults = Number.parseInt(maxResults, 10);
  const listMaxResults =
    Number.isFinite(parsedMaxResults) && parsedMaxResults > 0
      ? parsedMaxResults
      : 0;

  const getInitialCalendar = async () => {
    try {
      const params = new URLSearchParams({
        id: effectiveId,
        display,
        initial: "true",
      });
      if (shouldApplyListSorting && orderby) params.set("orderby", orderby);
      if (shouldApplyListSorting && order) params.set("order", order);

      const response = await publicApi({
        path: `/calendar_events?${params.toString()}`,
        method: "get",
      });

      setCalendar(response.calendar);

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
      });

      setCurrentDate(date);
      setInitialDate(date);
    } catch (err) {
      console.error("Failed to load initial calendar", err);
    }
  };

  const loadEventsForView = async (start, end) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ id: effectiveId, display });
      if (shouldApplyListSorting && orderby) params.set("orderby", orderby);
      if (shouldApplyListSorting && order) params.set("order", order);
      if (start) params.set("start", start.toISOString());
      if (end) params.set("end", end.toISOString());

      const response = await publicApi({
        path: `/calendar_events?${params.toString()}`,
        method: "get",
      });

      setEvents(response.events);
      setCalendar(response.calendar);

      if (!hasLoadedView.current) {
        hasLoadedView.current = true;
        loadAllEvents();
      }
    } catch (err) {
      console.error("Failed to load events for view", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllEvents = async () => {
    try {
      if (display === "list") {
        setLoading(true);
      }

      const params = new URLSearchParams({ id: effectiveId, display });
      if (shouldApplyListSorting && orderby) params.set("orderby", orderby);
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
      const response = await publicApi({
        path: `/calendar_events?${params.toString()}`,
        method: "get",
      });
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
      if (shouldApplyListSorting && orderby) params.set("orderby", orderby);
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
    listTotal,
    listHasMore,
    listLoadingMore,
    loadMoreListEvents,
    loadEventsForView,
    lastRangeRef,
  };
}
