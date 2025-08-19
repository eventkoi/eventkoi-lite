import { cn } from "@/lib/utils";

import { CalendarNavBack } from "@/components/calendar/calendar-nav-back";
import { CalendarNavBar } from "@/components/calendar/calendar-nav-bar";
import { Logo } from "@/components/logo";

export function CalendarHeader({ loading, setLoading, calendar, setCalendar }) {
  return (
    <header
      className={cn(
        "flex text-sm h-12 items-center border-b gap-2 md:gap-6 px-4 md:px-8",
        "sticky top-[0px] z-[100000] bg-white md:bg-muted h-20 shadow-sm border-b"
      )}
    >
      <Logo />
      <CalendarNavBack calendar={calendar} setCalendar={setCalendar} />
      <div className="flex w-full justify-end">
        <CalendarNavBar
          loading={loading}
          setLoading={setLoading}
          calendar={calendar}
          setCalendar={setCalendar}
        />
      </div>
    </header>
  );
}
