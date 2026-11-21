import { EventHeader } from "@/components/event/event-header";
import { EventTabs } from "@/components/event/event-tabs";
import { Button } from "@/components/ui/button";
import { Wrapper } from "@/components/wrapper";
import { EventEditContext } from "@/hooks/EventEditContext";
import { InstanceEditContext } from "@/hooks/InstanceEditContext";
import { useEventEdit } from "@/hooks/useEventEdit";
import { cn } from "@/lib/utils";
import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";
import { ChevronLeft, CalendarX, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useParams } from "react-router-dom";

export function buildInstanceData(event, timestamp, useOverride = true) {
  const override = useOverride
    ? event?.recurrence_overrides?.[timestamp] || {}
    : {};

  const keys = [
    "title",
    "description",
    "summary",
    "image",
    "image_id",
    "template",
    "locations",
  ];

  const result = {};

  for (const key of keys) {
    if (useOverride && override[key] !== undefined) {
      result[key] = override[key];
    } else if (event && Object.prototype.hasOwnProperty.call(event, key)) {
      result[key] = event[key];
    } else {
      result[key] = null;
    }
  }

  return result;
}

export function EventEdit() {
  const {
    loading,
    setLoading,
    event,
    setEvent,
    settings,
    notFound,
    restoreEvent,
  } = useEventEdit();

  const [isPublishing, setIsPublishing] = useState(false);
  const [disableAutoSave, setDisableAutoSave] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [instanceData, setInstanceData] = useState({});
  const beforeSaveHandlersRef = useRef([]);

  const registerBeforeSave = useCallback((handler) => {
    if (typeof handler !== "function") return () => {};
    beforeSaveHandlersRef.current = [
      ...beforeSaveHandlersRef.current,
      handler,
    ];
    return () => {
      beforeSaveHandlersRef.current = beforeSaveHandlersRef.current.filter(
        (entry) => entry !== handler
      );
    };
  }, []);

  const runBeforeSave = useCallback(async () => {
    for (const handler of beforeSaveHandlersRef.current) {
      await handler();
    }
  }, []);

  const location = useLocation();
  const { id, timestamp } = useParams();
  const isEditingInstance = location.pathname.includes("/instances/edit/");

  // Safely compute default instance data (without override)
  const originalInstanceData = useMemo(() => {
    if (!isEditingInstance || !event || !timestamp) return null;
    return buildInstanceData(event, timestamp, false);
  }, [isEditingInstance, event, timestamp]);

  const resetInstanceData = async () => {
    if (!event?.id || !timestamp) return;

    try {
      await apiRequest({
        path: `${eventkoi_params.api}/reset_instance`,
        method: "POST",
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
        data: {
          event_id: event.id,
          timestamp,
        },
      });

      const newInstance = buildInstanceData(event, timestamp, false);
      setInstanceData(newInstance);
    } catch (error) {
      console.error("Failed to reset instance:", error);
    }
  };

  useEffect(() => {
    // only when creating new event
    if (!event?.id && window.location.hash.includes("/events/add/")) {
      (async () => {
        try {
          const draft = await apiRequest({
            path: `${eventkoi_params.api}/update_event`,
            method: "POST",
            data: {
              event: {
                title: "",
                excerpt: "(auto-draft)",
                wp_status: "draft",
              },
            },
            headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
          });

          if (draft?.id) {
            setEvent(draft);
            window.location.hash = window.location.hash.replace(
              "/events/add/",
              `/events/${draft.id}/`
            );
          }
        } catch (err) {
          console.error("❌ Failed to create auto-draft", err);
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (isEditingInstance && event?.id && timestamp) {
      const instanceWithOverride = buildInstanceData(event, timestamp, true);
      setInstanceData(instanceWithOverride);
    }
  }, [isEditingInstance, event, timestamp]);

  if (!event || (isEditingInstance && !originalInstanceData)) {
    if (notFound) {
      return (
        <div className="flex-1 flex items-center justify-center w-full min-h-[60vh] px-4">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-sm p-8 flex flex-col items-center text-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <CalendarX
                className="h-7 w-7 text-muted-foreground"
                strokeWidth={1.5}
              />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold tracking-tight">
                {__("Event not found", "eventkoi-lite")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {__(
                  "This event may have been deleted, or the link points to an ID that doesn't exist.",
                  "eventkoi-lite"
                )}
              </p>
            </div>
            <Button asChild className="mt-1">
              <Link to="/events">
                <ChevronLeft className="mr-2 h-4 w-4" />
                {__("Back to events", "eventkoi-lite")}
              </Link>
            </Button>
          </div>
        </div>
      );
    }

    return null;
  }

  if (event.wp_status === "trash") {
    return (
      <div className="flex-1 flex items-center justify-center w-full min-h-[60vh] px-4">
        <div className="w-full max-w-md rounded-xl border bg-card shadow-sm p-8 flex flex-col items-center text-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Trash2
              className="h-7 w-7 text-muted-foreground"
              strokeWidth={1.5}
            />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold tracking-tight">
              {__("Event is in Trash", "eventkoi-lite")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {__(
                "Restore this event to make changes. While trashed it stays hidden from the public calendar.",
                "eventkoi-lite"
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Button variant="outline" asChild>
              <Link to="/events">
                <ChevronLeft className="mr-2 h-4 w-4" />
                {__("Back", "eventkoi-lite")}
              </Link>
            </Button>
            <Button onClick={restoreEvent}>
              {__("Restore event", "eventkoi-lite")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const layout = (
    <>
      <EventHeader />
      <Wrapper className={isEditingInstance ? "max-w-[800px]" : undefined}>
        <div
          className={cn(
            "w-full mx-auto items-start gap-6",
            isEditingInstance
              ? "grid grid-cols-1"
              : "grid md:grid-cols-[180px_1fr] grid-cols-1"
          )}
        >
          {!isEditingInstance && <EventTabs />}
          <div className="grid grid-cols-1 min-w-0">
            <Outlet
              context={{
                instanceData,
                setInstanceData,
              }}
            />
          </div>
        </div>
        <div className="h-10" />
      </Wrapper>
    </>
  );

  return (
    <EventEditContext.Provider
      value={{
        event,
        setEvent,
        loading,
        setLoading,
        settings,
        restoreEvent,
        isPublishing,
        setIsPublishing,
        disableAutoSave,
        setDisableAutoSave,
        nameError,
        setNameError,
        registerBeforeSave,
        runBeforeSave,
      }}
    >
      {isEditingInstance ? (
        <InstanceEditContext.Provider
          value={{
            data: instanceData,
            setData: setInstanceData,
            originalData: originalInstanceData,
            setOriginalData: () => {},
            resetData: resetInstanceData,
            eventId: event.id,
            timestamp,
            setEvent,
          }}
        >
          {layout}
        </InstanceEditContext.Provider>
      ) : (
        layout
      )}

    </EventEditContext.Provider>
  );
}
