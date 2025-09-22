import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
    >
      <ToggleGroupItem
        value="dayGridMonth"
        className="border-none transition-none cursor-pointer shadow-none h-full rounded-sm text-foreground hover:text-foreground data-[state=on]:bg-white data-[state=on]:font-semibold"
      >
        Month
      </ToggleGroupItem>
      <ToggleGroupItem
        value="timeGridWeek"
        className="border-none transition-none cursor-pointer shadow-none h-full rounded-sm text-foreground hover:text-foreground data-[state=on]:bg-white data-[state=on]:font-semibold"
      >
        Week
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
