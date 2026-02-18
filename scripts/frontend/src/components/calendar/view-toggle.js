/**
 * View Toggle (i18n-ready)
 *
 * @package EventKoi
 */

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { __ } from "@wordpress/i18n";

export function ViewToggle({ calendarApi, view, setView }) {
  return (
    <ToggleGroup
      type="single"
      className="bg-muted text-foreground gap-2 border border-solid border-border p-[4px] h-10 box-border rounded shadow-none"
      value={view}
      onValueChange={(val) => {
        if (!val) return;
        calendarApi?.changeView(val);
        setView(val);
      }}
      aria-label={__("Calendar view mode", "eventkoi")}
      role="radiogroup"
    >
      <ToggleGroupItem
        value="dayGridMonth"
        role="radio"
        aria-checked={view === "dayGridMonth"}
        aria-label={__("Month view", "eventkoi")}
        className="border-none transition-none cursor-pointer shadow-none h-full rounded-sm text-foreground hover:text-foreground data-[state=on]:bg-white data-[state=on]:font-semibold"
      >
        {__("Month", "eventkoi")}
      </ToggleGroupItem>

      <ToggleGroupItem
        value="timeGridWeek"
        role="radio"
        aria-checked={view === "timeGridWeek"}
        aria-label={__("Week view", "eventkoi")}
        className="border-none transition-none cursor-pointer shadow-none h-full rounded-sm text-foreground hover:text-foreground data-[state=on]:bg-white data-[state=on]:font-semibold"
      >
        {__("Week", "eventkoi")}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
