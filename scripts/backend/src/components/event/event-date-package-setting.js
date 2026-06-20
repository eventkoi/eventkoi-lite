import { __ } from "@wordpress/i18n";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function EventDatePackageSetting({ event, setEvent, className }) {
  const isSelected = event?.standard_type === "selected";
  const dayCount = Array.isArray(event?.event_days) ? event.event_days.length : 0;

  // Only meaningful for a multi-day selected-dates event.
  if (!isSelected || dayCount <= 1) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-4 rounded-sm border p-4", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="font-semibold">
            {__("Register once for all dates", "eventkoi-lite")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {__(
              "For a course or multi-day event where people attend every date. They sign up one time and can’t book just a single day.",
              "eventkoi-lite",
            )}
          </p>
        </div>
        <Switch
          id="event_single_package"
          checked={!!event?.event_single_package}
          onCheckedChange={(bool) =>
            setEvent((prevState) => ({
              ...prevState,
              event_single_package: bool,
            }))
          }
        />
      </div>
    </div>
  );
}
