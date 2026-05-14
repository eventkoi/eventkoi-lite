import { Link } from "react-router-dom";

import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";

import { __ } from "@wordpress/i18n";
import { ChevronLeft } from "lucide-react";

export function CalendarNavBack({ calendar, setCalendar }) {
  const heading = calendar?.id > 0 ? __("Edit calendar", "eventkoi-lite") : __("Add calendar", "eventkoi-lite");

  return (
    <div className="space-y-[1px]">
      <Button
        variant="link"
        className="p-0 h-auto text-muted-foreground font-normal"
        asChild
      >
        <Link to="/calendars">
          <ChevronLeft className="mr-2 h-4 w-4" />
          {__("Back to all calendars", "eventkoi-lite")}
        </Link>
      </Button>
      <Heading level={3} className="pl-6">
        {heading}
      </Heading>
    </div>
  );
}
