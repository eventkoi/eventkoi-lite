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
import { normalizeTimeZone, wpToLuxonFormat } from "@/lib/date-utils";
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

function formatTime(iso, tz = "utc", locale, timeFormatPref) {
  const effectiveLocale =
    locale || eventkoi_params?.locale?.replace("_", "-") || "en";

  const pref = timeFormatPref || eventkoi_params?.time_format || "12";
  const wpTimeFormatRaw =
    eventkoi_params?.time_format_string || (pref === "24" ? "H:i" : "g:i a");
  const luxonTimeFormat = wpToLuxonFormat(wpTimeFormatRaw);

  const dt = DateTime.fromISO(iso, {
    zone: tz === "utc" ? "UTC" : normalizeTimeZone(tz),
  }).setLocale(effectiveLocale);

  if (!dt.isValid) {
    return "";
  }

  let formatted = dt.toFormat(luxonTimeFormat);

  if (wpTimeFormatRaw.includes("A")) {
    formatted = formatted.replace(/\b(am|pm)\b/g, (m) => m.toUpperCase());
  } else if (wpTimeFormatRaw.includes("a")) {
    formatted = formatted.replace(/\b(AM|PM)\b/g, (m) => m.toLowerCase());
  }

  return formatted;
}

function formatDate(iso, tz = "utc", locale) {
  const effectiveLocale =
    locale || eventkoi_params?.locale?.replace("_", "-") || "en";
  const dateFormat = wpToLuxonFormat(eventkoi_params?.date_format || "F j, Y");

  const dt = DateTime.fromISO(iso, {
    zone: tz === "utc" ? "UTC" : normalizeTimeZone(tz),
  }).setLocale(effectiveLocale);

  return dt.isValid ? dt.toFormat(dateFormat) : "";
}

function formatDateTime(dt, locale) {
  const effectiveLocale =
    locale || eventkoi_params?.locale?.replace("_", "-") || "en";
  const dateFormat = wpToLuxonFormat(eventkoi_params?.date_format || "F j, Y");

  return dt?.isValid ? dt.setLocale(effectiveLocale).toFormat(dateFormat) : "";
}

function getAllDayDisplayEnd(start, realEnd, rawEnd) {
  if (realEnd?.isValid) {
    const durationMs = realEnd.toMillis() - start.toMillis();
    return durationMs > 0 && durationMs <= 24 * 60 * 60 * 1000
      ? start
      : realEnd;
  }

  if (!rawEnd?.isValid) {
    return null;
  }

  const durationMs = rawEnd.toMillis() - start.toMillis();
  if (durationMs > 0 && durationMs <= 24 * 60 * 60 * 1000) {
    return start;
  }

  return rawEnd.hasSame(start, "day") ? rawEnd : rawEnd.minus({ days: 1 });
}

function parsePopoverDate(iso, tz = "utc", locale) {
  if (!iso) {
    return null;
  }

  const effectiveLocale =
    locale || eventkoi_params?.locale?.replace("_", "-") || "en";
  const dt = DateTime.fromISO(iso, {
    zone: tz === "utc" ? "UTC" : normalizeTimeZone(tz),
  }).setLocale(effectiveLocale);

  return dt.isValid ? dt : null;
}

const parseCalendarExportDate = (value, timezone = "UTC") => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const dt = DateTime.fromJSDate(value, {
      zone: timezone === "utc" ? "UTC" : normalizeTimeZone(timezone),
    });
    return dt.isValid ? dt : null;
  }

  const dt = DateTime.fromISO(String(value), {
    zone: timezone === "utc" ? "UTC" : normalizeTimeZone(timezone),
  });

  return dt.isValid ? dt : null;
};

const getExclusiveAllDayExportEnd = (start, end) => {
  const startDate = start.startOf("day");

  if (!end || end.toMillis() <= start.toMillis()) {
    return startDate.plus({ days: 1 });
  }

  if (end.toMillis() - start.toMillis() <= 24 * 60 * 60 * 1000) {
    return startDate.plus({ days: 1 });
  }

  const endDate = end.startOf("day");

  if (endDate <= startDate) {
    return startDate.plus({ days: 1 });
  }

  return end.equals(endDate) ? endDate : endDate.plus({ days: 1 });
};

const formatTimedCalendarExportDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
};

const formatGoogleCalendarDates = (event, timezone = "UTC") => {
  if (event.allDay) {
    if (event.all_day_start_date) {
      const startDate = String(event.all_day_start_date).replace(/-/g, "");
      const endDate = String(
        event.all_day_end_exclusive_date ||
          DateTime.fromISO(event.all_day_end_date || event.all_day_start_date)
            .plus({ days: 1 })
            .toISODate()
      ).replace(/-/g, "");

      return `${startDate}/${endDate}`;
    }

    const allDayTimezone =
      event.all_day_timezone || event.allDayTimezone || timezone;
    const start = parseCalendarExportDate(
      event.start || event.start_real,
      allDayTimezone
    );

    if (!start) {
      return "";
    }

    let end = parseCalendarExportDate(event.end, allDayTimezone);

    end = getExclusiveAllDayExportEnd(
      start,
      end || parseCalendarExportDate(event.end_real, allDayTimezone)
    );

    return `${start.toFormat("yyyyMMdd")}/${end.toFormat("yyyyMMdd")}`;
  }

  const start = formatTimedCalendarExportDate(event.start || event.start_real);
  const end = formatTimedCalendarExportDate(
    event.end || event.end_real || event.start || event.start_real
  );

  if (!start || !end) {
    return "";
  }

  return `${start}/${end}`;
};

const formatOutlookCalendarDates = (event, timezone = "UTC") => {
  if (event.allDay) {
    if (event.all_day_start_date) {
      const endDate =
        event.all_day_end_exclusive_date ||
        DateTime.fromISO(event.all_day_end_date || event.all_day_start_date)
          .plus({ days: 1 })
          .toISODate();

      return {
        start: event.all_day_start_date,
        end: endDate,
        allDay: true,
      };
    }

    const allDayTimezone =
      event.all_day_timezone || event.allDayTimezone || timezone;
    const start = parseCalendarExportDate(
      event.start || event.start_real,
      allDayTimezone
    );

    if (!start) {
      return null;
    }

    let end = parseCalendarExportDate(event.end, allDayTimezone);

    end = getExclusiveAllDayExportEnd(
      start,
      end || parseCalendarExportDate(event.end_real, allDayTimezone)
    );

    return {
      start: start.toISODate(),
      end: end.toISODate(),
      allDay: true,
    };
  }

  const start = new Date(event.start || event.start_real);
  const end = new Date(
    event.end || event.end_real || event.start || event.start_real
  );

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: false,
  };
};

const openWindow = (url) => window.open(url, "_blank", "noopener,noreferrer");

const getCalendarExportTimezone = (timezone) => {
  return normalizeTimeZone(timezone || eventkoi_params?.timezone || "UTC");
};

const getEventIcalUrl = (event, timezone = "UTC") => {
  const source = event?.url || eventkoi_params?.ical || "";

  if (!source) {
    return "";
  }

  try {
    const url = new URL(source, window.location.href);

    url.searchParams.set("ical", "1");
    url.searchParams.set("tz", getCalendarExportTimezone(timezone));

    const directEventDay =
      event?.event_day ?? event?.eventDay ?? event?.selected_day_index;
    const eventDay =
      directEventDay !== undefined && directEventDay !== null
        ? String(directEventDay)
        : String(event?.id || "").match(/-day(\d+)$/)?.[1] || "";

    if (
      event?.date_type === "standard" &&
      event?.standard_type === "selected" &&
      /^\d+$/.test(eventDay)
    ) {
      url.searchParams.set("event_day", String(parseInt(eventDay, 10)));
    }

    return url.toString().replace(/^https?:/i, "webcal:");
  } catch {
    return eventkoi_params?.ical || "";
  }
};

