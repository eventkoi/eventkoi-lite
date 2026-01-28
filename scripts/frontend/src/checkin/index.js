"use client";

import { decodeEntities } from "@wordpress/html-entities";
import { __, sprintf } from "@wordpress/i18n";
import {
  BadgeCheck,
  CheckCheck,
  Clock,
  Copy,
  MapPin,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildTimeline } from "@/lib/date-utils";
import { resolvePublicRestUrl } from "@/lib/public-api";
import { cn } from "@/lib/utils";

function CheckinWidget({ mountEl }) {
  const initialToken = mountEl?.getAttribute("data-token") || "";

  const [token, setToken] = useState(initialToken || "");
  const [loading, setLoading] = useState(Boolean(initialToken));
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editStatus, setEditStatus] = useState("going");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editGuests, setEditGuests] = useState("");
  const [editError, setEditError] = useState(null);
  const [saving, setSaving] = useState(false);

  const statusLabels = {
    going: __("Going", "eventkoi-lite"),
    maybe: __("Maybe", "eventkoi-lite"),
    not_going: __("Not going", "eventkoi-lite"),
    cancelled: __("Cancelled", "eventkoi-lite"),
  };

  const statusOptions = [
    { value: "going", label: __("Going", "eventkoi-lite") },
    { value: "maybe", label: __("Maybe", "eventkoi-lite") },
    { value: "not_going", label: __("Not going", "eventkoi-lite") },
  ];

  const fetchCheckin = async (value) => {
    if (!value) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ eventkoi_rsvp: value });
      const res = await fetch(
        resolvePublicRestUrl(`/rsvp/checkin?${params.toString()}`),
        {
          headers: {
            "X-WP-Nonce": eventkoi_params?.nonce || "",
          },
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "Unable to find RSVP.");
      }
      setData(json);
    } catch (err) {
      setData(null);
      setError(err?.message || "Unable to find RSVP.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      fetchCheckin(initialToken);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) return;
    fetchCheckin(cleanToken);
  };

  const handleCopy = async () => {
    if (!checkinToken) return;
    try {
      await navigator.clipboard.writeText(checkinToken);
      setCopied(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setCopied(false), 1200);
    } catch (_err) {
      setCopied(false);
    }
  };

  const eventTitle = decodeEntities(data?.event?.title || "");
  const timezonePref = eventkoi_params?.auto_detect_timezone
    ? "local"
    : eventkoi_params?.timezone_string?.trim() ||
      eventkoi_params?.timezone ||
      "UTC";
  const localTimezone =
    typeof Intl !== "undefined" && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "";
  const timezoneLabel = eventkoi_params?.auto_detect_timezone
    ? localTimezone || __("Local time", "eventkoi-lite")
    : eventkoi_params?.timezone_string?.trim() ||
      eventkoi_params?.timezone ||
      "UTC";
  const schedule =
    data?.event?.start && data?.event?.date_type
      ? buildTimeline(
          {
            start: data?.event?.start,
            end: data?.event?.end,
            end_real: data?.event?.end_real,
            date_type: data?.event?.date_type,
            timeline: data?.event?.timeline,
            allDay: data?.event?.allDay,
          },
          timezonePref,
          eventkoi_params?.time_format || "12",
        ) || ""
      : data?.event?.datetime_utc || "";
  const location = data?.event?.location || "";
  const status = (data?.rsvp?.status || "").toLowerCase();
  const guests = Number(data?.rsvp?.guests || 0);
  const checkinToken = data?.rsvp?.checkin_token || "";
  const attendeeName = decodeEntities(data?.rsvp?.name || "");
  const avatarUrl = data?.rsvp?.avatar_url || "";
  const instanceTs = Number(data?.rsvp?.instance_ts || 0);
  const eventId = Number(data?.event?.id || 0);
  const allowEdit = data?.allow_edit !== false;
  const rsvpEnabled = data?.rsvp_enabled !== false;
  const allowGuests = data?.allow_guests;
  const maxGuests = data?.max_guests || 0;
  const capacity = data?.capacity || 0;
  const summary = data?.summary || null;

  const used = summary?.used || 0;
  const currentSeatUsage = status === "going" ? 1 + (Number(guests) || 0) : 0;
  const remaining = capacity > 0 ? Math.max(capacity - used, 0) : null;
  const remainingForGuests =
    capacity > 0 ? Math.max(capacity - used + currentSeatUsage - 1, 0) : null;
  const effectiveMaxGuests = maxGuests > 0 ? maxGuests : null;
  const maxGuestsAllowed =
    capacity > 0
      ? effectiveMaxGuests !== null
        ? Math.min(effectiveMaxGuests, remainingForGuests ?? 0)
        : remainingForGuests
      : effectiveMaxGuests;
  const isFull =
    capacity > 0 && remaining === 0 && (!data?.rsvp || status !== "going");
  const avatarFallback = attendeeName
    ? attendeeName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : __("?", "eventkoi-lite");

  useEffect(() => {
    if (!data?.rsvp) return;
    setEditStatus(data?.rsvp?.status || "going");
    setEditName(data?.rsvp?.name || "");
    setEditEmail(data?.rsvp?.email || "");
    setEditGuests(
      typeof data?.rsvp?.guests === "number" ? String(data?.rsvp?.guests) : "",
    );
  }, [data?.rsvp]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!eventId || !instanceTs) {
      setEditError(__("Unable to update RSVP.", "eventkoi-lite"));
      return;
    }

    setSaving(true);
    setEditError(null);

    const guestsValue =
      allowGuests && editStatus === "going"
        ? maxGuestsAllowed === null || typeof maxGuestsAllowed === "undefined"
          ? Number(editGuests) || 0
          : Math.min(Number(editGuests) || 0, maxGuestsAllowed)
        : 0;

    try {
      const res = await fetch(resolvePublicRestUrl("/rsvp"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": eventkoi_params?.nonce || "",
        },
        body: JSON.stringify({
          event_id: eventId,
          instance_ts: instanceTs,
          name: editName,
          email: editEmail,
          status: editStatus,
          guests: guestsValue,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "Unable to update RSVP.");
      }

      setEditOpen(false);
      fetchCheckin(checkinToken);
    } catch (err) {
      setEditError(err?.message || "Unable to update RSVP.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="eventkoi-checkin__widget flex max-w-[450px] flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex w-full flex-col sm:flex-row">
          <Input
            id="eventkoi-checkin-code"
            aria-label={__("Check-in code", "eventkoi-lite")}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={__("Enter your code", "eventkoi-lite")}
            className="sm:rounded-r-none focus-visible:z-10"
          />
          <Button
            type="submit"
            className="relative z-0 font-semibold sm:rounded-l-none sm:border-l-0"
          >
            {__("View RSVP", "eventkoi-lite")}
          </Button>
        </div>
      </form>

      {loading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
        </div>
      )}

      {error && (
        <div className="text-sm font-medium text-destructive">{error}</div>
      )}

      {!loading && data && (
        <div className="rounded-lg border border-border/60 bg-card/60 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <a
              href={data?.event?.url || "#"}
              className="text-lg font-semibold text-foreground no-underline hover:no-underline"
            >
              {eventTitle}
            </a>
            {(status || attendeeName || avatarUrl) && (
              <div className="flex items-center gap-2">
                {attendeeName && (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-[26px] w-[26px]">
                          {avatarUrl ? (
                            <AvatarImage src={avatarUrl} alt={attendeeName} />
                          ) : null}
                          <AvatarFallback className="text-xs font-medium text-foreground">
                            {avatarFallback}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs px-2 py-1">
                        {attendeeName}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {status && (
                  <Badge className="bg-muted text-foreground font-medium text-sm hover:bg-muted">
                    {statusLabels[status] || status}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-5 text-sm text-foreground">
            {schedule && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mt-1">
                  <div>{schedule}</div>
                  {timezoneLabel ? (
                    <div className="text-sm text-muted-foreground">
                      {timezoneLabel}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {location && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mt-1 whitespace-pre-line">{location}</div>
              </div>
            )}

            {guests > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                {sprintf(
                  /* translators: %d: guest count */
                  __("Guests: %d", "eventkoi-lite"),
                  guests,
                )}
              </div>
            )}

            {checkinToken && (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-muted text-foreground font-semibold text-sm hover:bg-muted">
                    {checkinToken}
                  </Badge>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          onClick={handleCopy}
                          aria-label={__("Copy check-in code", "eventkoi-lite")}
                        >
                          {copied ? (
                            <CheckCheck className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="text-xs px-2 py-1"
                      >
                        {__("Copy", "eventkoi-lite")}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}

            {allowEdit && rsvpEnabled && (
              <div className="pt-1">
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      className="h-9 text-sm font-semibold rounded-full"
                      onClick={() => setEditOpen(true)}
                      disabled={saving || isFull}
                      variant={saving || isFull ? "secondary" : "outline"}
                    >
                      {__("Edit RSVP", "eventkoi-lite")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="eventkoi-front">
                    <DialogHeader className="space-y-1">
                      <DialogTitle>
                        {eventTitle
                          ? sprintf(
                              /* translators: %s: event title */
                              __("RSVP for %s", "eventkoi-lite"),
                              eventTitle,
                            )
                          : __("RSVP", "eventkoi-lite")}
                      </DialogTitle>
                      <DialogDescription>
                        {__("Let us know you're coming.", "eventkoi-lite")}
                      </DialogDescription>
                    </DialogHeader>

                    <form className="grid gap-4" onSubmit={handleEditSubmit}>
                      {editError && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {editError}
                        </div>
                      )}

                      <div className="grid gap-2">
                        <Label htmlFor="eventkoi-checkin-name">
                          {__("Name", "eventkoi-lite")}
                        </Label>
                        <Input
                          id="eventkoi-checkin-name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="eventkoi-checkin-email">
                          {__("Email", "eventkoi-lite")}
                        </Label>
                        <Input
                          id="eventkoi-checkin-email"
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>{__("Status", "eventkoi-lite")}</Label>
                        <RadioGroup
                          value={editStatus}
                          onValueChange={setEditStatus}
                          className="flex flex-wrap gap-4"
                        >
                          {statusOptions.map((option) => (
                            <Label
                              key={option.value}
                              className={cn(
                                "flex items-center gap-2 text-sm font-normal cursor-pointer",
                              )}
                            >
                              <RadioGroupItem value={option.value} />
                              {option.label}
                            </Label>
                          ))}
                        </RadioGroup>
                      </div>

                      {allowGuests && editStatus === "going" && (
                        <div className="grid gap-2">
                          <Label htmlFor="eventkoi-checkin-guests">
                            {__("Guests", "eventkoi-lite")}
                          </Label>
                          <Input
                            id="eventkoi-checkin-guests"
                            type="number"
                            min="0"
                            max={
                              typeof maxGuestsAllowed === "number"
                                ? maxGuestsAllowed
                                : undefined
                            }
                            value={editGuests}
                            placeholder={
                              typeof maxGuestsAllowed === "number"
                                ? sprintf(
                                    /* translators: %d: maximum guests */
                                    __("Max %d", "eventkoi-lite"),
                                    maxGuestsAllowed,
                                  )
                                : undefined
                            }
                            onChange={(e) => {
                              const rawValue = e.target.value;
                              if (rawValue === "") {
                                setEditGuests("");
                                return;
                              }
                              const nextValue = Math.max(
                                0,
                                Number(rawValue) || 0,
                              );
                              const clamped =
                                typeof maxGuestsAllowed === "number"
                                  ? Math.min(nextValue, maxGuestsAllowed)
                                  : nextValue;
                              setEditGuests(clamped);
                            }}
                          />
                          {typeof maxGuestsAllowed === "number" && (
                            <div className="text-xs text-muted-foreground">
                              {sprintf(
                                /* translators: %d: maximum guests */
                                maxGuestsAllowed === 1
                                  ? __("Max %d guest", "eventkoi-lite")
                                  : __("Max %d guests", "eventkoi-lite"),
                                maxGuestsAllowed,
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Button type="submit" disabled={saving}>
                          {saving
                            ? __("Submitting...", "eventkoi-lite")
                            : __("Submit RSVP", "eventkoi-lite")}
                        </Button>
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setEditOpen(false)}
                        >
                          {__("Cancel", "eventkoi-lite")}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QrCheckinOverlay({ payload }) {
  const [currentPayload, setCurrentPayload] = useState(payload || {});
  const [count, setCount] = useState(
    payload?.count !== undefined && payload?.count !== null
      ? String(payload.count)
      : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [updated, setUpdated] = useState(Boolean(payload?.count_updated));

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const maxValue =
    currentPayload?.max !== undefined && currentPayload?.max !== null
      ? currentPayload.max
      : 0;
  const showForm = currentPayload?.show_form === true;
  const showUpdated = updated;

  const isSuccess = Number(payload?.status || 0) < 400;
  const IconComponent = isSuccess ? BadgeCheck : XCircle;
  const iconClassName = isSuccess ? "text-primary" : "text-destructive";
  const statusCode = Number(currentPayload?.status || payload?.status || 0);
  const descriptionText = isSuccess
    ? __("Review the attendance count before closing this screen.", "eventkoi-lite")
    : statusCode === 403 && currentPayload?.message
      ? currentPayload.message
      : statusCode === 403
        ? __("Check-in is restricted to staff.", "eventkoi-lite")
        : __("Please check the code and try again.", "eventkoi-lite");

  const handleCountSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setUpdated(false);

    try {
      const formData = new FormData();
      formData.set("eventkoi_checkin_count", count);
      const response = await fetch(window.location.href, {
        method: "POST",
        headers: {
          "X-EventKoi-QR": "1",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: formData,
      });
      const json = await response.json();
      if (response.ok && json) {
        setCurrentPayload(json);
        if (json.count !== undefined && json.count !== null) {
          setCount(String(json.count));
        }
        setUpdated(Boolean(json.count_updated));
      }
    } catch (_err) {
      // keep silent for now
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={() => {}}>
      <AlertDialogContent className="eventkoi-front h-screen w-screen max-w-none !rounded-none sm:rounded-none p-6 z-[100000] grid place-items-center bg-background/90 backdrop-blur-sm">
        <div className="eventkoi-front w-full max-w-md rounded-2xl border border-border/60 bg-card/95 p-6 shadow-2xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/70 ring-1 ring-border/60">
              <IconComponent className={`h-7 w-7 ${iconClassName}`} />
            </div>
            <div className="space-y-1">
              <AlertDialogTitle className="text-xl font-semibold text-foreground">
                {currentPayload?.message || __("Check-in complete.", "eventkoi-lite")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                {descriptionText}
              </AlertDialogDescription>
            </div>

            {showForm && (
              <form
                method="post"
                className="mt-2 flex w-full flex-col gap-3"
                onSubmit={handleCountSubmit}
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{__("Checked-in count", "eventkoi-lite")}</span>
                  {maxValue > 0 && (
                    <span>
                      {sprintf(
                        /* translators: %d: maximum count */
                        __("Max %d", "eventkoi-lite"),
                        maxValue,
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={maxValue > 0 ? maxValue : undefined}
                    name="eventkoi_checkin_count"
                    value={count}
                    onChange={(event) => setCount(event.target.value)}
                    className="h-10 w-24 text-center tabular-nums"
                    aria-label={__("Checked-in count", "eventkoi-lite")}
                  />
                  <Button
                    type="submit"
                    className="h-10 flex-1"
                    disabled={submitting || Number(count) === 0}
                  >
                    {submitting
                      ? __("Updating...", "eventkoi-lite")
                      : __("Update count", "eventkoi-lite")}
                  </Button>
                </div>
              </form>
            )}

            {showUpdated && (
              <div className="text-xs text-muted-foreground">
                {__("Count updated.", "eventkoi-lite")}
              </div>
            )}
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

document.querySelectorAll(".eventkoi-checkin").forEach((el) => {
  const root = createRoot(el);
  root.render(<CheckinWidget mountEl={el} />);
});

const qrOverlayEl = document.getElementById("eventkoi-qr-checkin");
if (qrOverlayEl) {
  let payload = {};
  try {
    payload = JSON.parse(qrOverlayEl.getAttribute("data-payload") || "{}");
  } catch (_err) {
    payload = {};
  }
  const root = createRoot(qrOverlayEl);
  root.render(<QrCheckinOverlay payload={payload} />);
}
