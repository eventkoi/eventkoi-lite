"use client";

import { getInitialCalendarDate } from "@/lib/date-utils";
import apiRequest from "@wordpress/api-fetch";
import { useEffect, useRef, useState } from "react";

export function useCalendarData({
  id,
  calendars,
  display,
  timeframe,
  context,
  defaultMonth,
  defaultYear,
  calendarRef,
}) {
  const [calendar, setCalendar] = useState({});
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState(null);
  const [view, setView] = useState();
  const [currentDate, setCurrentDate] = useState(null);
  const [initialDate, setInitialDate] = useState(null);
  const [loading, setLoading] = useState(false);

  const lastRangeRef = useRef(null);
  const hasLoadedView = useRef(false);

  // Use calendars if present, otherwise id
  const effectiveId = calendars || id;

  const getInitialCalendar = async () => {
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/calendar_events?id=${effectiveId}&display=${display}&initial=true`,
        method: "get",
      });

      setCalendar(response.calendar);

      const defaultView =
        timeframe === "week" || response.calendar.timeframe === "week"
          ? "timeGridWeek"
          : "dayGridMonth";

      setView(defaultView);

      const date = getInitialCalendarDate({
        context,
        defaultMonth,
        defaultYear,
        calendar: response.calendar,
      });

      setCurrentDate(date);
      setInitialDate(date);
      console.log(date);

      console.log("EK: initial load for calendar view");
    } catch (err) {
      console.error("Failed to load initial calendar", err);
    }
  };

  const loadEventsForView = async (start, end) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ id: effectiveId, display });
      if (start) params.set("start", start.toISOString());
      if (end) params.set("end", end.toISOString());

      const response = await apiRequest({
        path: `${eventkoi_params.api}/calendar_events?${params.toString()}`,
        method: "get",
      });

      setEvents(response.events);
      setCalendar(response.calendar);

      console.log("EK: loaded events for view");

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
      const params = new URLSearchParams({ id: effectiveId, display });
      const response = await apiRequest({
        path: `${eventkoi_params.api}/calendar_events?${params.toString()}`,
        method: "get",
      });
      setAllEvents(response.events);

      console.log("EK: loaded all events for search");
    } catch (err) {
      console.error("Failed to load all events", err);
    }
  };

  useEffect(() => {
    getInitialCalendar();

    // For list view, load all events immediately
    if (display === "list") {
      loadAllEvents();
    }
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
    loadEventsForView,
    lastRangeRef,
  };
}
