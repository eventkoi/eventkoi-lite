"use client";

import { ShareLink } from "@/components/share-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EmailIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  WhatsappIcon,
  XIcon,
} from "@/icons";
import { normalizeTimeZone } from "@/lib/date-utils";
import {
  Calendar,
  CheckCheck,
  ChevronDown,
  Copy,
  MapPin,
  Maximize2,
  Share2,
  X,
} from "lucide-react";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function formatTime(iso, tz = "utc", locale, timeFormat) {
  // Fallbacks from WP params
  const effectiveLocale =
    locale || eventkoi_params?.locale?.replace("_", "-") || "en";
  const effectiveFormat = timeFormat || eventkoi_params?.time_format || "12";

  const dt = DateTime.fromISO(iso, {
    zone: tz === "utc" ? "UTC" : normalizeTimeZone(tz),
  }).setLocale(effectiveLocale);

  return effectiveFormat === "24"
    ? dt.toFormat("HH:mm")
    : dt.toFormat("h:mma").toLowerCase().replace(":00", "");
}

function formatDate(iso, tz = "utc", locale) {
  const effectiveLocale =
    locale || eventkoi_params?.locale?.replace("_", "-") || "en";

  return DateTime.fromISO(iso, {
    zone: tz === "utc" ? "UTC" : normalizeTimeZone(tz),
  })
    .setLocale(effectiveLocale)
    .toLocaleString(DateTime.DATE_MED); // e.g. Mon, Sep 1, 2025
}

const formatCalDate = (iso, allDay) => {
  const d = new Date(iso);
  if (allDay) return d.toISOString().split("T")[0].replace(/-/g, "");
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
};

const openWindow = (url) => window.open(url, "_blank", "noopener,noreferrer");

