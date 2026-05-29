import { __ } from "@wordpress/i18n";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Panel } from "@/components/panel";

export function EventDescription({ event, setEvent }) {
  return (
    <Panel>
      <Label htmlFor="description">
        {__("Event description", "eventkoi-lite")}
      </Label>
      <Textarea
        id="description"
        placeholder={__(
          "Share details of this event with your guests.",
          "eventkoi-lite"
        )}
        className="min-h-[110px]"
        value={event?.description}
        onChange={(e) => {
          setEvent((prevState) => ({
            ...prevState,
            description: e.target.value,
          }));
        }}
      />
    </Panel>
  );
}
