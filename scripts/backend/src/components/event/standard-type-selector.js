"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function StandardTypeSelector({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="font-medium text-sm">Event Type:</Label>
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
            Continuous{" "}
            <span className="font-normal">(spans consecutive days)</span>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <RadioGroupItem value="selected" id="selected" />
          <Label
            htmlFor="selected"
            className="text-sm font-medium cursor-pointer"
          >
            Selected Days{" "}
            <span className="font-normal">
              (non-consecutive or varied times)
            </span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
