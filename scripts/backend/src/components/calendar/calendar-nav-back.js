import { Link } from "react-router-dom";

import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";

import { ChevronLeft } from "lucide-react";

export function CalendarNavBack({ calendar, setCalendar }) {
  const heading = calendar?.id > 0 ? "Edit calendar" : "Add calendar";

  return (
    <div className="space-y-[1px]">
      <Button
        variant="link"
        className="p-0 h-auto text-muted-foreground font-normal"
        asChild
      >
        <Link to="/calendars">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to all calendars
        </Link>
      </Button>
      <Heading level={3} className="pl-6">
        {heading}
      </Heading>
    </div>
  );
}
