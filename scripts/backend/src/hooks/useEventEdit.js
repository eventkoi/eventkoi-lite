import apiRequest from "@wordpress/api-fetch";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export function useEventEdit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [settings, setSettings] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const eventId = parseInt(id, 10) || 0;

  const showEventToast = (response) => {
    if (!response.message) return;

    toast(
      ({ dismiss }) => (
        <div
          className="flex items-center cursor-pointer active:ring-2 active:ring-ring active:ring-offset-2 bg-[#222222] rounded-sm border-0 font-medium justify-between p-4 gap-4 text-sm leading-5 text-primary-foreground w-60"
          onClick={dismiss}
        >
          {response.message}
          {response.url && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                window.open(response.url, "_blank");
              }}
              className="underline underline-offset-2 hover:no-underline"
            >
              View event
            </div>
          )}
        </div>
      ),
      { duration: 4000 }
    );
  };

  const fetchEvent = async () => {
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/event?id=${eventId}`,
        method: "get",
      });

      // Ensure recurrence_rules is always an array
      const safeEvent = {
        ...response,
        recurrence_rules: Array.isArray(response.recurrence_rules)
          ? response.recurrence_rules
          : [],
      };

      setEvent(safeEvent);
    } catch {
      setNotFound(true);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/settings`,
        method: "get",
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      setSettings(response);
    } catch {
      // ignore
    }
  };

  const restoreEvent = async () => {
    setLoading(true);
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/restore_event`,
        method: "post",
        data: { event_id: event?.id },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });

      const safeEvent = {
        ...response.event,
        recurrence_rules: Array.isArray(response.event?.recurrence_rules)
          ? response.event.recurrence_rules
          : [],
      };

      setEvent(safeEvent);
      showEventToast(response);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!eventId) {
      const newEvent = {
        ...eventkoi_params.new_event,
        recurrence_rules: [],
      };
      setEvent(newEvent);
      setLoading(false);
    } else {
      Promise.all([fetchEvent(), fetchSettings()]).finally(() =>
        setLoading(false)
      );
    }
  }, [eventId]);

  useEffect(() => {
    if (location.pathname.endsWith(id)) {
      navigate("main");
    }
  }, [location, id, navigate]);

  return {
    loading,
    setLoading,
    event,
    setEvent,
    settings,
    notFound,
    restoreEvent,
  };
}
