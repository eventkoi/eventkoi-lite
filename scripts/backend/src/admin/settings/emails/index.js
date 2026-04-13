import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";
import { useEffect, useMemo, useRef, useState } from "react";

import { Box } from "@/components/box";
import { ProLaunch } from "@/components/dashboard/pro-launch";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
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

const DEFAULT_SENDER_NAME = "";
const DEFAULT_SENDER_EMAIL = "";

const TEMPLATE_CONFIG = {
  rsvp_confirmation: {
    label: __("RSVP confirmation email", "eventkoi-lite"),
    group: "user",
    prefix: "rsvp",
    enabledLabel: __("Enable RSVP confirmation email", "eventkoi-lite"),
    recipient: __("Attendee", "eventkoi-lite"),
    description: __("Sent to attendees when they RSVP to the event.", "eventkoi-lite"),
    defaults: {
      subject: __("Your RSVP for [event_name]", "eventkoi-lite"),
      template: [
        "<p>Hi [attendee_name],</p>",
        "<p>Thanks for your RSVP to [event_name].</p>",
        "<p>Check-in code:<br />[checkin_code]</p>",
        "<p>[qr_code]</p>",
        "<p>Schedule ([event_timezone]):<br />[event_datetime]</p>",
        "<p>Location:<br />[event_location]</p>",
        "<p>[guests_line]</p>",
        "<p>View / manage your RSVP:<br />[event_url]</p>",
        "<p>&mdash;<br />[site_name]</p>",
      ].join("\n"),
    },
    tags: [
      { tag: "[attendee_name]", description: __("Attendee name", "eventkoi-lite") },
      { tag: "[attendee_email]", description: __("Attendee email", "eventkoi-lite") },
      { tag: "[event_name]", description: __("Event name", "eventkoi-lite") },
      { tag: "[event_datetime]", description: __("Event schedule in site timezone", "eventkoi-lite") },
      { tag: "[event_timezone]", description: __("Event timezone label", "eventkoi-lite") },
      { tag: "[event_location]", description: __("Event location", "eventkoi-lite") },
      { tag: "[event_url]", description: __("Event URL", "eventkoi-lite") },
      { tag: "[rsvp_status]", description: __("RSVP status", "eventkoi-lite") },
      { tag: "[guest_count]", description: __("Guest count", "eventkoi-lite") },
      { tag: "[guests_line]", description: __("Guests label line", "eventkoi-lite") },
      { tag: "[checkin_code]", description: __("Check-in code", "eventkoi-lite") },
      { tag: "[qr_code]", description: __("QR code image", "eventkoi-lite") },
      { tag: "[site_name]", description: __("Site name", "eventkoi-lite") },
    ],
  },
  ticket_confirmation: {
    label: __("Ticket confirmation email", "eventkoi-lite"),
    group: "user",
    prefix: "ticket",
    enabledLabel: __("Enable ticket confirmation email", "eventkoi-lite"),
    recipient: __("Ticket customer", "eventkoi-lite"),
    description: __(
      "Sent after a completed ticket purchase and when manually resent.",
      "eventkoi-lite",
    ),
    defaults: {
      subject: __("[event_name]: Ticket details", "eventkoi-lite"),
      template: [
        "<p>Hi [attendee_name],</p>",
        "<p>Thanks for your ticket purchase for [event_name].</p>",
        "<p>Order ID:<br />[order_id]</p>",
        "[checkin_line]",
        "<p>[qr_code]</p>",
        "<p><strong>Tickets</strong><br />[ticket_lines]</p>",
        "<p><strong>Ticket Codes</strong><br />[ticket_codes]</p>",
        "<p>Schedule ([event_timezone]):<br />[event_datetime]</p>",
        "<p>Location:<br />[event_location]</p>",
        "<p>Event page:<br />[event_url]</p>",
        "<p>&mdash;<br />[site_name]</p>",
      ].join("\n"),
    },
    tags: [
      { tag: "[attendee_name]", description: __("Customer first name", "eventkoi-lite") },
      { tag: "[attendee_email]", description: __("Customer email", "eventkoi-lite") },
      { tag: "[customer_name]", description: __("Customer full name", "eventkoi-lite") },
      { tag: "[order_id]", description: __("Order ID", "eventkoi-lite") },
      { tag: "[order_status]", description: __("Order status", "eventkoi-lite") },
      { tag: "[event_name]", description: __("Event title", "eventkoi-lite") },
      { tag: "[event_datetime]", description: __("Event schedule in site timezone", "eventkoi-lite") },
      { tag: "[event_timezone]", description: __("Event timezone label", "eventkoi-lite") },
      { tag: "[event_location]", description: __("Event location", "eventkoi-lite") },
      { tag: "[event_url]", description: __("Event URL", "eventkoi-lite") },
      { tag: "[checkin_code]", description: __("Master check-in code", "eventkoi-lite") },
      { tag: "[checkin_line]", description: __("Preformatted check-in line", "eventkoi-lite") },
      { tag: "[qr_code]", description: __("QR code image for check-in", "eventkoi-lite") },
      { tag: "[ticket_lines]", description: __("Purchased ticket lines", "eventkoi-lite") },
      { tag: "[ticket_codes]", description: __("Individual ticket codes", "eventkoi-lite") },
      { tag: "[site_name]", description: __("Site name", "eventkoi-lite") },
    ],
  },
  refund_confirmation: {
    label: __("Refund confirmation email", "eventkoi-lite"),
    group: "user",
    prefix: "refund",
    enabledLabel: __("Enable refund confirmation email", "eventkoi-lite"),
    recipient: __("Ticket customer", "eventkoi-lite"),
    description: __("Sent when a refund is issued for a ticket order.", "eventkoi-lite"),
    defaults: {
      subject: __("Refund issued for [event_name]", "eventkoi-lite"),
      template: [
        "<p>Hi [attendee_name],</p>",
        "<p>A refund has been issued for your order.</p>",
        "<p>Order ID:<br />[order_id]</p>",
        "<p>Event:<br />[event_name]</p>",
        "<p>Date:<br />[event_datetime]</p>",
        "<p>Event page:<br />[event_url]</p>",
        "<p>Refunded items:<br />[refund_items]</p>",
        "<p>Refund amount:<br />[refund_amount]</p>",
        "<p>The refund should appear in your account within 5&ndash;10 business days, depending on your payment provider.</p>",
        "<p>&mdash;<br />[site_name]</p>",
      ].join("\n"),
    },
    tags: [
      { tag: "[attendee_name]", description: __("Customer first name", "eventkoi-lite") },
      { tag: "[attendee_email]", description: __("Customer email", "eventkoi-lite") },
      { tag: "[customer_name]", description: __("Customer full name", "eventkoi-lite") },
      { tag: "[order_id]", description: __("Order ID", "eventkoi-lite") },
      { tag: "[event_name]", description: __("Event title", "eventkoi-lite") },
      { tag: "[event_datetime]", description: __("Event schedule in site timezone", "eventkoi-lite") },
      { tag: "[event_timezone]", description: __("Event timezone label", "eventkoi-lite") },
      { tag: "[event_url]", description: __("Event URL", "eventkoi-lite") },
      { tag: "[refund_amount]", description: __("Formatted refund amount", "eventkoi-lite") },
      { tag: "[refund_items]", description: __("List of refunded items", "eventkoi-lite") },
      { tag: "[site_name]", description: __("Site name", "eventkoi-lite") },
    ],
  },
  admin_rsvp_notification: {
    label: __("New RSVP notification", "eventkoi-lite"),
    group: "admin",
    prefix: "admin_rsvp",
    enabledLabel: __("Enable new RSVP notification", "eventkoi-lite"),
    recipient: __("Site admin", "eventkoi-lite"),
    description: __("Sent to the site admin when someone RSVPs to an event.", "eventkoi-lite"),
    defaults: {
      subject: __("New RSVP: [event_name]", "eventkoi-lite"),
      template: [
        "<p>A new RSVP has been submitted.</p>",
        "<p><strong>Attendee:</strong> [attendee_name] ([attendee_email])</p>",
        "<p>[guests_line]</p>",
        "<p><strong>Event:</strong> [event_name]</p>",
        "<p><strong>Date:</strong> [event_datetime]</p>",
        "<p>&mdash;<br />[site_name]</p>",
      ].join("\n"),
    },
    tags: [
      { tag: "[attendee_name]", description: __("Attendee name", "eventkoi-lite") },
      { tag: "[attendee_email]", description: __("Attendee email", "eventkoi-lite") },
      { tag: "[event_name]", description: __("Event name", "eventkoi-lite") },
      { tag: "[event_datetime]", description: __("Event date and time", "eventkoi-lite") },
      { tag: "[guests_line]", description: __("Guests label line", "eventkoi-lite") },
      { tag: "[site_name]", description: __("Site name", "eventkoi-lite") },
    ],
  },
  admin_sale_notification: {
    label: __("New ticket sale notification", "eventkoi-lite"),
    group: "admin",
    prefix: "admin_sale",
    enabledLabel: __("Enable new ticket sale notification", "eventkoi-lite"),
    recipient: __("Site admin", "eventkoi-lite"),
    description: __("Sent to the site admin when a ticket order is completed.", "eventkoi-lite"),
    defaults: {
      subject: __("New ticket sale: [event_name]", "eventkoi-lite"),
      template: [
        "<p>A new ticket order has been placed.</p>",
        "<p><strong>Customer:</strong> [customer_name] ([attendee_email])</p>",
        "<p><strong>Order:</strong> #[order_id]</p>",
        "<p><strong>Tickets:</strong><br />[ticket_lines]</p>",
        "<p><strong>Total:</strong> [order_total]</p>",
        "<p><strong>Event:</strong> [event_name]</p>",
        "<p><strong>Date:</strong> [event_datetime]</p>",
        "<p>&mdash;<br />[site_name]</p>",
      ].join("\n"),
    },
    tags: [
      { tag: "[customer_name]", description: __("Customer full name", "eventkoi-lite") },
      { tag: "[attendee_email]", description: __("Customer email", "eventkoi-lite") },
      { tag: "[order_id]", description: __("Order ID", "eventkoi-lite") },
      { tag: "[ticket_lines]", description: __("Purchased ticket lines", "eventkoi-lite") },
      { tag: "[order_total]", description: __("Formatted order total", "eventkoi-lite") },
      { tag: "[event_name]", description: __("Event name", "eventkoi-lite") },
      { tag: "[event_datetime]", description: __("Event date and time", "eventkoi-lite") },
      { tag: "[site_name]", description: __("Site name", "eventkoi-lite") },
    ],
  },
};

