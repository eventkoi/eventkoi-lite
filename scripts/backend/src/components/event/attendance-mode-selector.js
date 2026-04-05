import { Heading } from "@/components/heading";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { __ } from "@wordpress/i18n";

export function AttendanceModeSelector({ event, setEvent }) {
  const ticketsEnabled = !!window?.eventkoi_params?.tickets_feature_enabled;
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
      <Heading level={3}>{__("Attendance", "eventkoi")}</Heading>
      <div className="grid gap-4">
        <p className="text-sm text-muted-foreground">
          {__("Choose how visitors can register for this event.", "eventkoi")}
        </p>

        <RadioGroup
          value={attendanceMode}
          onValueChange={handleModeChange}
          className="grid gap-4"
        >
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="none" id="none" className="mt-1" />
            <Label htmlFor="none" className="cursor-pointer flex-1">
              <div className="font-medium">{__("None", "eventkoi")}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {__("No registration required for this event.", "eventkoi")}
              </div>
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <RadioGroupItem value="rsvp" id="rsvp" className="mt-1" />
            <Label htmlFor="rsvp" className="cursor-pointer flex-1">
              <div className="font-medium">{__("RSVP (Free)", "eventkoi")}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {__(
                  "Allow visitors to RSVP to this event for free.",
                  "eventkoi",
                )}
              </div>
            </Label>
          </div>

          {ticketsEnabled && (
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="tickets" id="tickets" className="mt-1" />
              <Label htmlFor="tickets" className="cursor-pointer flex-1">
                <div className="font-medium">
                  {__("Tickets (Paid)", "eventkoi")}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {__(
                    "Sell tickets for this event.",
                    "eventkoi",
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
