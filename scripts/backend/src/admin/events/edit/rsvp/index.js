import { Box } from "@/components/box";
import { EventRsvpSettings } from "@/components/event/event-rsvp";
import { useEventEditContext } from "@/hooks/EventEditContext";

export function EventEditRsvp() {
  const { event, setEvent } = useEventEditContext();

  return (
    <div className="flex flex-col w-full gap-8">
      <Box container>
        <EventRsvpSettings event={event} setEvent={setEvent} />
      </Box>
    </div>
  );
}
