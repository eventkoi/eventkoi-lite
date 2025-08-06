import { Link } from "react-router-dom";

import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";

import { ChevronLeft } from "lucide-react";

export function EventNavBack({ event, setEvent }) {
  const heading = event?.id > 0 ? "Edit event" : "Add event";

  return (
    <div className="space-y-[1px]">
      <Button
        variant="link"
        className="p-0 h-auto text-muted-foreground font-normal"
        asChild
      >
        <Link to="/events">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to all events
        </Link>
      </Button>
      <Heading level={3} className="pl-6">
        {heading}
      </Heading>
    </div>
  );
}
