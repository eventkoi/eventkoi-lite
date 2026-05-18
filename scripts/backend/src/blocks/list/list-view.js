import { TimezonePicker } from "@/components/timezone-picker";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { buildTimeline, safeNormalizeTimeZone } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { Globe, Image, MapPin } from "lucide-react";
import { useState } from "react";

const locationText = (source = {}, key) => {
  const value = source?.[key];
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    const texts = value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return String(item).trim();
        }
        if (item && typeof item === "object") {
          for (const nestedKey of ["name", "text", "url", "@id"]) {
            const nested = item?.[nestedKey];
            if (typeof nested === "string" || typeof nested === "number") {
              return String(nested).trim();
            }
          }
        }
        return "";
      })
      .filter(Boolean);
    return [...new Set(texts)].join(" ");
  }
  if (typeof value === "object") {
    for (const nestedKey of ["name", "text", "url", "@id"]) {
      const nested = value?.[nestedKey];
      if (typeof nested === "string" || typeof nested === "number") {
        const text = String(nested).trim();
        if (text) return text;
      }
    }
    return "";
  }
  return String(value).trim();
};

const getLocationVirtualUrl = (location = {}) =>
  locationText(location, "virtual_url") || locationText(location, "url");

const getLocationType = (location = {}) => {
  const type = locationText(location, "type").toLowerCase();
  if (type === "virtual" || type === "online") return "online";
  if (type === "physical" || type === "inperson") return "inperson";
  if (type.includes("virtuallocation")) return "online";
  if (type.includes("place")) return "inperson";

  const schemaType = locationText(location, "@type").toLowerCase();
  if (schemaType.includes("virtuallocation")) return "online";
  if (schemaType.includes("place")) return "inperson";

  return "";
};

const formatLocationLine = (location = {}) => {
  const address = location?.address || {};
  const virtualUrl = getLocationVirtualUrl(location);
  if (getLocationType(location) === "online" && virtualUrl) {
    return virtualUrl;
  }

  return [
    locationText(location, "name"),
    locationText(location, "address1") || locationText(address, "streetAddress"),
    locationText(location, "address2"),
    locationText(location, "address3"),
    [locationText(location, "city") || locationText(address, "addressLocality"), locationText(location, "state") || locationText(address, "addressRegion"), locationText(location, "zip") || locationText(address, "postalCode")]
      .filter(Boolean)
      .join(", "),
    locationText(location, "country") || locationText(address, "addressCountry"),
  ]
    .filter(Boolean)
    .join(", ");
};

const getPrimaryLocation = (event = {}) => {
  const locations = Array.isArray(event?.locations) ? event.locations : [];
  return locations.find((location) => formatLocationLine(location)) || {};
};

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
  const getEventUrl = (event, displayTimezone) => {
    const source = event?.url || "";

    if (!source) {
      return "";
    }

    try {
      const url = new URL(source, window.location.href);
      url.searchParams.set(
        "tz",
        safeNormalizeTimeZone(displayTimezone || "UTC")
      );
      return url.toString();
    } catch {
      return source;
    }
  };

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

          const loc = getPrimaryLocation(event);
          const isVirtual = getLocationType(loc) === "online";
          const isPhysical = getLocationType(loc) === "inperson";
          const virtualUrl = getLocationVirtualUrl(loc);
          const locationLine = event.location_line || formatLocationLine(loc);

          const hasVirtual = isVirtual && virtualUrl;
          const hasPhysical = isPhysical && locationLine;

          const renderLocation = () => {
            if (!attributes.showLocation) return null;

            if (hasVirtual) {
              const label = loc.link_text || virtualUrl;
              return (
                <a
                  href={virtualUrl}
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
                  {locationLine}
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
                          href={getEventUrl(event, wpTz)}
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
                <div className="flex md:hidden text-muted-foreground whitespace-pre-line">
                  {buildTimeline(event, wpTz, timeFormat)}
                </div>

                <h3 className="m-0">
                  <a href={getEventUrl(event, wpTz)} className="no-underline">
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
              <div className="hidden md:block ml-auto text-[14px] text-muted-foreground min-w-[200px] text-right whitespace-pre-line">
                {buildTimeline(event, wpTz, timeFormat)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
