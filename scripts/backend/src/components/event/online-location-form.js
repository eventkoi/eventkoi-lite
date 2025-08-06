import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnlineLocationForm({ location, onChange }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Location Name */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`name-${location.id}`}>Location name (optional)</Label>
        <Input
          id={`name-${location.id}`}
          value={location.name}
          placeholder="e.g., Zoom, Google Meet, or Webinar Host"
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <p className="text-muted-foreground text-sm">
          Give your location a name to help attendees identify it more easily.
        </p>
      </div>

      {/* Event URL + Link Text in 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`link_text-${location.id}`}>Event link text</Label>
          <Input
            id={`link_text-${location.id}`}
            value={location.link_text}
            placeholder="e.g., Join on Zoom"
            onChange={(e) => onChange({ link_text: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`virtual_url-${location.id}`}>Event URL</Label>
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
