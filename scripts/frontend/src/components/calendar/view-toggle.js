/**
 * View Toggle (i18n-ready)
 *
 * @package EventKoi
 */

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { __ } from "@wordpress/i18n";

export function ViewToggle({ calendarApi, view, setView, display, setDisplay }) {
  const isList = display === "list";
  return (
    <ToggleGroup
      type="single"
      className="bg-muted text-foreground gap-2 border border-solid border-border p-[4px] h-10 box-border rounded shadow-none"
      value={isList ? "list" : view}
      onValueChange={(val) => {
        if (!val) return;

        if (val === "list") {
          setDisplay?.("list");
          return;
        }

        setDisplay?.("calendar");

        // When switching to week view, jump to today's week if today falls
        // within the currently-displayed month; otherwise FullCalendar would
        // anchor on the 1st of that month, which is rarely what the user
        // expects (Mar 29 – Apr 4 instead of "this week").
        if (val === "timeGridWeek" && calendarApi) {
          const current = calendarApi.getDate();
          const today = new Date();
          if (
            current &&
            current.getFullYear() === today.getFullYear() &&
            current.getMonth() === today.getMonth()
          ) {
            calendarApi.gotoDate(today);
          }
        }

        calendarApi?.changeView(val);
        setView(val);
      }}
      aria-label={__("Calendar view mode", "eventkoi-lite")}
      role="radiogroup"
    >
      <ToggleGroupItem
        value="dayGridMonth"
        role="radio"
        aria-checked={!isList && view === "dayGridMonth"}
        aria-label={__("Month view", "eventkoi-lite")}
        className="border-none transition-none cursor-pointer shadow-none h-full rounded-sm text-foreground hover:text-foreground data-[state=on]:bg-white data-[state=on]:font-semibold"
      >
        {__("Month", "eventkoi-lite")}
      </ToggleGroupItem>

      <ToggleGroupItem
        value="timeGridWeek"
        role="radio"
        aria-checked={!isList && view === "timeGridWeek"}
        aria-label={__("Week view", "eventkoi-lite")}
        className="border-none transition-none cursor-pointer shadow-none h-full rounded-sm text-foreground hover:text-foreground data-[state=on]:bg-white data-[state=on]:font-semibold"
      >
        {__("Week", "eventkoi-lite")}
      </ToggleGroupItem>

      <ToggleGroupItem
        value="list"
        role="radio"
        aria-checked={isList}
        aria-label={__("List view", "eventkoi-lite")}
        className="border-none transition-none cursor-pointer shadow-none h-full rounded-sm text-foreground hover:text-foreground data-[state=on]:bg-white data-[state=on]:font-semibold"
      >
        {__("List", "eventkoi-lite")}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
