import { Button } from "@/components/ui/button";
import { __ } from "@wordpress/i18n";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DateTime } from "luxon";

// The calendar renders in a display timezone: the site's by default, the
// visitor's when auto-detect or the timezone picker says so. Date maths for
// the toolbar has to follow the same zone or months drift at the edges.
const resolveDisplayZone = (tz) =>
  tz === "local"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    : tz || window.eventkoi_params?.timezone || "UTC";

export function NavControls({ calendarApi, currentDate, setCurrentDate, timezone }) {
  const move = (direction) => {
    // List view has no FullCalendar instance, so step the month ourselves.
    // Bailing out here is what made these buttons look broken in the list.
    if (!calendarApi) {
      // Month math runs in the display timezone, matching how the label
      // formats this date; date-only strings are parsed in that zone as well.
      // Mixing zones cancelled a click out for visitors west of the site.
      const zone = resolveDisplayZone(timezone);
      let base;
      if (currentDate instanceof Date) {
        base = DateTime.fromJSDate(currentDate);
      } else {
        base = DateTime.fromISO(String(currentDate ?? ""), { zone });
        if (!base.isValid) base = DateTime.now();
      }
      const next = base
        .setZone(zone)
        .startOf("month")
        .plus({ months: direction === "prev" ? -1 : 1 })
        .toJSDate();
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
    <div className="flex items-center gap-2 shrink-0">
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
