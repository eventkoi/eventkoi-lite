import { __ } from "@wordpress/i18n";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { isSinglePackageEligible } from "@/lib/package-event";

/**
 * "Sign up once for the whole event" toggle.
 *
 * Sits inside Display options on the Tickets and RSVP tabs rather than in the
 * date picker: the choice is about how people register, not about when the
 * event runs. The wording follows the tab it is shown in, so it reads as a
 * ticketing rule or an RSVP rule instead of the generic "register" that meant
 * neither. Rendered as a row so it matches the other Display options settings.
 */
export function EventDatePackageSetting({ event, setEvent, context = "tickets" }) {
  // Only meaningful for a multi-day selected-dates standard event.
  if (!isSinglePackageEligible(event)) {
    return null;
  }

  const isRsvp = context === "rsvp";

  const title = isRsvp
    ? __("RSVP once for the whole event", "eventkoi-lite")
    : __("Single ticket for the whole event", "eventkoi-lite");

  const description = isRsvp
    ? __(
        "Attendees RSVP once for the whole event, rather than responding to each day individually.",
        "eventkoi-lite",
      )
    : __(
        "Attendees purchase one ticket that covers the whole event, instead of one ticket per day.",
        "eventkoi-lite",
      );

  return (
    <div className="flex items-start gap-4 max-w-[500px]">
      <Switch
        id="event_single_package"
        checked={!!event?.event_single_package}
        className="mt-[1px]"
        onCheckedChange={(bool) =>
          setEvent((prevState) => ({
            ...prevState,
            event_single_package: bool,
          }))
        }
      />
      <div className="space-y-1">
        <Label className="font-medium" htmlFor="event_single_package">
          {title}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
