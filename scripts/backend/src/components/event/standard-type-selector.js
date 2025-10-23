"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export function StandardTypeSelector({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Select date/time fields" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="continuous">Single date range</SelectItem>
          <SelectItem value="selected">Multiple times and dates</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
