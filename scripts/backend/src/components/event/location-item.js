import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { OnlineLocationForm } from "./online-location-form";
import { PhysicalLocationForm } from "./physical-location-form";

export function LocationItem({
  location,
  expandedLocationId,
  setExpandedLocationId,
  onChange,
  onDelete,
  settings,
}) {
  const isExpanded = expandedLocationId === location.id;

  const toggleExpand = (e) => {
    e.stopPropagation();
    if (isExpanded) {
      setExpandedLocationId(null);
    } else {
      setExpandedLocationId(location.id);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <Card className="border rounded-lg shadow-sm overflow-hidden">
      <div
        className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-muted/30 transition"
        onClick={toggleExpand}
      >
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-medium">
            {location.name ||
              (location.type === "physical"
                ? "Physical location"
                : "Online location")}
          </CardTitle>
          <div className="text-sm text-muted-foreground truncate max-w-[280px]">
            {location.type === "physical"
              ? location.address1 || "No address yet"
              : location.virtual_url || "No URL yet"}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={toggleExpand}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <CardContent className="p-4">
          {location.type === "physical" ? (
            <PhysicalLocationForm
              location={location}
              onChange={onChange}
              settings={settings}
            />
          ) : (
            <OnlineLocationForm location={location} onChange={onChange} />
          )}
        </CardContent>
      )}
    </Card>
  );
}
