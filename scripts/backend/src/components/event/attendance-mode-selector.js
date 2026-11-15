import { Heading } from "@/components/heading";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { __ } from "@wordpress/i18n";

export function AttendanceModeSelector({ event, setEvent }) {
  const ticketsEnabled = !!window?.eventkoi_params?.tickets_feature_enabled;
  // "Price from" is retired: hidden unless a site opts back in via the
  // eventkoi_enable_price_from filter (e.g. the EventKoi Price From add-on).
  const priceFromEnabled = !!window?.eventkoi_params?.price_from_enabled;
  const attendanceModeRaw = event?.attendance_mode || "none";
  const attendanceMode =
    !ticketsEnabled && attendanceModeRaw === "tickets"
      ? "none"
      : attendanceModeRaw;

  const handleModeChange = (mode) => {
    setEvent((prev) => ({
      ...prev,
      attendance_mode: mode,
    }));
  };

  return (
    <div className="grid gap-2">
      <Heading level={3}>{__("Attendance", "eventkoi-lite")}</Heading>
      <div className="grid gap-4">
        <p className="text-sm text-muted-foreground">
          {__("Choose how visitors can register for this event.", "eventkoi-lite")}
        </p>

        <RadioGroup
          value={attendanceMode}
          onValueChange={handleModeChange}
          className="grid gap-4"
        >
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="none" id="none" className="mt-1" />
            <Label htmlFor="none" className="cursor-pointer flex-1">
              <div className="font-medium">{__("None", "eventkoi-lite")}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {__("No registration required for this event.", "eventkoi-lite")}
              </div>
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <RadioGroupItem value="rsvp" id="rsvp" className="mt-1" />
            <Label htmlFor="rsvp" className="cursor-pointer flex-1">
              <div className="font-medium">{__("RSVP (Free)", "eventkoi-lite")}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {__(
                  "Allow visitors to RSVP to this event for free.",
                  "eventkoi-lite",
                )}
              </div>
            </Label>
          </div>

          {ticketsEnabled && (
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="tickets" id="tickets" className="mt-1" />
              <Label htmlFor="tickets" className="cursor-pointer flex-1">
                <div className="flex items-center gap-2 font-medium">
                  {__("Tickets (Paid)", "eventkoi-lite")}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {__(
                    "Sell tickets for this event.",
                    "eventkoi-lite",
                  )}
                </div>
              </Label>
            </div>
          )}

          {/* Price from is retired: shown only when re-enabled via the
              eventkoi_enable_price_from filter, or when the event already uses
              it (so existing setups stay editable). Back end is untouched. */}
          {(priceFromEnabled || attendanceMode === "price_from") && (
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="price_from" id="price_from" className="mt-1" />
              <Label htmlFor="price_from" className="cursor-pointer flex-1">
                <div className="font-medium">{__("Price from", "eventkoi-lite")}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {__(
                    "Show a starting price and link visitors to an external ticketing site.",
                    "eventkoi-lite",
                  )}
                </div>
              </Label>
            </div>
          )}
        </RadioGroup>
      </div>
    </div>
  );
}
