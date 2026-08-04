import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { __ } from "@wordpress/i18n";
import { useState } from "react";

const SITE_TIMEZONE = "__site__";

function getTimezoneOptions() {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [];
  }
}

export function EventDateTimezoneSetting({ event, setEvent, className }) {
  // Empty override means the event follows the site timezone.
  const override = event?.event_timezone || "";
  const siteTimezone =
    window.eventkoi_params?.timezone_string ||
    window.eventkoi_params?.timezone ||
    event?.timezone ||
    "UTC";
  const [picking, setPicking] = useState(false);
  const timezones = getTimezoneOptions();

  const setOverride = (value) => {
    setEvent((prevState) => ({
      ...prevState,
      event_timezone: value === SITE_TIMEZONE ? "" : value,
      timezone: value === SITE_TIMEZONE ? siteTimezone : value,
    }));
    setPicking(false);
  };

  return (
    <div className={cn("flex flex-col gap-4 rounded-sm border p-4", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="font-semibold">
            {__("Display timezone in event page", "eventkoi-lite")}
          </Label>
          {override ? (
            <p className="text-sm text-muted-foreground">
              {__("Your timezone for this event is", "eventkoi-lite")}{" "}
              <button
                type="button"
                className="underline font-normal cursor-pointer bg-transparent border-0 p-0 text-inherit"
                onClick={() => setPicking(true)}
              >
                {override}
              </button>
              . {__("Your site timezone is", "eventkoi-lite")}{" "}
              <a
                href={eventkoi_params.general_options_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-normal"
              >
                {siteTimezone}
              </a>
              .
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {__("Your current timezone is", "eventkoi-lite")}{" "}
              <a
                href={eventkoi_params.general_options_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-normal"
              >
                {siteTimezone}
              </a>
              .{" "}
              {timezones.length > 0 && (
                <button
                  type="button"
                  className="underline font-normal cursor-pointer bg-transparent border-0 p-0 text-inherit"
                  onClick={() => setPicking(true)}
                >
                  {__("Change timezone for this event only.", "eventkoi-lite")}
                </button>
              )}
            </p>
          )}
          {picking && (
            <div className="pt-1 max-w-[320px]">
              <Select
                value={override || SITE_TIMEZONE}
                onValueChange={setOverride}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={__("Select a timezone", "eventkoi-lite")}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={SITE_TIMEZONE}>
                    {__("Use site timezone", "eventkoi-lite")}
                  </SelectItem>
                  {timezones.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
