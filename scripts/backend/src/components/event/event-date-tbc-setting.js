import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function EventDateTBCSetting({ event, setEvent, className }) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-sm border p-4", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="font-semibold">Date and time not confirmed</Label>
          <p className="text-sm text-muted-foreground">
            Remove date and time. Show “to be confirmed” notification instead.
          </p>
        </div>
        <Switch
          id="tbc"
          checked={event?.tbc}
          onCheckedChange={(bool) =>
            setEvent((prevState) => ({
              ...prevState,
              tbc: bool,
            }))
          }
        />
      </div>

      {/* Only show when TBC is ON */}
      {event?.tbc && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="tbc_note">Notification</Label>
          <Input
            type="text"
            id="tbc_note"
            value={event?.tbc_note}
            placeholder="Date and time to be confirmed"
            className="max-w-[422px]"
            onChange={(e) =>
              setEvent((prevState) => ({
                ...prevState,
                tbc_note: e.target.value,
              }))
            }
          />
        </div>
      )}
    </div>
  );
}
