import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";

export function EventNavBack() {
  const { event } = useEventEditContext();
  const { timestamp } = useParams();
  const location = useLocation();

  const isEditingInstance = location.pathname.includes("/instances/edit/");
  const heading = isEditingInstance
    ? "Edit event instance"
    : event?.id > 0
    ? "Edit event"
    : "Add event";

  return (
    <div className="flex flex-col gap-[1px] flex-shrink-0 min-w-0 overflow-hidden">
      {/* Desktop breadcrumb (hidden on small screens) */}
      <div className="flex items-center gap-1 text-muted-foreground text-sm font-normal">
        {isEditingInstance ? (
          <div className="hidden md:flex items-center gap-2 pl-6">
            <Link
              to="/events"
              className="text-foreground hover:underline flex items-center gap-1"
            >
              Back to all events
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link
              to={`/events/${event?.id}/instances`}
              className="text-foreground hover:underline"
            >
              Recurring event instances table
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-muted-foreground">Edit event instance</span>
          </div>
        ) : (
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
        )}
      </div>

      {/* Mobile back link (only visible on small screens) */}
      {isEditingInstance && (
        <div className="flex sm:hidden items-center text-sm text-muted-foreground font-normal pl-0">
          <Link
            to={`/events/${event?.id}/instances`}
            className="hover:underline flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      )}

      {/* Heading — always visible, truncates on small screens */}
      <div>
        <Heading
          level={3}
          className={
            isEditingInstance
              ? "mt-[2px] pl-2 md:pl-6 truncate"
              : "mt-[2px] pl-6 truncate"
          }
        >
          {heading}
        </Heading>
      </div>
    </div>
  );
}
