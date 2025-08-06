import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import { Globe, Image, MapPin } from "lucide-react";

export function ListView({
  events,
  showImage,
  showDescription,
  showLocation,
  borderSize,
  borderStyle,
}) {
  if (events.length === 0) {
    return (
      <div className="eventkoi-no-events py-8">{eventkoi_params.no_events}</div>
    );
  }

  return (
    <div className="grid">
      {events.map((event) => {
        const loc = event.locations?.[0] ?? {};
        const isVirtual = loc.type === "virtual" || loc.type === "online";
        const isPhysical = loc.type === "inperson" || loc.type === "physical";
        const locationLine = event.location_line;

        const hasVirtual = isVirtual && loc.virtual_url;
        const hasPhysical = isPhysical && loc.address1;

        const renderLocation = () => {
          if (!showLocation) return null;

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
              <div className="flex md:hidden text-muted-foreground">
                {event.timeline}
              </div>

              <h3 className="m-0">
                <a href={event.url} className="no-underline">
                  {event.title}
                </a>
              </h3>

              {showDescription === "yes" && event.description && (
                <span className="text-base text-muted-foreground line-clamp-2">
                  {event.description}
                </span>
              )}

              {renderLocation()}
            </div>

            <div className="hidden md:block ml-auto text-[14px] text-muted-foreground min-w-[200px] text-right">
              {event.timeline}
            </div>
          </div>
        );
      })}
    </div>
  );
}
