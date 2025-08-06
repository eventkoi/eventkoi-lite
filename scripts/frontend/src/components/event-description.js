import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Panel } from "@/components/panel";

export function EventDescription({ event, setEvent }) {
  return (
    <Panel>
      <Label htmlFor="description">Event description</Label>
      <Textarea
        id="description"
        placeholder="Share details of this event with your guests."
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
