import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Panel } from "@/components/panel";
import { __ } from "@wordpress/i18n";

export function EventTemplate({ event, setEvent }) {
  return (
    <Panel>
      <Label htmlFor="template">
        {__("Select event template", "eventkoi-lite")}
      </Label>
      <Select
        value={event?.template}
        onValueChange={(value) => {
          setEvent((prevState) => ({
            ...prevState,
            template: value,
          }));
        }}
      >
        <SelectTrigger id="template" className="w-[250px]">
          <SelectValue placeholder={__("Select a template", "eventkoi-lite")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">
            {__("Default template", "eventkoi-lite")}
          </SelectItem>
        </SelectContent>
      </Select>
    </Panel>
  );
}
