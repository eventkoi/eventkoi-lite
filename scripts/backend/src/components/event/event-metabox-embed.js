import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { __ } from "@wordpress/i18n";
import { useEffect, useRef, useState } from "react";

// Embeds the real WordPress editor for this event, stripped to third-party
// metaboxes only (ACF, Rank Math, Yoast, Pods, ...), inside an iframe. The
// panel saves through its own Update button, independent of EventKoi's Save,
// which keeps the native form complete and avoids blanking any event field.
export function EventMetaboxEmbed() {
  const { event } = useEventEditContext();
  const iframeRef = useRef(null);
  const [height, setHeight] = useState(500);

  const baseUrl = event?.native_edit_url || "";
  const hasPluginFields = event?.has_plugin_fields !== false;

  useEffect(() => {
    if (!baseUrl) return undefined;

    const onMessage = (e) => {
      // Only trust messages from our own admin origin.
      if (e.origin !== window.location.origin) return;
      const data = e.data;
      if (data && data.eventkoiMetaboxEmbed && data.type === "height") {
        const next = Math.max(200, Math.min(6000, Number(data.height) || 0));
        if (next) {
          setHeight((prev) => (Math.abs(prev - next) > 2 ? next : prev));
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [baseUrl]);

  if (!baseUrl || !event?.id || !hasPluginFields) {
    return null;
  }

  const src =
    baseUrl + (baseUrl.includes("?") ? "&" : "?") + "ek_embed=1";

  return (
    <Box container className="gap-4">
      <div className="grid gap-1">
        <Heading level={3}>{__("Other plugin fields", "eventkoi-lite")}</Heading>
        <p className="text-sm text-muted-foreground">
          {__(
            "Custom fields added by other plugins, such as ACF, Pods, or Meta Box, appear here. Use the Update button in this panel to save them; it saves separately from the event.",
            "eventkoi-lite"
          )}
        </p>
      </div>
      <iframe
        ref={iframeRef}
        title={__("Other plugin fields", "eventkoi-lite")}
        src={src}
        className="w-full rounded-md border border-border bg-white"
        style={{ height: `${height}px` }}
      />
    </Box>
  );
}
