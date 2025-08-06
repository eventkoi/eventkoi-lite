import { Box } from "@/components/box";
import { EventBadge } from "@/components/event-badge";
import { Heading } from "@/components/heading";
import { Placeholder } from "@/components/placeholder";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import apiRequest from "@wordpress/api-fetch";
import {
  Calendar,
  CirclePlus,
  Image,
  Link as LinkIcon,
  MapPin,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function UpcomingEvents() {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    apiRequest({
      path: `${eventkoi_params.api}/events?number=3`,
      method: "get",
    })
      .then(setEvents)
      .catch(() => {});
  }, []);

  const renderLocation = (event) => {
    if (!event.location_line) return null;

    const isVirtual =
      event.type === "virtual" ||
      event.type === "online" ||
      event.location_line.startsWith("http://") ||
      event.location_line.startsWith("https://");

    const Icon = isVirtual ? LinkIcon : MapPin;

    return (
      <span
        className={cn(
          "flex items-center gap-1 truncate text-muted-foreground",
          isVirtual && "underline underline-offset-4"
        )}
        title={event.location_line}
        onClick={(e) => {
          if (isVirtual) {
            e.preventDefault();
            e.stopPropagation();
            window.open(event.location_line, "_blank");
          }
        }}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{event.location_line}</span>
      </span>
    );
  };

  const fillerCount = events?.length === 1 ? 2 : events?.length === 2 ? 1 : 0;

  return (
    <Box container>
      <Heading level={3}>Events</Heading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">
        {!events &&
          Array.from({ length: 3 }).map((_, i) => <Placeholder key={i} />)}

        {events &&
          events.map((event) => (
            <Link
              key={`event-${event.id}`}
              className="flex flex-col space-y-3"
              to={`/events/${event.id}`}
            >
              <AspectRatio ratio={1.5}>
                {event.image ? (
                  <div className="h-full w-full flex items-center justify-center relative">
                    <EventBadge status={event.status} />
                    <img
                      src={event.image}
                      className="h-full w-full rounded-xl object-cover"
                      alt={event.title}
                    />
                  </div>
                ) : (
                  <div className="h-full w-full rounded-xl border border-input flex items-center justify-center relative">
                    <EventBadge status={event.status} />
                    <Image className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
              </AspectRatio>

              <div className="space-y-[2px]">
                <span
                  className="block text-base font-medium text-foreground truncate"
                  title={event.title}
                >
                  {event.title}
                </span>

                {event.status !== "tbc" && (
                  <span className="block text-muted-foreground">
                    {event.timeline}
                  </span>
                )}

                {renderLocation(event)}
              </div>
            </Link>
          ))}

        {events && events.length === 0 && (
          <div className="col-span-3 flex items-center justify-center text-muted-foreground/80 text-base">
            There are no upcoming events.
          </div>
        )}

        {Array.from({ length: fillerCount }).map((_, i) => (
          <div key={`filler-${i}`} />
        ))}

        <div>
          <AspectRatio ratio={1.5}>
            <div className="flex flex-col gap-4 justify-between h-full">
              <Button
                variant="default"
                className="flex flex-col grow gap-1 px-4 justify-center h-auto border rounded-xl items-center border-foreground bg-foreground text-white hover:text-card-foreground hover:bg-accent hover:border-foreground/40"
                asChild
              >
                <Link to="/events/add/main">
                  <CirclePlus className="w-5 h-5" />
                  Add new event
                </Link>
              </Button>

              <Button
                className="flex flex-col grow gap-1 px-4 justify-center h-auto border rounded-xl items-center bg-transparent text-card-foreground hover:bg-accent border-foreground/40"
                asChild
              >
                <Link to="/events">
                  <Calendar className="w-5 h-5" />
                  View all events
                </Link>
              </Button>
            </div>
          </AspectRatio>
        </div>
      </div>
    </Box>
  );
}
