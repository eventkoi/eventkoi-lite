import { useOutletContext } from "react-router-dom";

import { Separator } from "@/components/ui/separator";

import { Box } from "@/components/box";
import { CalendarDisplay } from "@/components/calendar/calendar-display";
import { CalendarStartDay } from "@/components/calendar/calendar-start-day";
import { CalendarTimeFrame } from "@/components/calendar/calendar-time-frame";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";

export function CalendarEditDetails() {
  const [calendar, setCalendar] = useOutletContext();

  return (
    <Box>
      <div className="grid w-full">
        <Panel variant="header">
          <Heading level={3}>Additional details</Heading>
        </Panel>
        <Separator />
        <CalendarDisplay calendar={calendar} setCalendar={setCalendar} />
        <Separator />
        <CalendarTimeFrame calendar={calendar} setCalendar={setCalendar} />
        <Separator />
        <CalendarStartDay calendar={calendar} setCalendar={setCalendar} />
      </div>
    </Box>
  );
}
