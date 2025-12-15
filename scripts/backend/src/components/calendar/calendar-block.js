import { __ } from "@wordpress/i18n";
import { Label } from "@/components/ui/label";

import { Panel } from "@/components/panel";

export function CalendarBlock({ calendar, setCalendar }) {
  return (
    <Panel className="p-0">
      <Label>{__("Block", "eventkoi-lite")}</Label>
      <div className="relative max-w-[422px] space-y-4">
        <div className="text-base text-muted-foreground">
          {__("1. In the block editor, add", "eventkoi-lite")}{" "}
          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] text-sm font-mono font-semibold">
            /EK Calendar
          </code>{" "}
          {__("block.", "eventkoi-lite")}
        </div>
        <div className="text-base text-muted-foreground">
          {__(
            "2. In the right hand side Settings panel, select the relevant calendar from the dropdown menu.",
            "eventkoi-lite",
          )}
        </div>
      </div>
    </Panel>
  );
}
