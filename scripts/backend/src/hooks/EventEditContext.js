// hooks/EventEditContext.jsx
import apiRequest from "@wordpress/api-fetch";
import { createContext, useContext, useRef, useState } from "react";

export const EventEditContext = createContext(null);

export function EventEditProvider({ children }) {
  const [event, setEvent] = useState({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [disableAutoSave, setDisableAutoSave] = useState(false);

  // Track if this event has ever been saved (for drafts)
  const hasSavedOnce = useRef(false);

  // Centralized saveEvent
  const saveEvent = async (status = "draft") => {
    if (!event?.title?.trim()) return;

    // Prevent creating multiple new drafts
    if (!event?.id && hasSavedOnce.current) return;

    if (status === "publish") {
      setDisableAutoSave(true);
      setIsPublishing(true);
      await new Promise((r) => setTimeout(r, 10));
    }

    try {
      const eventToSave = { ...event, wp_status: status };
      const response = await apiRequest({
        path: `${eventkoi_params.api}/update_event`,
        method: "POST",
        data: { event: eventToSave },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });

      if (response?.id) {
        setEvent(response);

        if (!hasSavedOnce.current) {
          hasSavedOnce.current = true;

          // Fix URL only once
          if (window.location.hash.includes("/events/add/")) {
            window.location.hash = window.location.hash.replace(
              "/events/add/",
              `/events/${response.id}/`
            );
          }
        }
      }

      return response;
    } finally {
      if (status === "publish") {
        setIsPublishing(false);
        setDisableAutoSave(false);
      }
    }
  };

  return (
    <EventEditContext.Provider
      value={{
        event,
        setEvent,
        isPublishing,
        setIsPublishing,
        disableAutoSave,
        setDisableAutoSave,
        saveEvent,
      }}
    >
      {children}
    </EventEditContext.Provider>
  );
}

export function useEventEditContext() {
  const context = useContext(EventEditContext);
  if (!context) {
    throw new Error(
      "useEventEditContext must be used within an EventEditContext.Provider"
    );
  }
  return context;
}
