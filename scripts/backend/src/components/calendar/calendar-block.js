import { Label } from "@/components/ui/label";

import { Panel } from "@/components/panel";

export function CalendarBlock({ calendar, setCalendar }) {
  return (
    <Panel>
      <Label>Block</Label>
      <div className="relative max-w-[422px] space-y-4">
        <div className="text-base text-muted-foreground">
          1. In the block editor, add{" "}
          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] text-sm font-mono font-semibold">
            /EK Calendar
          </code>{" "}
          block.
        </div>
        <div className="text-base text-muted-foreground">
          2. In the right hand side Settings panel, select the relevant calendar
          from the dropdown menu.
        </div>
      </div>
    </Panel>
  );
}
