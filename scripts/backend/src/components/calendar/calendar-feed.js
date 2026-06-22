import { __ } from "@wordpress/i18n";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Panel } from "@/components/panel";

import { CalendarPlus, CheckCheck, Copy } from "lucide-react";

export function CalendarFeed({ calendar }) {
  const [copying, setCopying] = useState(false);
  const feedUrl = calendar?.feed_url || "";
  const webcalUrl = calendar?.feed_webcal_url || "";

  return (
    <Panel className="p-0">
      <Label>{__("Calendar subscription (iCal)", "eventkoi-lite")}</Label>
      <p className="text-sm text-muted-foreground mb-2 max-w-[422px]">
        {__(
          "Share this link so visitors can subscribe in Apple or Google Calendar. The feed updates automatically as events change.",
          "eventkoi-lite",
        )}
      </p>
      <div className="relative max-w-[422px]">
        <Input
          type="text"
          value={feedUrl}
          className="w-full"
          readOnly
          disabled={!feedUrl}
        />
        <Button
          variant="secondary"
          type="button"
          className="absolute h-8 px-2 right-[5px] top-[4px] border-none cursor-pointer hover:bg-input"
          disabled={!feedUrl}
          onClick={() => {
            setCopying(true);
            navigator.clipboard.writeText(feedUrl);
            setTimeout(() => {
              setCopying(false);
            }, 1200);
          }}
        >
          {copying ? (
            <CheckCheck className="mr-2 h-4 w-4" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          {copying ? __("Copied!", "eventkoi-lite") : __("Copy", "eventkoi-lite")}
        </Button>
      </div>
      {webcalUrl ? (
        <div className="mt-3">
          <Button
            variant="outline"
            type="button"
            disabled={!webcalUrl}
            onClick={() => {
              if (webcalUrl) window.location.href = webcalUrl;
            }}
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            {__("Subscribe", "eventkoi-lite")}
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