const getEventPageUrl = (event, timezone = "UTC") => {
  const source = event?.url || "";

  if (!source) {
    return "";
  }

  try {
    const url = new URL(source, window.location.href);

    url.searchParams.set("tz", getCalendarExportTimezone(timezone));
    return url.toString();
  } catch {
    return source;
  }
};

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
    const locale = eventkoi_params?.locale?.replace("_", "-") || "en";
    const timeFormat = eventkoi_params?.time_format || "12";

    const isContinuous =
      event.date_type === "standard" && event.standard_type === "continuous";
    const isAllDay = Boolean(event.allDay);
    const isContinuousTimed = isContinuous && !isAllDay;

    // === timed events that provide explicit start/end display times
    if (isContinuousTimed || (!isAllDay && event.start_time && event.end_time)) {
      const startIso = event.start_real || event.start;
      const endIso = event.end_real || event.end;
      const startDt = parsePopoverDate(startIso, tz, locale);
      const endDt = parsePopoverDate(endIso, tz, locale);

      if (!startDt) {
        return "";
      }

      if (endDt?.isValid && startDt.hasSame(endDt, "day")) {
        return `${formatDateTime(startDt, locale)}, ${formatTime(
          startIso,
          tz,
          locale,
          timeFormat
        )} – ${formatTime(endIso, tz, locale, timeFormat)}`;
      }

      if (endDt?.isValid) {
        return `${formatDateTime(startDt, locale)}, ${formatTime(
          startIso,
          tz,
          locale,
          timeFormat
        )} – ${formatDateTime(endDt, locale)}, ${formatTime(
          endIso,
          tz,
          locale,
          timeFormat
        )}`;
      }

      return `${formatDateTime(startDt, locale)}, ${formatTime(
        startIso,
        tz,
        locale,
        timeFormat
      )}`;
    }

    // === pure all-day events
    if (isAllDay) {
      const allDayTz = normalizeTimeZone(
        event.all_day_timezone || event.allDayTimezone || tz
      );
      const start = parsePopoverDate(
        event.all_day_start_date || event.start_real || event.start,
        allDayTz,
        locale
      );
      const realEnd = parsePopoverDate(
        event.all_day_end_date || event.end_real,
        allDayTz,
        locale
      );
      const rawEnd = parsePopoverDate(
        event.all_day_end_date || event.end,
        allDayTz,
        locale
      );

      if (!start) {
        return "";
      }

      const displayEnd = getAllDayDisplayEnd(start, realEnd, rawEnd);

      if (!displayEnd || displayEnd < start || displayEnd.hasSame(start, "day")) {
        return formatDateTime(start, locale);
      }

      return `${formatDateTime(start, locale)} – ${formatDateTime(
        displayEnd,
        locale
      )}`;
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
    const dates = formatGoogleCalendarDates(event, timezone);

    if (!dates) {
      return;
    }

    url.searchParams.set("dates", dates);
    url.searchParams.set("details", event.description || "");
    url.searchParams.set("location", location || "");
    url.searchParams.set("output", "xml");
    openWindow(url.toString());
  };

  const handleOutlookCal = (baseUrl) => {
    const dates = formatOutlookCalendarDates(event, timezone);

    if (!dates) {
      return;
    }

    const url = new URL(baseUrl);
    url.searchParams.set("path", "/calendar/action/compose");
    url.searchParams.set("rru", "addevent");
    url.searchParams.set("allday", dates.allDay ? "true" : "false");
    url.searchParams.set("startdt", dates.start);
    url.searchParams.set("enddt", dates.end);
    url.searchParams.set("location", location || "");
    url.searchParams.set("subject", event.title || "");
    url.searchParams.set("body", event.description || "");
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!event || !fixedAnchor) return null;

  const calendarContainer = document.querySelector(".fc");
  const eventPageUrl = getEventPageUrl(event, timezone);

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
              onClick={() => window.open(eventPageUrl || event.url, "_self")}
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
              href={eventPageUrl || event.url}
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
                  requestAnimationFrame(() => {
                    const url = getEventIcalUrl(event, timezone);

                    if (url) {
                      openWindow(url);
                    }
                  })
                }
              >
                iCalendar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  requestAnimationFrame(() =>
                    handleOutlookCal("https://outlook.office.com/owa/")
                  )
                }
              >
                Outlook 365
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  requestAnimationFrame(() =>
                    handleOutlookCal("https://outlook.live.com/owa/")
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
