"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { __ } from "@wordpress/i18n";

export function StandardTypeSelector({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="font-medium text-sm">{__("Event Type:", "eventkoi-lite")}</Label>
      <RadioGroup
        value={value || "selected"}
        onValueChange={onChange}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="continuous" id="continuous" />
          <Label
            htmlFor="continuous"
            className="text-sm font-medium cursor-pointer"
          >
            {__("Consecutive Days", "eventkoi-lite")}
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <RadioGroupItem value="selected" id="selected" />
          <Label
            htmlFor="selected"
            className="text-sm font-medium cursor-pointer"
          >
            {__("Selected Days", "eventkoi-lite")}{" "}
            <span className="font-normal">
              {__("(non-consecutive or varied times)", "eventkoi-lite")}
            </span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
