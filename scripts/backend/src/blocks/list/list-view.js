import { cn } from "@/lib/utils";

import { AspectRatio } from "@/components/ui/aspect-ratio";

import { Globe, Image, MapPin } from "lucide-react";

export function ListView({ attributes, events }) {
  if (events.length == 0) {
    return (
      <div className="eventkoi-no-events py-8">{eventkoi_params.no_events}</div>
    );
  }

  let borderSize = attributes.borderSize ? attributes.borderSize : 0;
  let borderStyle = attributes.borderStyle ? attributes.borderStyle : "dotted";

  const style = {
    borderBottomWidth: borderSize,
    borderBottomStyle: borderStyle,
  };

  return (
    <div className="grid">
      {events.map(function (event, i) {
        return (
          <div
            key={`event-${event.id}`}
            className={`flex gap-8 py-8 border-border min-w-0`}
            style={style}
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
              {attributes.showDescription && event.description && (
                <span className="text-base text-muted-foreground line-clamp-2">
                  {event.description}
                </span>
              )}
              {attributes.showLocation &&
                event.type === "inperson" &&
                event.address1 && (
                  <span className="flex text-muted-foreground/90 text-sm gap-2">
                    <MapPin className="w-4 h-4 min-w-4 text-muted-foreground/90" />
                    {event.address1}
                    {event.address2 && (
                      <>
                        {", "}
                        {event.address2}
                      </>
                    )}
                  </span>
                )}
              {attributes.showLocation &&
                event.type === "virtual" &&
                event.virtual_url && (
                  <a
                    className="flex gap-2 text-muted-foreground/90 text-sm underline underline-offset-4 truncate"
                    title={event.virtual_url}
                    href={event.virtual_url}
                    target="_blank"
                  >
                    <Globe className="w-4 h-4 min-w-4 text-muted-foreground/90" />
                    {event.virtual_url}
                  </a>
                )}
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
