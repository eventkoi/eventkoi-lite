import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { __ } from "@wordpress/i18n";

export function TodayButton({ calendarApi, setCurrentDate, isTodayInRange }) {
  const handleToday = () => {
    // No FullCalendar in list view: move the shared current date instead so
    // the list can scope itself to the current month.
    if (!calendarApi) {
      setCurrentDate?.(new Date());
      return;
    }
    calendarApi.today();
    setCurrentDate(calendarApi.getDate());
  };

  return (
    <Button
      variant="outline"
      className={cn(
        "border-solid box-border font-normal shadow-none cursor-pointer shrink-0",
        "rounded disabled:opacity-100 disabled:bg-background disabled:text-muted-foreground/50 text-foreground"
      )}
      disabled={isTodayInRange}
      onClick={handleToday}
      aria-label={__("Jump to today", "eventkoi-lite")}
      aria-pressed={isTodayInRange}
      title={__("Jump to today", "eventkoi-lite")}
    >
      {__("Today", "eventkoi-lite")}
    </Button>
  );
}
