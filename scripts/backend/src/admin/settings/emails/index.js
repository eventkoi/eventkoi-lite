import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";
import { useEffect, useMemo, useState } from "react";

import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { ProBadge } from "@/components/pro-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettings } from "@/hooks/SettingsContext";
import { showToast, showToastError } from "@/lib/toast";

const DEFAULT_SUBJECT = __("[event_name]: Ticket details", "eventkoi-lite");
const DEFAULT_SENDER_NAME = "";
const DEFAULT_SENDER_EMAIL = "";

const DEFAULT_TEMPLATE = [
  "<p>Hi [attendee_name],</p>",
  "<p>Thanks for your RSVP to [event_name].</p>",
  "<p>Check-in code:<br />[checkin_code]</p>",
  "<p>Schedule ([event_timezone]):<br />[event_datetime]</p>",
  "<p>Location:<br />[event_location]</p>",
  "<p>[guests_line]</p>",
  "<p>View / manage your RSVP:<br />[event_url]</p>",
  "<p>&mdash;<br />[site_name]</p>",
].join("\n");

const TAGS = [
  { tag: "[attendee_name]", description: __("Attendee name", "eventkoi-lite") },
  { tag: "[attendee_email]", description: __("Attendee email", "eventkoi-lite") },
  { tag: "[event_name]", description: __("Event name", "eventkoi-lite") },
  {
    tag: "[event_datetime]",
    description: __("Event schedule in site timezone", "eventkoi-lite"),
  },
  {
    tag: "[event_timezone]",
    description: __("Event timezone label", "eventkoi-lite"),
  },
  { tag: "[event_location]", description: __("Event location", "eventkoi-lite") },
  { tag: "[event_url]", description: __("Event URL", "eventkoi-lite") },
  { tag: "[rsvp_status]", description: __("RSVP status", "eventkoi-lite") },
  { tag: "[guest_count]", description: __("Guest count", "eventkoi-lite") },
  { tag: "[guests_line]", description: __("Guests label line", "eventkoi-lite") },
  { tag: "[checkin_code]", description: __("Check-in code", "eventkoi-lite") },
  {
    tag: "[qr_code]",
    description: __("QR code image", "eventkoi-lite"),
    pro: true,
  },
  { tag: "[site_name]", description: __("Site name", "eventkoi-lite") },
];

