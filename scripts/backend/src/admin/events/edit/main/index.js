import { Box } from "@/components/box";
import { EventCalendar } from "@/components/event/event-calendar";
import { EventTaxonomies } from "@/components/event/event-taxonomies";
import { EventDate } from "@/components/event/event-date";
import { EventDescription } from "@/components/event/event-description";
import { EventImage } from "@/components/event/event-image";
import { EventLocation } from "@/components/event/event-location";
import { EventExcerpt } from "@/components/event/event-excerpt";
import { EventMetaboxEmbed } from "@/components/event/event-metabox-embed";
import { EventName } from "@/components/event/event-name";
import { EventSlug } from "@/components/event/event-slug";
import { EventTemplate } from "@/components/event/event-template";
import { AttendanceModeSelector } from "@/components/event/attendance-mode-selector";
import { Heading } from "@/components/heading";
import { ProLaunch } from "@/components/dashboard/pro-launch";
import { ShortcodeBox } from "@/components/ShortcodeBox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { APIProvider } from "@vis.gl/react-google-maps";
import { __ } from "@wordpress/i18n";
import { useState } from "react";

export function EventEditMain() {
  const { event, setEvent, settings } = useEventEditContext();
  const gmapApiKey = settings?.gmap_api_key;
  const [showAttributes, setShowAttributes] = useState(false);

  return (
    <div className="flex flex-col w-full gap-8">
      <Box container className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <EventName />
          <div className="flex items-center min-w-[170px] justify-between gap-[10px]">
            <Label htmlFor="show-attrs" className="font-normal text-[12px]">
              <div className="leading-[15px] flex md:block">
                <div>{__("Show block attributes", "eventkoi-lite")}</div>
                <div>{__("and shortcodes", "eventkoi-lite")}</div>
              </div>
            </Label>
            <Switch
              id="show-attrs"
              checked={showAttributes}
              onCheckedChange={setShowAttributes}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:gap-6 [&>*]:flex-1 [&>*]:min-w-0">
          <EventSlug />
          <EventExcerpt />
        </div>
      </Box>

      {/* Event Date */}
      <Box container>
        <EventDate showAttributes={showAttributes} />
      </Box>

      {/* Attendance Mode */}
      <Box container>
        <AttendanceModeSelector event={event} setEvent={setEvent} />
      </Box>

      {/* Location + optional GMap + shortcode */}
      <Box container>
        <Heading level={3}>{__("Location details", "eventkoi-lite")}</Heading>
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
        <Heading level={3}>{__("Additional details", "eventkoi-lite")}</Heading>
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
        <EventTemplate disabled />
        <EventCalendar disabled />
        {showAttributes && (
          <div className="text-sm text-muted-foreground -mt-6">
            <ShortcodeBox
              attribute="event_calendar"
              data="calendar"
              eventId={event?.id}
            />
          </div>
        )}
        <ProLaunch
          headline="Upgrade to switch event templates and calendars"
          minimal
        />
      </Box>

      {/* Third-party taxonomies (only renders when the site registered any) */}
      <EventTaxonomiesBox />

      {/* Metaboxes other plugins add (ACF, Pods, Yoast, ...) in one panel */}
      <EventMetaboxEmbed />
    </div>
  );
}

function EventTaxonomiesBox() {
  const { event } = useEventEditContext();
  const hasTaxonomies =
    Array.isArray(event?.custom_taxonomies) &&
    event.custom_taxonomies.some(
      (item) => Array.isArray(item.terms) && item.terms.length > 0
    );

  if (!hasTaxonomies) {
    return null;
  }

  // No wrapper box or generic heading: each taxonomy renders its own
  // container titled with its own name.
  return <EventTaxonomies />;
}
