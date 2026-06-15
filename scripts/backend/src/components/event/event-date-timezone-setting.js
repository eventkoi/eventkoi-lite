import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { __ } from "@wordpress/i18n";

export function EventDateTimezoneSetting({ event, setEvent, className }) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-sm border p-4", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="font-semibold">
            {__("Display timezone in event page", "eventkoi-lite")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {__("Your current timezone is", "eventkoi-lite")}{" "}
            <a
              href={eventkoi_params.general_options_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-normal"
            >
              {event?.timezone}
            </a>
            .
          </p>
        </div>
        <Switch
          id="timezone_display"
          checked={event?.timezone_display}
          onCheckedChange={(bool) =>
            setEvent((prevState) => ({
              ...prevState,
              timezone_display: bool,
            }))
          }
        />
      </div>
    </div>
  );
}
