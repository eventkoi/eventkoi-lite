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
import { cn } from "@/lib/utils";
import apiRequest from "@wordpress/api-fetch";
import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const combinedParams = useMemo(() => {
    const merged = new URLSearchParams();
    const sources = [location.search, location.hash];
    sources.forEach((part) => {
      if (!part) return;
      const query = part.startsWith("?")
        ? part.slice(1)
        : part.includes("?")
        ? part.split("?")[1]
        : "";
      if (!query) return;
      const params = new URLSearchParams(query);
      params.forEach((value, key) => {
        merged.set(key, value);
      });
    });
    return merged;
  }, [location.search, location.hash]);
  const onboardingActive =
    combinedParams.get("onboarding") === "demo-event" ||
    combinedParams.get("eventkoi_onboarding") === "demo-event";
  const onboardingHint = useMemo(() => {
    const parsed = parseInt(combinedParams.get("hint"), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [combinedParams]);

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
    runBeforeSave,
  } = useEventEditContext();

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const hasSavedOnce = useRef(false);
  const [highlightPreview, setHighlightPreview] = useState(false);

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

  useEffect(() => {
    const handler = (event) => {
      const step = event?.detail?.step;
      setHighlightPreview(onboardingActive && step === 3);
    };
    window.addEventListener("eventkoi:onboardingStep", handler);
    return () => window.removeEventListener("eventkoi:onboardingStep", handler);
  }, [onboardingActive]);

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

    // Don’t run if we’re already publishing
    if (status === "publish") {
      setDisableAutoSave?.(true);
      setIsPublishing?.(true);
      await new Promise((r) => setTimeout(r, 10));
    }

    try {
      await runBeforeSave?.();
    } catch (error) {
      showToast({ message: "Failed to save tickets. Please try again." });
      if (status === "publish") {
        setIsPublishing?.(false);
        setDisableAutoSave?.(false);
      }
      return;
    }

    const eventToSave = { ...event, wp_status: status };

    const response = await handleAction("update_event", { event: eventToSave });

    if (response?.id) {
      // Always trust the server response for the ID
      setEvent?.(response);

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

  useEffect(() => {
    if (!onboardingActive) {
      setHighlightPreview(false);
      return;
    }
    if (onboardingHint && onboardingHint >= 3) {
      setHighlightPreview(true);
    }
  }, [onboardingActive, onboardingHint]);

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
            onClick={() => {
              const url =
                onboardingActive && highlightPreview
                  ? (() => {
                      try {
                        const previewUrl = new URL(
                          event?.url || "",
                          window.location?.origin
                        );
                        previewUrl.searchParams.set(
                          "onboarding",
                          "demo-event"
                        );
                        return previewUrl.toString();
                      } catch {
                        const separator = (event?.url || "").includes("?")
                          ? "&"
                          : "?";
                        return `${event?.url || ""}${separator}onboarding=demo-event`;
                      }
                    })()
                  : event?.url;
              window.open(url, "_blank");
            }}
            className={cn(
              highlightPreview &&
                "ring-2 ring-[#fb4409] ring-offset-2 ring-offset-white rounded-sm"
            )}
            data-eventkoi-onboarding-preview
          >
            Preview
          </Button>
          <div className="flex items-center gap-[1px]">
            <Button
              variant="default"
              className="rounded-r-none"
              disabled={isDisabled}
              onClick={() => {
                saveEvent("publish");
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("eventkoi:onboardingPublish")
                  );
                }
              }}
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
                  aria-label={__("More actions", "eventkoi")}
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
                  Create duplicate event
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {event?.wp_status === "publish" && (
                  <DropdownMenuItem onClick={() => saveEvent("draft")}>
                    Unpublish
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  disabled={!event?.id}
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
