import { AspectRatio } from "@/components/ui/aspect-ratio";
import { buildTimeline, safeNormalizeTimeZone } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { __ } from "@wordpress/i18n";
import { Globe, Image, MapPin } from "lucide-react";

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

export function ListView({
  events,
  timezone,
  showImage,
  showDescription,
  showLocation,
  borderSize,
  borderStyle,
  timeFormat,
  loading,
}) {
  if (events === null || loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="eventkoi-no-events py-8"
      >
        Loading events…
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div role="status" aria-live="polite" className="eventkoi-no-events py-8">
        {eventkoi_params.no_events}
      </div>
    );
  }

  const urlParams = new URLSearchParams(window.location.search);
  const tzFromQuery = urlParams.get("tz");
  const getEventUrl = (event, displayTimezone) => {
    const source = event?.url || "";

    if (!source) {
      return "";
    }

    try {
      const url = new URL(source, window.location.href);
      const resolvedTimezone =
        displayTimezone === "local"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
          : safeNormalizeTimeZone(displayTimezone || timezone || "UTC");

      url.searchParams.set("tz", resolvedTimezone);
      return url.toString();
    } catch {
      return source;
    }
  };

  return (
    <ul className="grid list-none m-0 p-0" role="list">
      {events.map((event) => {
        const wpTz = tzFromQuery
          ? safeNormalizeTimeZone(tzFromQuery)
          : window.eventkoi_params?.auto_detect_timezone
          ? "local"
          : safeNormalizeTimeZone(
              event?.timezone ||
                window.eventkoi_params?.timezone_string ||
                "UTC"
            );

        const loc = getPrimaryLocation(event);
        const isVirtual = getLocationType(loc) === "online";
        const isPhysical = getLocationType(loc) === "inperson";
        const virtualUrl = getLocationVirtualUrl(loc);
        const locationLine = event.location_line || formatLocationLine(loc);

        const hasVirtual = isVirtual && virtualUrl;
        const hasPhysical = isPhysical && locationLine;

        const renderLocation = () => {
          if (!showLocation) return null;

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
          <li
            key={`event-${event.id}`}
            className="flex gap-8 py-8 border-border min-w-0"
            style={{
              borderBottomWidth: borderSize,
              borderBottomStyle: borderStyle,
            }}
          >
            {showImage === "yes" && (
              <div
                className={cn(
                  "ek-image min-w-[140px]",
                  !event.thumbnail && "hidden md:flex"
                )}
              >
                <AspectRatio ratio={1.5}>
                  {event.thumbnail ? (
                    <div className="h-full w-full flex items-center justify-center relative">
                      {/* Decorative image link (avoid duplicate links with aria-hidden) */}
                      <a
                        href={getEventUrl(event, wpTz)}
                        className="h-full w-full rounded-xl block"
                        aria-hidden="true"
                        tabIndex={-1}
                      >
                        <img
                          src={event.thumbnail}
                          className="h-full w-full rounded-xl object-cover"
                          alt="" // decorative (title already present)
                          aria-hidden="true" // prevent screen reader duplication
                        />
                      </a>
                    </div>
                  ) : (
                    <div className="h-full w-full rounded-xl border border-input flex items-center justify-center relative bg-border">
                      <Image
                        className="w-6 h-6 text-muted-foreground/40"
                        aria-hidden="true"
                      />
                      <span className="sr-only">
                        {__("No event image", "eventkoi-lite")}
                      </span>
                    </div>
                  )}
                </AspectRatio>
              </div>
            )}

            <div className="ek-meta flex flex-col gap-2 grow min-w-0">
              <div
                className="flex md:hidden text-muted-foreground whitespace-pre-line"
                role="group"
                aria-hidden="true"
                aria-label={`Event time: ${buildTimeline(
                  event,
                  wpTz,
                  timeFormat
                )}`}
              >
                {buildTimeline(event, wpTz, timeFormat)}
              </div>

              {event.calendar_name && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground m-0">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: event.calendar_color || "currentColor",
                    }}
                    aria-hidden="true"
                  />
                  <span>{event.calendar_name}</span>
                </div>
              )}

              <h3 className="m-0 text-lg font-semibold leading-snug">
                <a href={getEventUrl(event, wpTz)} className="no-underline">
                  {event.title}
                  <span className="sr-only"> — View event details</span>
                </a>
              </h3>

              {showDescription === "yes" && event.description && (
                <p className="text-base text-muted-foreground line-clamp-2 m-0">
                  {event.description}
                </p>
              )}

              {renderLocation()}
            </div>

            <div
              className="hidden md:block ml-auto text-[14px] text-muted-foreground min-w-[200px] text-right whitespace-pre-line"
              role="group"
              aria-label={`Event time: ${buildTimeline(
                event,
                wpTz,
                timeFormat
              )}`}
            >
              {buildTimeline(event, wpTz, timeFormat)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
