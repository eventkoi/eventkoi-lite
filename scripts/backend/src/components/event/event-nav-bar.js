import { __ } from "@wordpress/i18n";
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
import { tourEventSaved, tourHandlePreview } from "@/tour/store";
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
    setNameError,
    runBeforeSave,
  } = useEventEditContext();

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const hasSavedOnce = useRef(false);

  const isDisabled = saving || loading;

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

      showToast({ message: __("Instance updated!", "eventkoi-lite") });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (err) {
      showToast({ message: __("Failed to save instance.", "eventkoi-lite") });
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
      showToast({ message: __("Failed to save. Please try again.", "eventkoi-lite") });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const saveEvent = async (status) => {
    const trimmedTitle = (event?.title || "").trim();
    if (!trimmedTitle || "Untitled event" === trimmedTitle) {
      setNameError?.(true);
      showToast({ message: __("Please enter an event name.", "eventkoi-lite") });
      const nameField = document.getElementById("event-name");
      if (nameField) {
        nameField.scrollIntoView({ behavior: "smooth", block: "center" });
        nameField.focus({ preventScroll: true });
      }
      return;
    }

    // Don’t run if we’re already publishing
    if (status === "publish") {
      setDisableAutoSave?.(true);
      setIsPublishing?.(true);
      await new Promise((r) => setTimeout(r, 10));
    }

    try {
      await runBeforeSave?.();
    } catch (error) {
      showToast({ message: __("Failed to save tickets. Please try again.", "eventkoi-lite") });
      if (status === "publish") {
        setIsPublishing?.(false);
        setDisableAutoSave?.(false);
      }
      return;
    }

    const eventToSave = { ...event, wp_status: status };

    // try/finally so the publish/disable flags always reset, even when
    // handleAction throws. Previously the reset only ran on success, leaving
    // the publish button permanently disabled until full reload.
    try {
      const response = await handleAction("update_event", { event: eventToSave });

      if (response?.id) {
        // Always trust the server response for the ID
        setEvent?.(response);
        tourEventSaved(response);

        // Mark that we have a permanent ID now
        if (!hasSavedOnce.current) {
          hasSavedOnce.current = true;

          // Fix the URL only once
          if (window.location.hash.includes("/events/add/")) {
            window.location.hash = window.location.hash.replace(
              "/events/add/",
              `/events/${response.id}/`
            );
          }
        }
      }
    } finally {
      if (status === "publish") {
        setIsPublishing?.(false);
        setDisableAutoSave?.(false);
      }
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
          {__("Saved just now", "eventkoi-lite")}
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
              {__("Preview", "eventkoi-lite")}
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => {
              instanceCtx.resetData();
              showToast({ message: __("Changes reverted.", "eventkoi-lite") });
            }}
            disabled={!hasInstanceChanges}
          >
            {__("Reset", "eventkoi-lite")}
          </Button>

          <Button
            disabled={!hasInstanceChanges || saving}
            onClick={handleSaveInstance}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {__("Saving...", "eventkoi-lite")}
              </span>
            ) : (
              <>
                <span className="sm:hidden">{__("Save", "eventkoi-lite")}</span>
                <span className="hidden sm:inline">{__("Save instance", "eventkoi-lite")}</span>
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
              {__("Save draft", "eventkoi-lite")}
            </Button>
          )}
          <Button
            variant="link"
            disabled={isDisabled || !event?.url}
            onClick={() => {
              if (tourHandlePreview(event)) return;
              window.open(event?.url, "_blank");
            }}
            data-ek-tour="preview"
          >
            {__("Preview", "eventkoi-lite")}
          </Button>
          <div className="flex items-center gap-[1px]">
            <Button
              variant="default"
              className="rounded-r-none"
              disabled={isDisabled}
              onClick={() => saveEvent("publish")}
              data-ek-tour="publish"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {__("Saving...", "eventkoi-lite")}
                </span>
              ) : event?.wp_status === "draft" ? (
                __("Publish", "eventkoi-lite")
              ) : (
                __("Save", "eventkoi-lite")
              )}
            </Button>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="rounded-l-none"
                  disabled={isDisabled}
                  aria-label={__("More actions", "eventkoi-lite")}
                >
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 z-[510000]" align="end">
                {/* <DropdownMenuItem>Schedule publish</DropdownMenuItem> */}
                <DropdownMenuItem
                  disabled={!event?.id}
                  onClick={duplicateEvent}
                >
                  {__("Create duplicate event", "eventkoi-lite")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {event?.wp_status === "publish" && (
                  <DropdownMenuItem onClick={() => saveEvent("draft")}>
                    {__("Unpublish", "eventkoi-lite")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  disabled={!event?.id}
                  className="text-destructive focus:text-destructive"
                  onClick={trashEvent}
                >
                  {__("Move to trash", "eventkoi-lite")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  );
}
