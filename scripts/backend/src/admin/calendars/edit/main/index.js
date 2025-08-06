import { Box } from "@/components/box";
import { CalendarColor } from "@/components/calendar/calendar-color";
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
        <CalendarSlug calendar={calendar} setCalendar={setCalendar} />
        <Separator />
        <CalendarColor calendar={calendar} setCalendar={setCalendar} />
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
