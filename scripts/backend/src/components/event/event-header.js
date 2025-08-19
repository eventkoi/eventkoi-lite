import { EventNavBack } from "@/components/event/event-nav-back";
import { EventNavBar } from "@/components/event/event-nav-bar";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

import { useEventEditContext } from "@/hooks/EventEditContext";

export function EventHeader() {
  const { event, setEvent } = useEventEditContext();

  return (
    <header
      className={cn(
        "flex items-center text-sm h-20 sticky top-[0px] z-[100000] bg-white md:bg-muted shadow-sm border-b gap-2 md:gap-6 px-4 md:px-8"
      )}
    >
      <Logo />
      <EventNavBack />
      <div className="flex w-full justify-end">
        <EventNavBar />
      </div>
    </header>
  );
}
