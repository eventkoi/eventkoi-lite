import { useState } from "react";

import { ColorPicker } from "@wordpress/components";

import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Panel } from "@/components/panel";

const colors = {
  accent: "Accent color",
};

const values = {
  accent: eventkoi_params.default_color,
};

export function CalendarColor({ calendar, setCalendar }) {
  const [color, setColor] = useState();

  return (
    <Panel>
      <Label htmlFor="color">Color</Label>
      <Popover>
        <PopoverTrigger className="flex gap-4 items-center h-10 w-[150px] rounded-md border border-input bg-background shadow-none px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <div
            style={{ backgroundColor: calendar?.color }}
            className={`flex rounded-full w-5 h-5`}
          />
          {calendar?.color}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[250px] z-[900]">
          <ColorPicker
            color={calendar?.color}
            onChange={(value) => {
              setCalendar((prevState) => ({
                ...prevState,
                color: value,
              }));
            }}
            enableAlpha={false}
            defaultValue={eventkoi_params.default_color}
          />
        </PopoverContent>
      </Popover>
    </Panel>
  );
}
