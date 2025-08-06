import { useOutletContext } from "react-router-dom";

import { Separator } from "@/components/ui/separator";

import { Box } from "@/components/box";
import { CalendarBlock } from "@/components/calendar/calendar-block";
import { CalendarLink } from "@/components/calendar/calendar-link";
import { CalendarShortcode } from "@/components/calendar/calendar-shortcode";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";

export function CalendarEditEmbed() {
  const [calendar, setCalendar] = useOutletContext();

  return (
    <Box>
      <div className="grid w-full">
        <Panel variant="header">
          <Heading level={3}>Embed</Heading>
        </Panel>
        <Separator />
        <CalendarLink calendar={calendar} setCalendar={setCalendar} />
        <Separator />
        <CalendarShortcode calendar={calendar} setCalendar={setCalendar} />
        <Separator />
        <CalendarBlock calendar={calendar} setCalendar={setCalendar} />
      </div>
    </Box>
  );
}
