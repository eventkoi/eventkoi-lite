"use client";

import { Panel } from "@/components/panel";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { __ } from "@wordpress/i18n";
import { useRef } from "react";

export function EventDescription({ isInstance = false, value, onChange }) {
  const { event: contextEvent, setEvent: contextSetEvent } =
    useEventEditContext();
  const event = isInstance ? null : contextEvent;
  const setEvent = isInstance ? null : contextSetEvent;
  const editorIdRef = useRef(
    `event-description-${Math.random().toString(36).slice(2, 10)}`
  );
  const editorId = editorIdRef.current;

  const currentValue = isInstance ? value || "" : event?.description || "";
  const handleChange = (content) => {
    if (isInstance && onChange) {
      onChange(content);
      return;
    }
    setEvent?.((p) => ({ ...p, description: content }));
  };

  return (
    <Panel className="p-0">
      <Label htmlFor={editorId}>{__("Event description", "eventkoi-lite")}</Label>
      <div className="text-muted-foreground mb-2">
        {__("Tell people what your event is about.", "eventkoi-lite")}
      </div>

      <RichTextEditor
        id={editorId}
        value={currentValue}
        onChange={handleChange}
        height={400}
        allowVideoEmbeds
      />
    </Panel>
  );
}
