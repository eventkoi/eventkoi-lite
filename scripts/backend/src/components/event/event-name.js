import { Panel } from "@/components/panel";
import { Textarea } from "@/components/ui/textarea";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { formatWallTimeRange } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { PencilLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function EventName({
  isInstance = false,
  value,
  onChange,
  timestamp,
  startDate,
  endDate,
  timezone,
}) {
  const { event, setEvent, isPublishing } = useEventEditContext();
  const [error, setError] = useState(false);
  const textareaRef = useRef(null);

  const effectiveTimezone = timezone || event?.timezone || "UTC";

  function updateName(e) {
    const val = e.target.value;
    setError(!val.trim());

    if (isInstance && onChange) {
      onChange(val);
    } else {
      setEvent((prev) => ({ ...prev, title: val }));
    }
  }

  function autoResize() {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }

  useEffect(() => {
    autoResize();
  }, [value, event?.title]);

  useEffect(() => {
    if (!event?.id && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [event?.id]);

  const rawValue = isInstance ? value : event?.title || "";

  // Hide "Untitled event" in UI
  const displayValue = rawValue === "Untitled event" ? "" : rawValue;

  return (
    <Panel
      className={cn(
        "flex flex-col items-start justify-between p-0",
        isInstance && "sm:flex-row"
      )}
    >
      {/* Title input */}
      <div className="group relative flex w-full items-center gap-2 flex-1">
        <Textarea
          ref={textareaRef}
          id="event-name"
          className={cn(
            "inline-flex sm:w-full resize-none overflow-hidden bg-transparent focus:outline-none border-2 border-transparent hover:border-input focus:border-input active:border-input rounded-md p-2 font-medium text-2xl leading-tight min-h-0 w-full max-w-full",
            error && "border-red-500",
            !displayValue && "text-muted-foreground"
          )}
          value={displayValue}
          onInput={(e) => {
            updateName(e);
            autoResize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              textareaRef.current.blur();
            }
          }}
          placeholder="Enter event name"
          rows={1}
        />
        <div
          onClick={() => {
            textareaRef.current.focus();
            textareaRef.current.selectionStart =
              textareaRef.current.value.length;
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <PencilLine className="w-4 h-4 text-ring" />
        </div>
      </div>

      {/* Right: Instance ID and time range */}
      {isInstance && timestamp && (
        <div className="flex flex-col md:items-end md:pl-4 pt-1 md:text-right text-foreground text-xs whitespace-nowrap min-w-[140px]">
          <div className="text-[13px]">
            <span className="font-medium">Event ID:</span> {timestamp}
          </div>
          {startDate && endDate && (
            <div className="pt-2 text-base">
              {formatWallTimeRange(startDate, endDate, effectiveTimezone)}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 font-medium">
          Event name cannot be blank
        </p>
      )}
    </Panel>
  );
}
