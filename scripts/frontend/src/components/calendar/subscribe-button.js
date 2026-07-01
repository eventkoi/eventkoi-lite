import { __ } from "@wordpress/i18n";
import { useState } from "react";
import { Calendar, CalendarPlus, Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Subscribe button for a whole calendar's iCal feed.
 *
 * Lets visitors add the calendar to Apple/Outlook (webcal), Google Calendar, or
 * copy the raw feed URL. The feed updates automatically in their calendar app.
 *
 * @param {Object} props
 * @param {string} props.feedUrl    The https text/calendar feed URL.
 * @param {string} props.feedWebcal The webcal:// variant for one-click subscribe.
 */
export function SubscribeButton({ feedUrl, feedWebcal }) {
  const [copied, setCopied] = useState(false);

  if (!feedUrl) {
    return null;
  }

  const webcal = feedWebcal || feedUrl.replace(/^https?:/i, "webcal:");
  const googleUrl =
    "https://calendar.google.com/calendar/r?cid=" + encodeURIComponent(webcal);

  const copyLink = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 rounded shadow-sm border border-solid border-border cursor-pointer"
        >
          <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          {__("Subscribe", "eventkoi-lite")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            window.location.href = webcal;
          }}
        >
          <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
          {__("Apple Calendar / Outlook", "eventkoi-lite")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            window.open(googleUrl, "_blank", "noopener");
          }}
        >
          <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
          {__("Google Calendar", "eventkoi-lite")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            copyLink();
          }}
        >
          {copied ? (
            <Check className="mr-2 h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {copied
            ? __("Copied!", "eventkoi-lite")
            : __("Copy feed link", "eventkoi-lite")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
