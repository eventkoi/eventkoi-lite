import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { __ } from "@wordpress/i18n";
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
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-muted/30 transition"
        onClick={toggleExpand}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(e); } }}
      >
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-medium">
            {location.name ||
              (location.type === "physical"
                ? __("Physical location", "eventkoi-lite")
                : __("Online location", "eventkoi-lite"))}
          </CardTitle>
          <div className="text-sm text-muted-foreground truncate max-w-[280px]">
            {location.type === "physical"
              ? location.address1 || __("No address yet", "eventkoi-lite")
              : location.virtual_url || __("No URL yet", "eventkoi-lite")}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={toggleExpand}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? __("Collapse location", "eventkoi-lite") : __("Expand location", "eventkoi-lite")}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            aria-label={__("Delete location", "eventkoi-lite")}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
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
