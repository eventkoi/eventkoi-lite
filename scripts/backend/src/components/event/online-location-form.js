import { __ } from "@wordpress/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnlineLocationForm({ location, onChange }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Location Name */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`name-${location.id}`}>{__("Location name (optional)", "eventkoi-lite")}</Label>
        <Input
          id={`name-${location.id}`}
          value={location.name}
          placeholder={__("e.g., Zoom, Google Meet, or Webinar Host", "eventkoi-lite")}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <p className="text-muted-foreground text-sm">
          {__("Give your location a name to help attendees identify it more easily.", "eventkoi-lite")}
        </p>
      </div>

      {/* Event URL + Link Text in 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`link_text-${location.id}`}>{__("Event link text", "eventkoi-lite")}</Label>
          <Input
            id={`link_text-${location.id}`}
            value={location.link_text}
            placeholder={__("e.g., Join on Zoom", "eventkoi-lite")}
            onChange={(e) => onChange({ link_text: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`virtual_url-${location.id}`}>{__("Event URL", "eventkoi-lite")}</Label>
          <Input
            id={`virtual_url-${location.id}`}
            type="url"
            placeholder="https://"
            value={location.virtual_url}
            onChange={(e) => onChange({ virtual_url: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
