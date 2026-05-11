import { __ } from "@wordpress/i18n";
import { ColorPalette } from "@wordpress/components";

import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Panel } from "@/components/panel";

const themeColors = Array.isArray(eventkoi_params?.theme_colors)
  ? eventkoi_params.theme_colors
  : [];

const TRANSPARENT = "transparent";

export function CalendarColor({ calendar, setCalendar }) {
  const stored = calendar?.color || "";
  const isTransparent = stored === TRANSPARENT;
  const value = isTransparent ? "" : stored;
  const swatchStyle =
    !isTransparent && value
      ? { backgroundColor: value }
      : {
          backgroundImage:
            "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
          backgroundSize: "8px 8px",
          backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
        };
  const label =
    isTransparent || !value ? __("Transparent", "eventkoi-lite") : value;

  return (
    <Panel className="p-0">
      <Label htmlFor="color">{__("Color", "eventkoi-lite")}</Label>
      <Popover>
        <PopoverTrigger className="flex gap-4 items-center h-10 w-[180px] rounded-md border border-input bg-background shadow-none px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <div
            style={swatchStyle}
            className="flex rounded-full w-5 h-5 border border-input shrink-0"
          />
          <span className="truncate">{label}</span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[260px] z-[900] p-3">
          <ColorPalette
            value={value}
            colors={themeColors}
            onChange={(nextColor) => {
              setCalendar((prevState) => ({
                ...prevState,
                color: nextColor || TRANSPARENT,
              }));
            }}
            enableAlpha
            clearable
          />
        </PopoverContent>
      </Popover>
      <div className="text-muted-foreground">
        {__("Used for accent colors in your calendar.", "eventkoi-lite")}
      </div>
    </Panel>
  );
}
