import { __ } from "@wordpress/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function SettingToggle({ id, label, description, checked, onCheckedChange }) {
  return (
    <div className="flex items-start gap-4">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-[1px]"
      />
      <div className="space-y-1">
        <Label className="font-semibold" htmlFor={id}>
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function EventRsvpSettings({ event, setEvent, className }) {
  const rsvpEnabled = !!event?.rsvp_enabled;
  const showRemaining =
    typeof event?.rsvp_show_remaining === "boolean"
      ? event.rsvp_show_remaining
      : true;
  const allowGuests = !!event?.rsvp_allow_guests;
  const allowEdit = !!event?.rsvp_allow_edit;
  const autoAccount = !!event?.rsvp_auto_account;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <SettingToggle
        id="rsvp_enabled"
        label={__("RSVP", "eventkoi-lite")}
        description={__("Allow visitors to RSVP to this event.", "eventkoi-lite")}
        checked={rsvpEnabled}
        onCheckedChange={(value) =>
          setEvent((prev) => ({
            ...prev,
            rsvp_enabled: value,
          }))
        }
      />

      <div
        className={cn(
          "flex flex-col gap-6",
          !rsvpEnabled && "opacity-70 pointer-events-none"
        )}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="rsvp_capacity">{__("Capacity", "eventkoi-lite")}</Label>
          <Input
            id="rsvp_capacity"
              type="number"
              min={0}
              className="max-w-[200px]"
              placeholder={__("Unlimited", "eventkoi-lite")}
              value={event?.rsvp_capacity ? event.rsvp_capacity : ""}
              onChange={(e) =>
                setEvent((prev) => ({
                  ...prev,
                  rsvp_capacity:
                    e.target.value === ""
                      ? ""
                      : parseInt(e.target.value, 10),
                }))
              }
            />
            <p className="text-sm text-muted-foreground">
              {__(
                "Leave empty for unlimited RSVPs.",
                "eventkoi-lite"
              )}
            </p>
          </div>

          <SettingToggle
            id="rsvp_show_remaining"
            label={__("Show remaining spots", "eventkoi-lite")}
            description={__(
              "Display remaining capacity on the event page.",
              "eventkoi-lite"
            )}
            checked={showRemaining}
            onCheckedChange={(value) =>
              setEvent((prev) => ({
                ...prev,
                rsvp_show_remaining: value,
              }))
            }
          />

          <SettingToggle
            id="rsvp_allow_guests"
            label={__("Allow guests", "eventkoi-lite")}
            description={__(
              "Let attendees RSVP for additional guests.",
              "eventkoi-lite"
            )}
            checked={allowGuests}
            onCheckedChange={(value) =>
              setEvent((prev) => ({
                ...prev,
                rsvp_allow_guests: value,
                rsvp_max_guests:
                  value && (!prev.rsvp_max_guests || prev.rsvp_max_guests < 1)
                    ? 1
                    : value
                    ? prev.rsvp_max_guests
                    : 0,
              }))
            }
          />

          {allowGuests && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="rsvp_max_guests">
                {__("Max guests per RSVP", "eventkoi-lite")}
              </Label>
              <Input
                id="rsvp_max_guests"
                type="number"
                min={1}
                className="max-w-[200px]"
                value={event?.rsvp_max_guests ?? 1}
                onChange={(e) =>
                  setEvent((prev) => ({
                    ...prev,
                    rsvp_max_guests:
                      e.target.value === ""
                        ? ""
                        : parseInt(e.target.value, 10),
                  }))
                }
              />
            </div>
          )}

          <SettingToggle
            id="rsvp_allow_edit"
            label={__("Allow RSVP edits", "eventkoi-lite")}
            description={__(
              "Let attendees update their RSVP from the event page.",
              "eventkoi-lite"
            )}
            checked={allowEdit}
            onCheckedChange={(value) =>
              setEvent((prev) => ({
                ...prev,
                rsvp_allow_edit: value,
              }))
            }
          />

          <SettingToggle
            id="rsvp_auto_account"
            label={__("Auto-create attendee account", "eventkoi-lite")}
            description={__(
              "Create a WordPress user when someone RSVPs as going.",
              "eventkoi-lite"
            )}
            checked={autoAccount}
            onCheckedChange={(value) =>
              setEvent((prev) => ({
                ...prev,
                rsvp_auto_account: value,
              }))
            }
          />
      </div>
    </div>
  );
}
