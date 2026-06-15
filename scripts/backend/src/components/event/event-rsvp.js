import { __ } from "@wordpress/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TimeInput } from "@/components/time-input";
import { FloatingDatePicker } from "@/components/ui/FloatingDatePicker";
import { ensureUtcZ, getDateInTimezone } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { isValid } from "date-fns";
import { DateTime } from "luxon";
import { MoveRight } from "lucide-react";
import { useMemo } from "react";

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

function RsvpWindowPicker({ event, setEvent }) {
  const wpTz = useMemo(
    () =>
      event?.timezone || window.eventkoi_params?.timezone_string || "UTC",
    [event?.timezone]
  );

  const startDateRaw = event?.rsvp_sale_start
    ? getDateInTimezone(ensureUtcZ(event.rsvp_sale_start), wpTz)
    : null;
  const endDateRaw = event?.rsvp_sale_end
    ? getDateInTimezone(ensureUtcZ(event.rsvp_sale_end), wpTz)
    : null;
  const startDate =
    startDateRaw && isValid(startDateRaw) ? startDateRaw : null;
  const endDate = endDateRaw && isValid(endDateRaw) ? endDateRaw : null;

  const setField = (key, value) =>
    setEvent((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="grid gap-4">
      <div>
        <Label className="font-semibold">
          {__("RSVP availability", "eventkoi-lite")}
        </Label>
        <p className="text-sm text-muted-foreground">
          {__(
            "Optional. Leave blank to allow RSVPs anytime while the event is open.",
            "eventkoi"
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2 min-h-[18px]">
            <Label>{__("RSVP opens", "eventkoi-lite")}</Label>
            {startDate ? (
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={() => setField("rsvp_sale_start", null)}
              >
                {__("Clear", "eventkoi-lite")}
              </button>
            ) : (
              <span className="text-xs opacity-0">{"Clear"}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FloatingDatePicker
              value={startDate || undefined}
              wpTz={wpTz}
              onChange={(pickedDate) => {
                if (!pickedDate) return;
                const t = startDate
                  ? { h: startDate.getHours(), m: startDate.getMinutes() }
                  : { h: 9, m: 0 };
                const next = pickedDate.set({
                  hour: t.h,
                  minute: t.m,
                  second: 0,
                  millisecond: 0,
                });
                setField(
                  "rsvp_sale_start",
                  next.toUTC().toISO({ suppressMilliseconds: true })
                );
              }}
            />
            <TimeInput
              date={startDate || undefined}
              wpTz={wpTz}
              setDate={(utcDate) => {
                if (!utcDate || !startDate) return;
                const parsedUtc = DateTime.fromJSDate(utcDate, {
                  zone: "utc",
                }).setZone(wpTz);
                const dtWall = DateTime.fromJSDate(startDate, {
                  zone: wpTz,
                }).set({
                  hour: parsedUtc.hour,
                  minute: parsedUtc.minute,
                  second: 0,
                  millisecond: 0,
                });
                setField(
                  "rsvp_sale_start",
                  dtWall.toUTC().toISO({ suppressMilliseconds: true })
                );
              }}
              disabled={!startDate}
            />
          </div>
        </div>

        <MoveRight
          className="w-6 h-6 text-muted-foreground mt-[34px]"
          strokeWidth={1.5}
        />

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2 min-h-[18px]">
            <Label>{__("RSVP closes", "eventkoi-lite")}</Label>
            {endDate ? (
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={() => setField("rsvp_sale_end", null)}
              >
                {__("Clear", "eventkoi-lite")}
              </button>
            ) : (
              <span className="text-xs opacity-0">{"Clear"}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FloatingDatePicker
              value={endDate || undefined}
              wpTz={wpTz}
              onChange={(pickedDate) => {
                if (!pickedDate) return;
                const t = endDate
                  ? { h: endDate.getHours(), m: endDate.getMinutes() }
                  : { h: 17, m: 0 };
                const next = pickedDate.set({
                  hour: t.h,
                  minute: t.m,
                  second: 0,
                  millisecond: 0,
                });
                setField(
                  "rsvp_sale_end",
                  next.toUTC().toISO({ suppressMilliseconds: true })
                );
              }}
            />
            <TimeInput
              date={endDate || undefined}
              wpTz={wpTz}
              setDate={(utcDate) => {
                if (!utcDate || !endDate) return;
                const parsedUtc = DateTime.fromJSDate(utcDate, {
                  zone: "utc",
                }).setZone(wpTz);
                const dtWall = DateTime.fromJSDate(endDate, {
                  zone: wpTz,
                }).set({
                  hour: parsedUtc.hour,
                  minute: parsedUtc.minute,
                  second: 0,
                  millisecond: 0,
                });
                setField(
                  "rsvp_sale_end",
                  dtWall.toUTC().toISO({ suppressMilliseconds: true })
                );
              }}
              disabled={!endDate}
            />
          </div>
        </div>
      </div>

      {startDate && endDate && endDate < startDate ? (
        <p className="text-sm font-medium text-destructive">
          {__(
            "RSVP closing date cannot be before the opening date.",
            "eventkoi"
          )}
        </p>
      ) : null}
    </div>
  );
}

export function EventRsvpSettings({ event, setEvent, className }) {
  const showCount =
    typeof event?.rsvp_show_count === "boolean" ? event.rsvp_show_count : true;
  const showRemaining =
    typeof event?.rsvp_show_remaining === "boolean"
      ? event.rsvp_show_remaining
      : true;
  const allowGuests = !!event?.rsvp_allow_guests;
  const allowEdit =
    typeof event?.rsvp_allow_edit === "boolean" ? event.rsvp_allow_edit : true;
  const autoAccount = !!event?.rsvp_auto_account;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-6">
        <RsvpWindowPicker event={event} setEvent={setEvent} />

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
                "eventkoi"
              )}
            </p>
          </div>

          <SettingToggle
            id="rsvp_show_count"
            label={__("Show RSVP count", "eventkoi-lite")}
            description={__(
              "Display how many people are going on the event page.",
              "eventkoi-lite"
            )}
            checked={showCount}
            onCheckedChange={(value) =>
              setEvent((prev) => ({
                ...prev,
                rsvp_show_count: value,
              }))
            }
          />

          <SettingToggle
            id="rsvp_show_remaining"
            label={__("Show remaining spots", "eventkoi-lite")}
            description={__(
              "Display remaining capacity on the event page.",
              "eventkoi"
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
              "eventkoi"
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
              "eventkoi"
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
              "eventkoi"
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