const getKeys = (prefix) => ({
  subject: `${prefix}_email_subject`,
  template: `${prefix}_email_template`,
  enabled: `${prefix}_email_enabled`,
  senderName: `${prefix}_email_sender_name`,
  senderEmail: `${prefix}_email_sender_email`,
});

const isRichTextEmpty = (value) => {
  const raw = String(value || "");
  const stripped = raw
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<\/?p[^>]*>/gi, "")
    .replace(/&nbsp;/gi, "")
    .trim();
  return stripped === "";
};

const isEnabledSetting = (value) => {
  if (typeof value === "undefined" || value === null || value === "") {
    return true;
  }

  return value === true || value === "1" || value === 1;
};

export function SettingsEmails() {
  const { settings, setSettings, refreshSettings } = useSettings();
  const [activeTemplate, setActiveTemplate] = useState("rsvp_confirmation");
  const [subject, setSubject] = useState("");
  const [template, setTemplate] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [senderName, setSenderName] = useState(DEFAULT_SENDER_NAME);
  const [senderEmail, setSenderEmail] = useState(DEFAULT_SENDER_EMAIL);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedTag, setCopiedTag] = useState(null);
  const copyTimerRef = useRef(null);

  const activeConfig = useMemo(
    () => TEMPLATE_CONFIG[activeTemplate] || TEMPLATE_CONFIG.rsvp_confirmation,
    [activeTemplate],
  );
  const keys = useMemo(() => getKeys(activeConfig.prefix), [activeConfig.prefix]);

  useEffect(() => {
    const defaults = activeConfig.defaults || {};
    const subjectValue =
      typeof settings?.[keys.subject] === "string" ? settings[keys.subject] : "";
    const templateValue =
      typeof settings?.[keys.template] === "string" ? settings[keys.template] : "";
    const senderNameValue =
      typeof settings?.[keys.senderName] === "string" ? settings[keys.senderName] : "";
    const senderEmailValue =
      typeof settings?.[keys.senderEmail] === "string" ? settings[keys.senderEmail] : "";

    setSubject(
      String(subjectValue || "").trim() ? subjectValue : (defaults.subject || ""),
    );
    setTemplate(
      String(templateValue || "").trim() && !isRichTextEmpty(templateValue)
        ? templateValue
        : (defaults.template || ""),
    );
    setSenderName(
      String(senderNameValue || "").trim() ? senderNameValue : DEFAULT_SENDER_NAME,
    );
    setSenderEmail(
      String(senderEmailValue || "").trim() ? senderEmailValue : DEFAULT_SENDER_EMAIL,
    );
    setEmailEnabled(isEnabledSetting(settings?.[keys.enabled]));
  }, [activeConfig.defaults, keys, settings]);

  const hydrateTemplateState = (templateKey) => {
    const cfg = TEMPLATE_CONFIG[templateKey] || TEMPLATE_CONFIG.rsvp_confirmation;
    const cfgKeys = getKeys(cfg.prefix);
    const defaults = cfg.defaults || {};
    const subjectValue =
      typeof settings?.[cfgKeys.subject] === "string" ? settings[cfgKeys.subject] : "";
    const templateValue =
      typeof settings?.[cfgKeys.template] === "string" ? settings[cfgKeys.template] : "";
    const senderNameValue =
      typeof settings?.[cfgKeys.senderName] === "string" ? settings[cfgKeys.senderName] : "";
    const senderEmailValue =
      typeof settings?.[cfgKeys.senderEmail] === "string" ? settings[cfgKeys.senderEmail] : "";

    setSubject(
      String(subjectValue || "").trim() ? subjectValue : (defaults.subject || ""),
    );
    setTemplate(
      String(templateValue || "").trim() && !isRichTextEmpty(templateValue)
        ? templateValue
        : (defaults.template || ""),
    );
    setSenderName(
      String(senderNameValue || "").trim() ? senderNameValue : DEFAULT_SENDER_NAME,
    );
    setSenderEmail(
      String(senderEmailValue || "").trim() ? senderEmailValue : DEFAULT_SENDER_EMAIL,
    );
    setEmailEnabled(isEnabledSetting(settings?.[cfgKeys.enabled]));
  };

  const handleTemplateChange = (nextTemplate) => {
    hydrateTemplateState(nextTemplate);
    setActiveTemplate(nextTemplate);
  };

  const handleSave = async (override = {}) => {
    if (!override || typeof override !== "object" || override?.nativeEvent) {
      override = {};
    }

    try {
      setIsSaving(true);
      const data = {
          [keys.subject]: subject,
          [keys.template]: template,
          [keys.enabled]: emailEnabled ? "1" : "0",
          [keys.senderName]: senderName,
          [keys.senderEmail]: senderEmail,
          ...override,
        };
      const response = await apiRequest({
        path: `${eventkoi_params.api}/settings`,
        method: "post",
        data,
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });

      if (response?.settings) {
        setSettings(response.settings);
      } else {
        await refreshSettings();
      }
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

  const restoreDefaults = async () => {
    const defaults = activeConfig.defaults || {};
    setSubject(defaults.subject);
    setTemplate(defaults.template);
    setSenderName(DEFAULT_SENDER_NAME);
    setSenderEmail(DEFAULT_SENDER_EMAIL);

    try {
      setIsSaving(true);
      const response = await apiRequest({
        path: `${eventkoi_params.api}/settings`,
        method: "post",
        data: {
          [keys.subject]: defaults.subject,
          [keys.template]: defaults.template,
          [keys.enabled]: emailEnabled ? "1" : "0",
          [keys.senderName]: DEFAULT_SENDER_NAME,
          [keys.senderEmail]: DEFAULT_SENDER_EMAIL,
        },
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });

      if (response?.settings) {
        setSettings(response.settings);
      } else {
        await refreshSettings();
      }
      showToast({
        ...response,
        message: __("Defaults restored.", "eventkoi-lite"),
      });
    } catch (error) {
      showToastError(
        error?.message ?? __("Failed to restore defaults.", "eventkoi-lite"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const templateToggleId = `eventkoi-${activeConfig.prefix}-email-enabled`;
  const templateSubjectId = `eventkoi-${activeConfig.prefix}-email-subject`;
  const templateSenderNameId = `eventkoi-${activeConfig.prefix}-email-sender-name`;
  const templateSenderEmailId = `eventkoi-${activeConfig.prefix}-email-sender-email`;
  const templateEditorId = `eventkoi-${activeConfig.prefix}-email-template`;

  return (
    <div className="grid gap-8">
      <Box>
        <div className="grid w-full">
          <Panel variant="header" className="flex flex-col gap-4">
            <Heading level={3}>{__("Emails", "eventkoi-lite")}</Heading>
            <div className="flex items-end gap-8 py-4">
              <div className="grid w-full max-w-[260px] gap-2">
                <Label htmlFor="eventkoi-email-template">
                  {__("Select email template", "eventkoi-lite")}
                </Label>
                <Select value={activeTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger id="eventkoi-email-template">
                    <SelectValue
                      placeholder={__("Choose a template", "eventkoi-lite")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>{__("User emails", "eventkoi-lite")}</SelectLabel>
                      {Object.entries(TEMPLATE_CONFIG)
                        .filter(([, cfg]) => cfg.group === "user")
                        .map(([value, cfg]) => (
                          <SelectItem key={value} value={value}>
                            {cfg.label}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>{__("Admin notifications", "eventkoi-lite")}</SelectLabel>
                      {Object.entries(TEMPLATE_CONFIG)
                        .filter(([, cfg]) => cfg.group === "admin")
                        .map(([value, cfg]) => (
                          <SelectItem key={value} value={value}>
                            {cfg.label}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div>
                  <span className="font-medium">{__("Recipient:", "eventkoi-lite")}</span>{" "}
                  {activeConfig.recipient}
                </div>
                <div>
                  <span className="font-medium">{__("Description:", "eventkoi-lite")}</span>{" "}
                  {activeConfig.description}
                </div>
              </div>
            </div>
          </Panel>

          <Separator />

          <Panel>
            <div className="flex w-full flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Switch
                  id={templateToggleId}
                  checked={emailEnabled}
                  onCheckedChange={(value) => {
                    setEmailEnabled(value);
                    handleSave({ [keys.enabled]: value ? "1" : "0" });
                  }}
                />
                <Label
                  htmlFor={templateToggleId}
                  className={`font-normal ${!emailEnabled ? "text-muted-foreground" : ""}`}
                >
                  {activeConfig.enabledLabel}
                </Label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="link"
                  onClick={restoreDefaults}
                  disabled={isSaving}
                  className="font-normal"
                >
                  {__("Restore defaults", "eventkoi-lite")}
                </Button>
                <Button type="button" onClick={() => handleSave()} disabled={isSaving}>
                  {isSaving ? __("Saving...", "eventkoi-lite") : __("Save changes", "eventkoi-lite")}
                </Button>
              </div>
            </div>

            <div className="grid w-full max-w-[520px] gap-2 mb-6">
                  <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
                    <div className="grid flex-1 gap-2">
                      <Label
                        htmlFor={templateSenderNameId}
                        className={!emailEnabled ? "text-muted-foreground" : ""}
                      >
                        {__("Sender name", "eventkoi-lite")}
                      </Label>
                      <Input
                        id={templateSenderNameId}
                        value={senderName}
                        onChange={(event) => setSenderName(event.target.value)}
                        placeholder={__("EventKoi", "eventkoi-lite")}
                        disabled={!emailEnabled || isSaving}
                      />
                    </div>
                    <div className="grid flex-1 gap-2">
                      <Label
                        htmlFor={templateSenderEmailId}
                        className={!emailEnabled ? "text-muted-foreground" : ""}
                      >
                        {__("Sender email address", "eventkoi-lite")}
                      </Label>
                      <Input
                        id={templateSenderEmailId}
                        type="email"
                        value={senderEmail}
                        onChange={(event) => setSenderEmail(event.target.value)}
                        placeholder={eventkoi_params?.admin_email || ""}
                        disabled={!emailEnabled || isSaving}
                      />
                    </div>
                  </div>
                </div>

                <ProLaunch
                  headline={__("Upgrade to customize email templates", "eventkoi-lite")}
                  minimal
                  className="mb-6"
                />

                <div className="grid w-full max-w-[520px] gap-2 mb-6">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={templateSubjectId} className="text-muted-foreground">
                      {__("Subject line", "eventkoi-lite")}
                    </Label>
                    <ProBadge className="text-[11px] py-0 h-4" />
                  </div>
                  <Input
                    id={templateSubjectId}
                    value={subject}
                    placeholder={activeConfig.defaults.subject}
                    disabled
                    className="opacity-60"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label>{__("Email content", "eventkoi-lite")}</Label>
                  <ProBadge className="text-[11px] py-0 h-4" />
                </div>
                <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch">
                  <div className="grid w-full h-full max-w-[520px] gap-2 self-stretch opacity-60 pointer-events-none">
                    <RichTextEditor
                      key={`email-editor-${activeTemplate}`}
                      id={templateEditorId}
                      value={template}
                      onChange={() => {}}
                      height={520}
                      disabled
                    />
                  </div>

                  <div className="flex flex-1 flex-col rounded-lg border border-input p-0">
                    <div className="flex flex-col gap-1 border-b border-input p-4">
                      <Label className="text-base leading-tight">
                        {__("Available tags", "eventkoi-lite")}
                      </Label>
                      <div className="text-xs text-muted-foreground leading-tight -mt-1">
                        {__(
                          "Tags used in the default email template.",
                          "eventkoi-lite",
                        )}
                      </div>
                    </div>
                    <TooltipProvider delayDuration={120}>
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        {activeConfig.tags.map((item) => (
                          <Tooltip key={item.tag} open={copiedTag === item.tag || undefined}>
                            <TooltipTrigger asChild>
                              <span className="inline-flex w-fit">
                                <Badge
                                  variant="secondary"
                                  className="rounded-none bg-[#E6E6E6] px-1 py-0.5 font-mono font-normal cursor-default"
                                >
                                  {item.tag}
                                </Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              sideOffset={8}
                              className="border-transparent bg-foreground text-background px-2 py-1 text-xs"
                            >
                              {item.description}
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
