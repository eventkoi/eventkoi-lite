import { Box } from "@/components/box";
import { EventCalendar } from "@/components/event/event-calendar";
import { EventDate } from "@/components/event/event-date";
import { EventDescription } from "@/components/event/event-description";
import { EventImage } from "@/components/event/event-image";
import { EventLocation } from "@/components/event/event-location";
import { EventName } from "@/components/event/event-name";
import { EventTemplate } from "@/components/event/event-template";
import { Heading } from "@/components/heading";
import { ShortcodeBox } from "@/components/ShortcodeBox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useState } from "react";

export function EventEditMain() {
  const { event, settings } = useEventEditContext();
  const gmapApiKey = settings?.gmap_api_key;
  const [showAttributes, setShowAttributes] = useState(false);

  return (
    <div className="flex flex-col w-full gap-8">
      <Box
        container
        className="flex flex-col md:flex-row items-start justify-between gap-4"
      >
        <EventName />
        <div className="flex items-center min-w-[170px] justify-between gap-[10px]">
          <Label htmlFor="show-attrs" className="font-normal text-[12px]">
            <div className="leading-[15px] flex md:block">
              <div>Show block attributes</div>
              <div>and shortcodes</div>
            </div>
          </Label>
          <Switch
            id="show-attrs"
            checked={showAttributes}
            onCheckedChange={setShowAttributes}
          />
        </div>
      </Box>

      {/* Event Date */}
      <Box container>
        <EventDate showAttributes={showAttributes} />
      </Box>

      {/* Location + optional GMap + shortcode */}
      <Box container>
        <Heading level={3}>Location details</Heading>
        {gmapApiKey ? (
          <APIProvider apiKey={gmapApiKey}>
            <EventLocation />
          </APIProvider>
        ) : (
          <EventLocation />
        )}
        {showAttributes && (
          <ShortcodeBox
            attribute="event_location"
            data="location"
            eventId={event?.id}
          />
        )}
      </Box>

      {/* Additional details */}
      <Box container className="gap-10">
        <Heading level={3}>Additional details</Heading>
        <EventImage />
        {showAttributes && (
          <div className="text-sm text-muted-foreground -mt-6">
            <ShortcodeBox
              attribute="event_image"
              data="image"
              eventId={event?.id}
            />
          </div>
        )}
        <EventDescription />
        {showAttributes && (
          <div className="text-sm text-muted-foreground -mt-6">
            <ShortcodeBox
              attribute="event_details"
              data="details"
              eventId={event?.id}
            />
          </div>
        )}
        <EventTemplate />
        <EventCalendar />
        {showAttributes && (
          <div className="text-sm text-muted-foreground -mt-6">
            <ShortcodeBox
              attribute="event_calendar"
              data="calendar"
              eventId={event?.id}
            />
          </div>
        )}
      </Box>
    </div>
  );
}
