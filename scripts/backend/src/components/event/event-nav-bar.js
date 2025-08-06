import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { useInstanceEditContext } from "@/hooks/InstanceEditContext";
import { showToast } from "@/lib/toast";
import apiRequest from "@wordpress/api-fetch";
import { ChevronDown, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Optional: Replace this with lodash.isequal if needed
function deepEqual(a, b) {
  if (a === b) return true;

  if (typeof a !== typeof b) return false;

  if (a && typeof a === "object" && b && typeof b === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!b.hasOwnProperty(key) || !deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }

  return false;
}

export function EventNavBar() {
  const location = useLocation();
  const isInstanceEdit = location.pathname.includes("/instances/edit/");

  let instanceCtx = null;
  try {
    instanceCtx = useInstanceEditContext();
  } catch (e) {
    instanceCtx = null;
  }

  const navigate = useNavigate();

  const {
    event,
    setEvent,
    loading,
    setLoading,
    setIsPublishing,
    setDisableAutoSave,
  } = useEventEditContext?.() || {};

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const hasSavedOnce = useRef(false);

  const isDisabled = isInstanceEdit
    ? saving || loading
    : !event?.title?.trim() || saving || loading;

  const handleSaveInstance = async () => {
    if (!instanceCtx?.data || !instanceCtx.eventId || !instanceCtx.timestamp)
      return;

    setSaving(true);
    try {
      await apiRequest({
        path: `${eventkoi_params.api}/edit_instance`,
        method: "post",
        data: {
          event_id: parseInt(instanceCtx.eventId),
          timestamp: parseInt(instanceCtx.timestamp),
          overrides: instanceCtx.data,
        },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });

      setEvent?.((prev) => {
        const overrides = { ...(prev?.recurrence_overrides || {}) };

        overrides[instanceCtx.timestamp] = {
          ...(overrides[instanceCtx.timestamp] || {}),
          ...instanceCtx.data,
          modified_at: new Date().toISOString(),
        };

        return {
          ...prev,
          recurrence_overrides: overrides,
        };
      });

      showToast({ message: "Instance updated!" });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (err) {
      showToast({ message: "Failed to save instance." });
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (path, data = {}) => {
    setSaving(true);
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/${path}`,
        method: "post",
        data,
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      showToast(response);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
      return response;
    } catch (error) {
      showToast({ message: "Failed to save. Please try again." });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const saveEvent = async (status) => {
    if (!event?.title?.trim()) return;

    if (!event?.id && hasSavedOnce.current) return;

    if (status === "publish") {
      setDisableAutoSave?.(true);
      setIsPublishing?.(true);
      await new Promise((r) => setTimeout(r, 10));
    }

    const eventToSave = { ...event, wp_status: status };
    const response = await handleAction("update_event", { event: eventToSave });

    if (response?.id) {
      setEvent?.(response);
      if (!event?.id) {
        hasSavedOnce.current = true;
        window.location.hash = window.location.hash.replace("add", response.id);
      }
    }

    if (status === "publish") {
      setIsPublishing?.(false);
      setDisableAutoSave?.(false);
    }
  };

  const trashEvent = async () => {
    await handleAction("delete_event", { event_id: event?.id });
    navigate("/events");
  };

  const duplicateEvent = async () => {
    const response = await handleAction("duplicate_event", {
      event_id: event?.id,
    });
    if (response?.id && event?.id) {
      window.location.hash = window.location.hash.replace(
        event.id,
        response.id
      );
    }
    setEvent?.(response);
  };

  const hasInstanceChanges =
    isInstanceEdit &&
    instanceCtx?.data &&
    instanceCtx?.originalData &&
    !deepEqual(instanceCtx.data, instanceCtx.originalData);

  return (
    <div className="flex gap-1 md:gap-2">
      {justSaved && (
        <div className="text-xs text-muted-foreground mr-6 self-center">
          Saved just now
        </div>
      )}

      {isInstanceEdit && instanceCtx ? (
        <>
          {event?.url && instanceCtx?.timestamp && (
            <Button
              variant="link"
              onClick={() =>
                window.open(
                  `${event.url}?instance=${instanceCtx.timestamp}`,
                  "_blank"
                )
              }
            >
              Preview
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => {
              instanceCtx.resetData();
              showToast({ message: "Changes reverted." });
            }}
            disabled={!hasInstanceChanges}
          >
            Reset
          </Button>

          <Button
            disabled={!hasInstanceChanges || saving}
            onClick={handleSaveInstance}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              <>
                <span className="sm:hidden">Save</span>
                <span className="hidden sm:inline">Save instance</span>
              </>
            )}
          </Button>
        </>
      ) : (
        <>
          {event?.wp_status === "draft" && (
            <Button
              variant="ghost"
              disabled={isDisabled}
              onClick={() => saveEvent("draft")}
            >
              Save draft
            </Button>
          )}
          <Button
            variant="link"
            disabled={isDisabled || !event?.url}
            onClick={() => window.open(event?.url, "_blank")}
          >
            Preview
          </Button>
          <div className="flex items-center gap-[1px]">
            <Button
              variant="default"
              className="rounded-r-none"
              disabled={isDisabled}
              onClick={() => saveEvent("publish")}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : event?.wp_status === "draft" ? (
                "Publish"
              ) : (
                "Save"
              )}
            </Button>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="rounded-l-none"
                  disabled={isDisabled}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 z-[510]" align="end">
                {/* <DropdownMenuItem>Schedule publish</DropdownMenuItem> */}
                <DropdownMenuItem
                  disabled={!event?.id}
                  onClick={duplicateEvent}
                >
                  Create duplicate event
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {event?.wp_status === "publish" && (
                  <DropdownMenuItem onClick={() => saveEvent("draft")}>
                    Unpublish
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={trashEvent}
                >
                  Move to trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  );
}
