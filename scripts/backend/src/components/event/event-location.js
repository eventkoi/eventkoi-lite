import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { Plus } from "lucide-react";
import { useState } from "react";
import { LocationItem } from "./location-item";

export function EventLocation({ isInstance = false, value, onChange }) {
  const context = useEventEditContext();
  const contextEvent = context.event;
  const contextSetEvent = context.setEvent;
  const settings = context.settings;

  const event = isInstance ? value : contextEvent;
  const setEvent = isInstance
    ? (updater) => {
        const updated =
          typeof updater === "function" ? updater(event) : updater;
        onChange(updated);
      }
    : contextSetEvent;

  const [newLocationType, setNewLocationType] = useState("physical");
  const [expandedLocationId, setExpandedLocationId] = useState(null);

  const addLocation = () => {
    const newLocation = {
      id: crypto.randomUUID(),
      type: newLocationType,
      name: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      country: "",
      zip: "",
      embed_gmap: false,
      gmap_link: "",
      virtual_url: "",
      latitude: "",
      longitude: "",
    };

    setEvent((prev) => ({
      ...prev,
      locations: [...(prev.locations || []), newLocation],
    }));

    setExpandedLocationId(newLocation.id);
  };

  const removeLocation = (id) => {
    setEvent((prev) => ({
      ...prev,
      locations: (prev.locations || []).filter(
        (location) => location.id !== id
      ),
    }));

    if (expandedLocationId === id) {
      setExpandedLocationId(null);
    }
  };

  const updateLocation = (id, updatedFields) => {
    setEvent((prev) => ({
      ...prev,
      locations: (prev.locations || []).map((location) =>
        location.id === id ? { ...location, ...updatedFields } : location
      ),
    }));
  };

  return (
    <Panel className="p-0">
      <div className="flex flex-col gap-6">
        {(event.locations || []).map((location) => (
          <LocationItem
            key={location.id}
            location={location}
            expandedLocationId={expandedLocationId}
            setExpandedLocationId={setExpandedLocationId}
            onChange={(updatedFields) =>
              updateLocation(location.id, updatedFields)
            }
            onDelete={() => removeLocation(location.id)}
            settings={settings}
          />
        ))}
      </div>

      {(event.locations || []).length === 0 && (
        <p className="text-muted-foreground text-sm">No locations added yet.</p>
      )}

      <div className="flex items-center gap-2 mt-4">
        <Select value={newLocationType} onValueChange={setNewLocationType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select location type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="physical">Physical location</SelectItem>
            <SelectItem value="online">Online location</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="ghost" onClick={addLocation}>
          <Plus className="w-4 h-4 mr-2" />
          Add location
        </Button>
      </div>
    </Panel>
  );
}
