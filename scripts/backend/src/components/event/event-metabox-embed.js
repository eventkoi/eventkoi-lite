import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { showToast, showToastError } from "@/lib/toast";
import { __ } from "@wordpress/i18n";
import { useEffect, useRef, useState } from "react";

// Renders the real WordPress editor for this event, stripped down to only the
// fields other plugins add (ACF, Pods, Meta Box, Rank Math, ...), flattened
// into one panel. It is the genuine post.php form; the Update buttons here
// submit that form, so it saves those fields without touching the event or
// blanking anything.
export function EventMetaboxEmbed() {
  const { event } = useEventEditContext();
  const iframeRef = useRef(null);
  const [height, setHeight] = useState(320);
  const [boxCount, setBoxCount] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const baseUrl = event?.native_edit_url || "";
  const hasFields = event?.has_plugin_fields === true;

  useEffect(() => {
    if (!baseUrl) return undefined;

    const onMessage = (e) => {
      // Only trust messages from our own admin origin.
      if (e.origin !== window.location.origin) return;
      const data = e.data;
      if (!data || !data.eventkoiMetaboxEmbed) return;

      if (data.type === "height") {
        const next = Math.max(120, Math.min(6000, Number(data.height) || 0));
        if (next) {
          setHeight((prev) => (Math.abs(prev - next) > 2 ? next : prev));
        }
        if (typeof data.boxes === "number") {
          setBoxCount(data.boxes);
        }
        return;
      }

      if (data.type === "dirty") {
        setDirty(true);
        return;
      }

      if (data.type === "loaded") {
        setSaving(false);
        if (data.saved) {
          setDirty(false);
          showToast({
            message: __("Plugin fields updated.", "eventkoi-lite"),
            variant: "success",
          });
        }
        return;
      }

      if (data.type === "blocked") {
        setSaving(false);
        showToastError(
          data.validation
            ? __("Some plugin fields need fixing before saving.", "eventkoi-lite")
            : __("The plugin fields could not be saved.", "eventkoi-lite")
        );
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [baseUrl]);

  // Leaving with edits still in the panel would drop them: they live in the
  // embedded form until its own Update runs.
  useEffect(() => {
    if (!dirty) return undefined;

    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Moving to another tab unmounts the panel, taking the embedded form with
  // it, and that never reaches beforeunload. Catch the click before the
  // router acts on it.
  useEffect(() => {
    if (!dirty) return undefined;

    const onLinkCapture = (e) => {
      const link = e.target?.closest?.("a[href]");
      if (!link) return;

      const href = link.getAttribute("href") || "";
      const hashAt = href.indexOf("#/");
      if (hashAt < 0) return;
      if (href.slice(hashAt) === window.location.hash) return;

      const leave = window.confirm(
        __(
          "The plugin fields have unsaved changes. Leave this tab and lose them?",
          "eventkoi-lite"
        )
      );
      if (!leave) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("click", onLinkCapture, true);
    return () => document.removeEventListener("click", onLinkCapture, true);
  }, [dirty]);

  if (!baseUrl || !event?.id || !hasFields) {
    return null;
  }

  const src = baseUrl + (baseUrl.includes("?") ? "&" : "?") + "ek_embed=1";

  // The iframe mounts hidden; the embed page reports how many third-party
  // metaboxes rendered, and the panel only appears when there is at least one.
  const revealed = boxCount !== null && boxCount > 0;

  const submitEmbed = () => {
    if (saving) return;
    setSaving(true);
    iframeRef.current?.contentWindow?.postMessage(
      { eventkoiMetaboxEmbed: true, type: "submit" },
      window.location.origin
    );
  };

  const updateLabel = saving ? __("Saving…", "eventkoi-lite") : __("Update", "eventkoi-lite");

  return (
    <Box
      container
      className={
        revealed
          ? "gap-4 opacity-100 transition-opacity duration-200"
          : "hidden opacity-0"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <div className="flex items-center gap-2">
            <Heading level={3}>
              {__("Fields from other plugins", "eventkoi-lite")}
            </Heading>
            {dirty && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                {__("Unsaved changes", "eventkoi-lite")}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {__(
              "These fields are added by other plugins on this site. Update saves them separately from the event.",
              "eventkoi-lite"
            )}
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0"
          disabled={saving}
          onClick={submitEmbed}
        >
          {updateLabel}
        </Button>
      </div>
      <iframe
        ref={iframeRef}
        title={__("Fields from other plugins", "eventkoi-lite")}
        src={src}
        className="w-full"
        style={{ height: `${height}px`, border: "0" }}
      />
      <div className="flex justify-end">
        <Button type="button" disabled={saving} onClick={submitEmbed}>
          {updateLabel}
        </Button>
      </div>
    </Box>
  );
}
