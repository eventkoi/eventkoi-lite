import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import { useEventEditContext } from "@/hooks/EventEditContext";
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

  const baseUrl = event?.native_edit_url || "";
  const hasFields = event?.has_plugin_fields === true;

  useEffect(() => {
    if (!baseUrl) return undefined;

    const onMessage = (e) => {
      // Only trust messages from our own admin origin.
      if (e.origin !== window.location.origin) return;
      const data = e.data;
      if (data && data.eventkoiMetaboxEmbed && data.type === "height") {
        const next = Math.max(120, Math.min(6000, Number(data.height) || 0));
        if (next) {
          setHeight((prev) => (Math.abs(prev - next) > 2 ? next : prev));
        }
        if (typeof data.boxes === "number") {
          setBoxCount(data.boxes);
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [baseUrl]);

  if (!baseUrl || !event?.id || !hasFields) {
    return null;
  }

  const src = baseUrl + (baseUrl.includes("?") ? "&" : "?") + "ek_embed=1";

  // The iframe mounts hidden; the embed page reports how many third-party
  // metaboxes rendered, and the panel only appears when there is at least one.
  const revealed = boxCount !== null && boxCount > 0;

  const submitEmbed = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { eventkoiMetaboxEmbed: true, type: "submit" },
      window.location.origin
    );
  };

  return (
    <Box container className={revealed ? "gap-4" : "hidden"}>
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <Heading level={3}>{__("WordPress plugin metaboxes", "eventkoi-lite")}</Heading>
          <p className="text-sm text-muted-foreground">
            {__(
              "These metaboxes are added by other plugins on this site. Update saves them separately from the event.",
              "eventkoi-lite"
            )}
          </p>
        </div>
        <Button type="button" className="shrink-0" onClick={submitEmbed}>
          {__("Update", "eventkoi-lite")}
        </Button>
      </div>
      <iframe
        ref={iframeRef}
        title={__("WordPress plugin metaboxes", "eventkoi-lite")}
        src={src}
        className="w-full"
        style={{ height: `${height}px`, border: "0" }}
      />
      <div className="flex justify-end">
        <Button type="button" onClick={submitEmbed}>
          {__("Update", "eventkoi-lite")}
        </Button>
      </div>
    </Box>
  );
}
