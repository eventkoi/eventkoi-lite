import { Panel } from "@/components/panel";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { __ } from "@wordpress/i18n";

export function EventExcerpt() {
  const { event, setEvent } = useEventEditContext();

  return (
    <Panel className="p-0">
      <Label htmlFor="event-excerpt">{__("Excerpt", "eventkoi-lite")}</Label>
      <Textarea
        id="event-excerpt"
        rows={3}
        value={event?.excerpt || ""}
        className="w-full"
        onChange={(e) => {
          setEvent((prevState) => ({
            ...prevState,
            excerpt: e.target.value,
          }));
        }}
      />
    </Panel>
  );
}
