import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Panel } from "@/components/panel";

import { CheckCheck, Copy } from "lucide-react";

export function CalendarLink({ calendar, setCalendar }) {
  const [copying, setCopying] = useState(false);

  return (
    <Panel>
      <Label>Calendar link</Label>
      <div className="relative max-w-[422px]">
        <Input
          type="text"
          value={calendar?.url}
          className="w-full"
          readOnly
          disabled={!calendar.url}
        />
        <Button
          variant="secondary"
          type="submit"
          className="absolute h-8 px-2 right-[5px] top-[4px] border-none cursor-pointer hover:bg-input"
          disabled={!calendar.url}
          onClick={() => {
            setCopying(true);
            navigator.clipboard.writeText(calendar?.url);
            setTimeout(() => {
              setCopying(false);
            }, 1200);
          }}
        >
          {copying ? (
            <CheckCheck className="mr-2 h-4 w-4" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          {copying ? "Copied!" : "Copy"}
        </Button>
      </div>
    </Panel>
  );
}