export function EventPopover({
  event,
  anchor,
  onClose,
  ignoreNextOutsideClick,
  timezone = "UTC",
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [calendarMenuOpen, setCalendarMenuOpen] = useState(false);
  const [fixedAnchor] = useState(anchor);

  const location = event.location_line;

  const formattedDate = (() => {
    const tz = normalizeTimeZone(timezone);
    const locale = eventkoi_params?.locale || "en";
    const timeFormat = eventkoi_params?.time_format || "12";

    // force override: continuous events should NEVER be treated as allDay
    const isContinuous =
      event.date_type === "standard" && event.standard_type === "continuous";
    const isAllDay = event.allDay && !isContinuous;

    // === continuous standard events (show times)
    if (isContinuous || (event.start_time && event.end_time)) {
      const startIso = event.start_real || event.start;
      const endIso = event.end_real || event.end;

      if (startIso !== endIso) {
        return `${formatDate(startIso, tz, locale)}, ${formatTime(
          startIso,
          tz,
          locale,
          timeFormat
        )} – ${formatDate(endIso, tz, locale)}, ${formatTime(
          endIso,
          tz,
          locale,
          timeFormat
        )}`;
      } else {
        return `${formatDate(startIso, tz, locale)} – ${formatTime(
          endIso,
          tz,
          locale,
          timeFormat
        )}`;
      }
    }

    // === pure all-day events
    if (isAllDay) {
      if (event.start.split("T")[0] !== event.end.split("T")[0]) {
        return `${formatDate(event.start, tz, locale)} – ${formatDate(
          event.end_real,
          tz,
          locale
        )}`;
      }
      return formatDate(event.start, tz, locale);
    }

    // === normal timed events
    const sameDay = DateTime.fromISO(event.start, { zone: tz }).hasSame(
      DateTime.fromISO(event.end, { zone: tz }),
      "day"
    );

    if (sameDay) {
      return `${formatDate(event.start, tz, locale)}, ${formatTime(
        event.start,
        tz,
        locale,
        timeFormat
      )} – ${formatTime(event.end, tz, locale, timeFormat)}`;
    }

    return `${formatDate(event.start, tz, locale)}, ${formatTime(
      event.start,
      tz,
      locale,
      timeFormat
    )} – ${formatDate(event.end, tz, locale)}, ${formatTime(
      event.end,
      tz,
      locale,
      timeFormat
    )}`;
  })();

  const handleGoogleCal = () => {
    const url = new URL("https://www.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", event.title || "");
    url.searchParams.set(
      "dates",
      `${formatCalDate(event.start, event.allDay)}/${formatCalDate(
        event.end,
        event.allDay
      )}`
    );
    url.searchParams.set("details", event.description || "");
    url.searchParams.set("location", location || "");
    url.searchParams.set("output", "xml");
    openWindow(url.toString());
  };

  useEffect(() => {
    document.body.setAttribute(
      "data-calendar-menu-open",
      calendarMenuOpen ? "true" : "false"
    );
    return () => {
      document.body.removeAttribute("data-calendar-menu-open");
    };
  }, [calendarMenuOpen]);

  if (!event || !fixedAnchor) return null;

  const calendarContainer = document.querySelector(".fc");

  return createPortal(
    <>
      <div
        data-event-popover
        className="absolute z-50 rounded-lg border bg-white shadow-[0_0_4px_#bbb] text-sm overflow-hidden w-[370px] max-w-full"
        style={{
          left: `${fixedAnchor.x}px`,
          top: `${fixedAnchor.y}px`,
        }}
        onMouseDown={(e) => {
          if (e.target.closest("[data-event-popover]")) {
            e.stopPropagation();
          }
        }}
        onClick={(e) => {
          if (e.target.closest("[data-event-popover]")) {
            e.stopPropagation();
          }
        }}
        onPointerDownCapture={(e) => {
          if (shareOpen) {
            e.stopPropagation();
          }
        }}
      >
        {/* Header */}
        <div className="px-4 py-4 pb-0 relative">
          <div className="flex absolute right-1 top-1 gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 p-0 shadow-none border-none bg-transparent hover:bg-muted/20 cursor-pointer"
              onClick={() => window.open(event.url, "_blank")}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 p-0 shadow-none border-none bg-transparent hover:bg-muted/20 cursor-pointer"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-2 pe-[58px]">
            <a
              href={event.url}
              target="_blank"
              rel="noreferrer"
              className="text-base font-semibold leading-snug text-foreground no-underline hover:underline line-clamp-2 block"
            >
              {event.title}
            </a>
            {event.date_type === "recurring" && (
              <Badge
                variant="secondary"
                className="w-fit bg-[#eeeeee] hover:bg-[#eeeeee] font-normal"
              >
                Recurring
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-start gap-2 text-foreground text-sm leading-snug">
            <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="flex-1">{formattedDate}</div>
          </div>

          {location && (
            <div className="flex items-start gap-2 text-foreground text-sm leading-snug">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="flex-1">{location}</div>
            </div>
          )}

          {event.thumbnail && (
            <img
              src={event.thumbnail}
              alt=""
              className="w-full h-auto rounded-none border object-cover max-h-48"
            />
          )}

          {event.description && (
            <div className="text-sm text-muted-foreground leading-snug line-clamp-3">
              {event.description}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-4 pb-4 gap-2">
          <DropdownMenu
            open={calendarMenuOpen}
            onOpenChange={(val) => {
              setCalendarMenuOpen(val);
              if (!val) {
                ignoreNextOutsideClick.current = true;
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="text-[13px] justify-between gap-2 bg-transparent border border-solid border-[#ddd] rounded-sm shadow-none cursor-pointer h-8 min-h-0"
                onMouseDown={(e) => e.stopPropagation()}
              >
                Add to calendar
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-44"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={() => requestAnimationFrame(handleGoogleCal)}
              >
                Google Calendar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  requestAnimationFrame(() => openWindow(eventkoi_params.ical))
                }
              >
                iCalendar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  requestAnimationFrame(() =>
                    openWindow("https://outlook.office.com/owa/")
                  )
                }
              >
                Outlook 365
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  requestAnimationFrame(() =>
                    openWindow("https://outlook.live.com/owa/")
                  )
                }
              >
                Outlook Live
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShareOpen(true)}
            className="text-[13px] gap-2 bg-transparent border border-solid border-[#ddd] rounded-sm shadow-none cursor-pointer h-8 min-h-0"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </Button>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog
        open={shareOpen}
        onOpenChange={(open) => {
          setShareOpen(open);
          document.body.dataset.shareModalOpen = open ? "true" : "false";
          if (!open) {
            ignoreNextOutsideClick.current = true;
          }
        }}
      >
        <DialogContent
          data-event-share-modal
          className="w-full max-w-[685px] p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            setShareOpen(false);
            ignoreNextOutsideClick.current = true;
          }}
        >
          <DialogHeader className="flex items-center justify-center p-4 border-0 border-solid border-b-2 border-input">
            <DialogTitle className="font-sans text-xl m-0 text-foreground">
              Share this event
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col pt-[30px] pb-[60px] px-[60px]">
            <div className="flex gap-4 items-center flex-wrap justify-center pb-[60px]">
              <ShareLink
                event={event}
                name="whatsapp"
                title="Whatsapp"
                icon={<WhatsappIcon />}
              />
              <ShareLink
                event={event}
                name="instagram"
                title="Instagram"
                icon={<InstagramIcon />}
              />
              <ShareLink
                event={event}
                name="email"
                title="Email"
                icon={<EmailIcon />}
              />
              <ShareLink
                event={event}
                name="facebook"
                title="Facebook"
                icon={<FacebookIcon />}
              />
              <ShareLink event={event} name="x" title="X" icon={<XIcon />} />
              <ShareLink
                event={event}
                name="linkedin"
                title="Linkedin"
                icon={<LinkedinIcon />}
              />
            </div>

            <div className="flex flex-col gap-3 pb-[10px]">
              <Label className="text-base">Event link</Label>
              <div className="relative">
                <Input
                  id="link"
                  defaultValue={event?.url}
                  readOnly
                  className="min-h-[66px] border border-input border-solid border-primary/30 box-border text-lg text-foreground"
                />
                <Button
                  variant="secondary"
                  type="button"
                  className="absolute h-12 right-[9px] top-[9px] border-none cursor-pointer hover:bg-input"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    requestAnimationFrame(() => {
                      navigator.clipboard.writeText(event?.url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1200);
                    });
                  }}
                >
                  {copied ? (
                    <CheckCheck className="mr-2 h-5 w-5" />
                  ) : (
                    <Copy className="mr-2 h-5 w-5" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>,
    calendarContainer || document.body
  );
}
