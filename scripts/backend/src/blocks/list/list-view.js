import { TimezonePicker } from "@/components/timezone-picker";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { buildTimeline, safeNormalizeTimeZone } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { Globe, Image, MapPin } from "lucide-react";
import { useState } from "react";

export function ListView({ attributes, events }) {
  if (events.length === 0) {
    return (
      <div className="eventkoi-no-events py-8">{eventkoi_params.no_events}</div>
    );
  }

  let borderSize = attributes.borderSize ? attributes.borderSize : 0;
  let borderStyle = attributes.borderStyle ? attributes.borderStyle : "dotted";

  const urlParams = new URLSearchParams(window.location.search);
  const tzFromQuery = urlParams.get("tz");

  // Initialize from WP setting but allow user to change
  const [timeFormat, setTimeFormat] = useState(
    eventkoi_params?.time_format === "24" ? "24" : "12"
  );

  // state for TimezonePicker
  const [timezone, setTimezone] = useState(
    safeNormalizeTimeZone(
      tzFromQuery ||
        eventkoi_params?.timezone_override ||
        eventkoi_params?.timezone_string ||
        "UTC"
    )
  );

  return (
    <>
      {/* Timezone switcher */}
      <div className="flex justify-end pt-4 text-sm text-foreground">
        <TimezonePicker
          timezone={timezone}
          setTimezone={setTimezone}
          timeFormat={timeFormat}
          setTimeFormat={setTimeFormat}
        />
      </div>

      <div className="grid">
        {events.map((event) => {
          const wpTz = timezone;

          const loc = event.locations?.[0] ?? {};
          const isVirtual = loc.type === "virtual" || loc.type === "online";
          const isPhysical = loc.type === "inperson" || loc.type === "physical";
          const locationLine = event.location_line;

          const hasVirtual = isVirtual && loc.virtual_url;
          const hasPhysical = isPhysical && loc.address1;

          const renderLocation = () => {
            if (!attributes.showLocation) return null;

            if (hasVirtual) {
              const label = loc.link_text || loc.virtual_url;
              return (
                <a
                  href={loc.virtual_url}
                  className="flex gap-2 text-muted-foreground/90 text-sm underline underline-offset-4 truncate"
                  title={label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="w-4 h-4 min-w-4 text-muted-foreground/90" />
                  {label}
                </a>
              );
            }

            if (hasPhysical) {
              return (
                <span className="flex text-muted-foreground/90 text-sm gap-2">
                  <MapPin className="w-4 h-4 min-w-4 text-muted-foreground/90" />
                  {event.location_line}
                </span>
              );
            }

            if (locationLine) {
              const icon =
                event.type === "virtual" ? (
                  <Globe className="w-4 h-4 min-w-4 text-muted-foreground/90" />
                ) : (
                  <MapPin className="w-4 h-4 min-w-4 text-muted-foreground/90" />
                );

              return (
                <span className="flex text-muted-foreground/90 text-sm gap-2">
                  {icon}
                  {locationLine}
                </span>
              );
            }

            return null;
          };

          return (
            <div
              key={`event-${event.id}`}
              className="flex gap-8 py-8 border-border min-w-0"
              style={{
                borderBottomWidth: borderSize,
                borderBottomStyle: borderStyle,
              }}
            >
              {attributes.showImage && (
                <div
                  className={cn(
                    "ek-image min-w-[140px]",
                    !event.thumbnail && "hidden md:flex"
                  )}
                >
                  <AspectRatio ratio={1.5}>
                    {event.thumbnail ? (
                      <div className="h-full w-full flex items-center justify-center relative">
                        <a
                          href={event.url}
                          className="h-full w-full rounded-xl block"
                        >
                          <img
                            src={event.thumbnail}
                            className="h-full w-full rounded-xl"
                            alt={event.title}
                          />
                        </a>
                      </div>
                    ) : (
                      <div className="h-full w-full rounded-xl border border-input flex items-center justify-center relative bg-border">
                        <Image className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </AspectRatio>
                </div>
              )}

              <div className="ek-meta flex flex-col gap-2 grow min-w-0">
                {/* Mobile timeline */}
                <div className="flex md:hidden text-muted-foreground">
                  {buildTimeline(event, wpTz, timeFormat)}
                </div>

                <h3 className="m-0">
                  <a href={event.url} className="no-underline">
                    {event.title}
                  </a>
                </h3>

                {attributes.showDescription && event.description && (
                  <span className="text-base text-muted-foreground line-clamp-2">
                    {event.description}
                  </span>
                )}

                {renderLocation()}
              </div>

              {/* Desktop timeline */}
              <div className="hidden md:block ml-auto text-[14px] text-muted-foreground min-w-[200px] text-right">
                {buildTimeline(event, wpTz, timeFormat)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
