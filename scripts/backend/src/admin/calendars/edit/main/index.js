import { Box } from "@/components/box";
import { CalendarColor } from "@/components/calendar/calendar-color";
import { CalendarDefaults } from "@/components/calendar/calendar-defaults";
import { CalendarDisplay } from "@/components/calendar/calendar-display";
import { CalendarName } from "@/components/calendar/calendar-name";
import { CalendarSlug } from "@/components/calendar/calendar-slug";
import { CalendarStartDay } from "@/components/calendar/calendar-start-day";
import { CalendarTimeFrame } from "@/components/calendar/calendar-time-frame";
import { Separator } from "@/components/ui/separator";
import { useOutletContext } from "react-router-dom";

export function CalendarEditMain() {
  const [calendar, setCalendar] = useOutletContext();

  return (
    <Box>
      <div className="grid w-full">
        <CalendarName calendar={calendar} setCalendar={setCalendar} />
        <Separator />
        <div className="flex flex-col px-6 py-8 w-full gap-10">
          <CalendarSlug calendar={calendar} setCalendar={setCalendar} />
          <CalendarColor calendar={calendar} setCalendar={setCalendar} />
          <CalendarDisplay calendar={calendar} setCalendar={setCalendar} />
          <CalendarTimeFrame calendar={calendar} setCalendar={setCalendar} />
          <CalendarDefaults calendar={calendar} setCalendar={setCalendar} />
          <CalendarStartDay calendar={calendar} setCalendar={setCalendar} />
        </div>
      </div>
    </Box>
  );
}
