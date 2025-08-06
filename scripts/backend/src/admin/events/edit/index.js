import { EventHeader } from "@/components/event/event-header";
import { EventTabs } from "@/components/event/event-tabs";
import { Button } from "@/components/ui/button";
import { Wrapper } from "@/components/wrapper";
import { EventEditContext } from "@/hooks/EventEditContext";
import { InstanceEditContext } from "@/hooks/InstanceEditContext";
import { useEventEdit } from "@/hooks/useEventEdit";
import { cn } from "@/lib/utils";
import apiRequest from "@wordpress/api-fetch";
import { ChevronLeft, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  const [instanceData, setInstanceData] = useState({});

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
    if (isEditingInstance && event?.id && timestamp) {
      const instanceWithOverride = buildInstanceData(event, timestamp, true);
      setInstanceData(instanceWithOverride);
    }
  }, [isEditingInstance, event, timestamp]);

  // 🛑 Guard early render if event is not ready
  if (!event || (isEditingInstance && !originalInstanceData)) {
    return null;
  }

  if (event.wp_status === "trash") {
    return (
      <div className="flex-1 flex items-center justify-center text-sm flex-col gap-4 relative w-full">
        <div className="absolute top-4 left-4">
          <Button variant="link" asChild>
            <Link to="/events">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
        <TriangleAlert
          className="w-10 h-10 text-muted-foreground"
          strokeWidth={1}
        />
        <div className="text-base text-muted-foreground">
          Event has moved to Trash. Restore it before you can edit.
        </div>
        <div className="pt-4">
          <Button onClick={restoreEvent}>Restore event</Button>
        </div>
      </div>
    );
  }

  const layout = (
    <>
      <EventHeader />
      <Wrapper
        className={isEditingInstance ? "max-w-[800px]" : "max-w-[1180px]"}
      >
        <div
          className={cn(
            "w-full mx-auto items-start gap-6",
            isEditingInstance
              ? "grid grid-cols-1"
              : "grid md:grid-cols-[210px_1fr] grid-cols-1"
          )}
        >
          {!isEditingInstance && <EventTabs />}
          <div className="grid">
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
