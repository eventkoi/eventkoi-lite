import { EventDateMultiple } from "@/components/event/event-date-multiple";
import { EventDateTBCSetting } from "@/components/event/event-date-tbc-setting";
import { EventDateTimezoneSetting } from "@/components/event/event-date-timezone-setting";

export function EventDateStandard({ event, setEvent, showAttributes }) {
  return (
    <div className="flex flex-col gap-6">
      <EventDateMultiple showAttributes={showAttributes} />
      <EventDateTBCSetting event={event} setEvent={setEvent} />
      <EventDateTimezoneSetting event={event} setEvent={setEvent} />
    </div>
  );
}