export function SettingsEmails() {
  const { settings, refreshSettings } = useSettings();
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [senderName, setSenderName] = useState(DEFAULT_SENDER_NAME);
  const [senderEmail, setSenderEmail] = useState(DEFAULT_SENDER_EMAIL);
  const [activeTemplate, setActiveTemplate] = useState("rsvp_confirmation");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (typeof settings?.rsvp_email_subject === "string") {
      setSubject(settings.rsvp_email_subject || DEFAULT_SUBJECT);
    }
  }, [settings?.rsvp_email_subject]);

  useEffect(() => {
    if (typeof settings?.rsvp_email_template === "string") {
      setTemplate(settings.rsvp_email_template || DEFAULT_TEMPLATE);
    }
  }, [settings?.rsvp_email_template]);

  useEffect(() => {
    if (typeof settings?.rsvp_email_sender_name === "string") {
      setSenderName(settings.rsvp_email_sender_name || DEFAULT_SENDER_NAME);
    }
  }, [settings?.rsvp_email_sender_name]);

  useEffect(() => {
    if (typeof settings?.rsvp_email_sender_email === "string") {
      setSenderEmail(settings.rsvp_email_sender_email || DEFAULT_SENDER_EMAIL);
    }
  }, [settings?.rsvp_email_sender_email]);

  useEffect(() => {
    if (typeof settings?.rsvp_email_enabled === "undefined") {
      setEmailEnabled(true);
      return;
    }
    setEmailEnabled(
      settings.rsvp_email_enabled === true ||
        settings.rsvp_email_enabled === "1" ||
        settings.rsvp_email_enabled === 1,
    );
  }, [settings?.rsvp_email_enabled]);

  const handleSave = async (override = {}) => {
    if (!override || typeof override !== "object" || override?.nativeEvent) {
      override = {};
    }
    try {
      setIsSaving(true);
      const response = await apiRequest({
        path: `${eventkoi_params.api}/settings`,
        method: "post",
        data: {
          rsvp_email_subject: subject,
          rsvp_email_template: template,
          rsvp_email_enabled: emailEnabled ? "1" : "0",
          rsvp_email_sender_name: senderName,
          rsvp_email_sender_email: senderEmail,
          ...override,
        },
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });

      await refreshSettings();
      showToast({
        ...response,
        message: __("Email settings updated.", "eventkoi-lite"),
      });
    } catch (error) {
      showToastError(
        error?.message ?? __("Failed to update email settings.", "eventkoi-lite"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const tagList = useMemo(() => TAGS, []);
  const templateMeta = useMemo(() => {
    const templates = {
      rsvp_confirmation: {
        recipient: __("Attendee", "eventkoi-lite"),
        description: __(
          "Sent to attendees when they RSVP to the event.",
          "eventkoi-lite",
        ),
      },
    };
    return templates[activeTemplate] || templates.rsvp_confirmation;
  }, [activeTemplate]);

  return (
    <div className="grid gap-8">
      <Box>
        <div className="grid w-full">
          <Panel variant="header" className="flex flex-col gap-4">
            <Heading level={3}>{__("Emails", "eventkoi-lite")}</Heading>
            <div className="flex items-end gap-8 py-4">
              <div className="grid w-full max-w-[220px] gap-2">
                <Label htmlFor="eventkoi-email-template">
                  {__("Select email template", "eventkoi-lite")}
                </Label>
                <Select
                  value={activeTemplate}
                  onValueChange={setActiveTemplate}
                >
                  <SelectTrigger id="eventkoi-email-template">
                    <SelectValue
                      placeholder={__("Choose a template", "eventkoi-lite")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rsvp_confirmation">
                      {__("RSVP confirmation email", "eventkoi-lite")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div>
                  <span className="font-medium">
                    {__("Recipient:", "eventkoi-lite")}
                  </span>{" "}
                  {templateMeta.recipient}
                </div>
                <div>
                  <span className="font-medium">
                    {__("Description:", "eventkoi-lite")}
                  </span>{" "}
                  {templateMeta.description}
                </div>
              </div>
            </div>
          </Panel>

          <Separator />

          <Panel>
            <div className="flex w-full flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Switch
                  id="eventkoi-rsvp-email-enabled"
                  checked={emailEnabled}
                  onCheckedChange={(value) => {
                    setEmailEnabled(value);
                    handleSave({ rsvp_email_enabled: value ? "1" : "0" });
                  }}
                />
                <Label
                  htmlFor="eventkoi-rsvp-email-enabled"
                  className={`font-normal ${
                    !emailEnabled ? "text-muted-foreground" : ""
                  }`}
                >
                  {__("Enable RSVP confirmation email", "eventkoi-lite")}
                </Label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="link"
                  onClick={async () => {
                    setSubject(DEFAULT_SUBJECT);
                    setTemplate(DEFAULT_TEMPLATE);
                    setSenderName(DEFAULT_SENDER_NAME);
                    setSenderEmail(DEFAULT_SENDER_EMAIL);
                    try {
                      setIsSaving(true);
                      const response = await apiRequest({
                        path: `${eventkoi_params.api}/settings`,
                        method: "post",
                        data: {
                          rsvp_email_subject: DEFAULT_SUBJECT,
                          rsvp_email_template: DEFAULT_TEMPLATE,
                          rsvp_email_enabled: emailEnabled ? "1" : "0",
                          rsvp_email_sender_name: DEFAULT_SENDER_NAME,
                          rsvp_email_sender_email: DEFAULT_SENDER_EMAIL,
                        },
                        headers: {
                          "EVENTKOI-API-KEY": eventkoi_params.api_key,
                        },
                      });

                      await refreshSettings();
                      showToast({
                        ...response,
                        message: __("Defaults restored.", "eventkoi-lite"),
                      });
                    } catch (error) {
                      showToastError(
                        error?.message ??
                          __("Failed to restore defaults.", "eventkoi-lite"),
                      );
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  className="font-normal"
                >
                  {__("Restore defaults", "eventkoi-lite")}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={isSaving}
                >
                  {isSaving
                    ? __("Saving...", "eventkoi-lite")
                    : __("Save changes", "eventkoi-lite")}
                </Button>
              </div>
            </div>
            <div className="grid w-full max-w-[520px] gap-2 mb-6">
              <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
                <div className="grid flex-1 gap-2">
                  <Label
                    htmlFor="eventkoi-rsvp-email-sender-name"
                    className={!emailEnabled ? "text-muted-foreground" : ""}
                  >
                    {__("Sender name", "eventkoi-lite")}
                  </Label>
                  <Input
                    id="eventkoi-rsvp-email-sender-name"
                    value={senderName}
                    onChange={(event) => setSenderName(event.target.value)}
                    placeholder={__("EventKoi", "eventkoi-lite")}
                    disabled={!emailEnabled || isSaving}
                  />
                </div>
                <div className="grid flex-1 gap-2">
                  <Label
                    htmlFor="eventkoi-rsvp-email-sender-email"
                    className={!emailEnabled ? "text-muted-foreground" : ""}
                  >
                    {__("Sender email address", "eventkoi-lite")}
                  </Label>
                  <Input
                    id="eventkoi-rsvp-email-sender-email"
                    type="email"
                    value={senderEmail}
                    onChange={(event) => setSenderEmail(event.target.value)}
                    placeholder={eventkoi_params?.admin_email || ""}
                    disabled={!emailEnabled || isSaving}
                  />
                </div>
              </div>
            </div>
            <div className="grid w-full max-w-[520px] gap-2 mb-6">
              <Label
                htmlFor="eventkoi-rsvp-email-subject"
                className={!emailEnabled ? "text-muted-foreground" : ""}
              >
                {__("Subject line", "eventkoi-lite")}
              </Label>
              <Input
                id="eventkoi-rsvp-email-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder={DEFAULT_SUBJECT}
                disabled={!emailEnabled || isSaving}
              />
            </div>

            <Label>{__("Email content", "eventkoi-lite")}</Label>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch">
              <div className="grid w-full h-full max-w-[520px] gap-2 self-stretch">
                <RichTextEditor
                  id="eventkoi-rsvp-email-template"
                  value={template}
                  onChange={setTemplate}
                  height={520}
                  disabled={!emailEnabled || isSaving}
                />
              </div>

              <div className="grid flex-1 rounded-lg border border-input p-0">
                <div className="grid gap-1.5 border-b border-input p-4">
                  <Label className="text-base">
                    {__("Available tags", "eventkoi-lite")}
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    {__(
                      "Add these tags to give attendees the event data they need.",
                      "eventkoi-lite",
                    )}
                  </div>
                </div>
                <TooltipProvider delayDuration={120}>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    {tagList.map((item) => (
                      <Tooltip key={item.tag}>
                        <TooltipTrigger asChild>
                          <span className="inline-flex w-fit">
                              <Badge
                                variant="secondary"
                              className={`rounded-none bg-[#E6E6E6] hover:bg-[#e1e1e1] px-1 py-0.5 font-mono font-normal ${
                                item.pro ? "cursor-not-allowed" : "cursor-pointer"
                              }`}
                              data-disabled={!emailEnabled || item.pro}
                              aria-disabled={!emailEnabled || item.pro}
                            >
                              <span className="inline-flex items-center gap-2">
                                <span className={item.pro ? "opacity-60" : ""}>
                                  {item.tag}
                                </span>
                                {item.pro && <ProBadge className="ml-0" />}
                              </span>
                            </Badge>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          sideOffset={8}
                          className="border-transparent bg-foreground text-background px-2 py-1 text-xs"
                        >
                          {item.pro
                            ? `${item.description} (${__("Pro", "eventkoi-lite")})`
                            : item.description}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              </div>
            </div>
          </Panel>
        </div>
      </Box>
    </div>
  );
}
