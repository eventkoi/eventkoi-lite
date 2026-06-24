import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { __ } from "@wordpress/i18n";

export function ViewToggle({ calendarApi, view, setView }) {
  const activeView = view || "dayGridMonth";

  return (
    <ToggleGroup
      type="single"
      className="bg-muted text-foreground gap-2 border border-solid border-border p-[4px] h-10 box-border rounded shadow-none"
      value={activeView}
      onValueChange={(val) => {
        if (!val) return;
        if (val === "list") {
          setView("list");
          return;
        }
        calendarApi?.changeView(val);
        setView(val);
      }}
    >
      <ToggleGroupItem
        value="dayGridMonth"
        aria-label={__("Month view", "eventkoi-lite")}
        className="border-none transition-none cursor-pointer shadow-none h-full rounded-sm text-foreground hover:text-foreground data-[state=on]:bg-white data-[state=on]:font-semibold"
      >
        {__("Month", "eventkoi-lite")}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="timeGridWeek"
        aria-label={__("Week view", "eventkoi-lite")}
        className="border-none transition-none cursor-pointer shadow-none h-full rounded-sm text-foreground hover:text-foreground data-[state=on]:bg-white data-[state=on]:font-semibold"
      >
        {__("Week", "eventkoi-lite")}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="list"
        role="radio"
        aria-checked={activeView === "list"}
        aria-label={__("List view", "eventkoi-lite")}
        className="border-none transition-none cursor-pointer shadow-none h-full rounded-sm text-foreground hover:text-foreground data-[state=on]:bg-white data-[state=on]:font-semibold"
      >
        {__("List", "eventkoi-lite")}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
