import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function NavControls({ calendarApi, currentDate, setCurrentDate }) {
  const move = (direction) => {
    if (!calendarApi) {
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
        aria-label="Go to previous period"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="text-[1px] box-border p-0 w-10 h-10 border-solid shadow-none cursor-pointer rounded"
        onClick={() => move("next")}
        aria-label="Go to next period"
      >
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
