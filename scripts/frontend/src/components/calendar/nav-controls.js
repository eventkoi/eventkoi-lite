import { Button } from "@/components/ui/button";
import { __ } from "@wordpress/i18n";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function NavControls({ calendarApi, currentDate, setCurrentDate }) {
  const move = (direction) => {
    // List view has no FullCalendar instance, so step the month ourselves.
    // Bailing out here is what made these buttons look broken in the list.
    if (!calendarApi) {
      const base = currentDate instanceof Date ? currentDate : new Date();
      const next = new Date(base.getTime());
      next.setDate(1);
      next.setMonth(next.getMonth() + (direction === "prev" ? -1 : 1));
      setCurrentDate?.(next);
      return;
    }
    if (direction === "prev") {
      calendarApi.prev();
    } else {
      calendarApi.next();
    }

    setCurrentDate?.(calendarApi.getDate());
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="text-[1px] box-border p-0 w-10 h-10 border-solid shadow-none cursor-pointer rounded"
        onClick={() => move("prev")}
        aria-label={__("Go to previous period", "eventkoi-lite")}
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="text-[1px] box-border p-0 w-10 h-10 border-solid shadow-none cursor-pointer rounded"
        onClick={() => move("next")}
        aria-label={__("Go to next period", "eventkoi-lite")}
      >
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
